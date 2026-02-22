#!/bin/bash

# Configuration
KAFKA_BROKER="localhost:9092"
SCHEMA_REGISTRY_URL="http://localhost:8081"
CONNECT_URL="http://localhost:8083"
MINIO_URL="http://localhost:9000"
MINIO_USER="minioadmin"
MINIO_PASS="minioadmin"
BUCKET_NAME="audit-log-archive"

echo "========================================"
echo "🚀 Initializing Audit Log Infrastructure "
echo "========================================"

# Helper: poll a URL until it responds 200, then continue
wait_for() {
    local url=$1
    local name=$2
    echo -n "   Waiting for $name"
    until curl -sf "$url" > /dev/null 2>&1; do
        echo -n "."
        sleep 3
    done
    echo " ✓"
}

# 1. Wait for services to be ready
echo "[1/7] Waiting for services to become healthy..."
echo -n "   Waiting for Kafka"
until docker exec al-kafka kafka-topics --bootstrap-server $KAFKA_BROKER --list > /dev/null 2>&1; do
    echo -n "."
    sleep 3
done
echo " ✓"
wait_for "$SCHEMA_REGISTRY_URL/subjects" "Schema Registry"
wait_for "$CONNECT_URL/connectors" "Kafka Connect"

# 2. Create Kafka Topics
echo "[2/7] Creating Kafka topics..."
docker exec al-kafka kafka-topics --bootstrap-server $KAFKA_BROKER --create --if-not-exists --topic audit-log --partitions 3 --replication-factor 1
docker exec al-kafka kafka-topics --bootstrap-server $KAFKA_BROKER --create --if-not-exists --topic audit-log-dlq --partitions 1 --replication-factor 1
docker exec al-kafka kafka-topics --bootstrap-server $KAFKA_BROKER --create --if-not-exists --topic audit-log-s3-dlq --partitions 1 --replication-factor 1

# 3. Register Avro Schema
echo "[3/7] Registering Avro schema..."
SCHEMA_FILE="infra/schema-registry/audit-log-value.json"
if [ -f "$SCHEMA_FILE" ]; then
    RESULT=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST \
        -H "Content-Type: application/vnd.schemaregistry.v1+json" \
        --data @"$SCHEMA_FILE" \
        "$SCHEMA_REGISTRY_URL/subjects/audit-log-value/versions")
    if [ "$RESULT" = "200" ] || [ "$RESULT" = "409" ]; then
        echo "   Schema registered (HTTP $RESULT)"
    else
        echo "   ⚠️  Schema registration returned HTTP $RESULT — check Schema Registry logs"
    fi
else
    echo "   ⚠️  Schema file not found at $SCHEMA_FILE"
fi

# 4. Deploy ES Sink Connector
echo "[4/7] Deploying Elasticsearch Sink Connector..."
# Assuming config file exists. For now, doing a basic check
if [ -f "consumer/connectors/es-sink.json" ]; then
    curl -X POST -H "Content-Type: application/json" --data "@consumer/connectors/es-sink.json" $CONNECT_URL/connectors
else
    echo "Warning: consumer/connectors/es-sink.json not found."
fi

# 5. Deploy S3 Sink Connector
echo "[5/7] Deploying S3 (MinIO) Sink Connector..."
if [ -f "consumer/connectors/s3-sink.json" ]; then
    curl -X POST -H "Content-Type: application/json" --data "@consumer/connectors/s3-sink.json" $CONNECT_URL/connectors
else
    echo "Warning: consumer/connectors/s3-sink.json not found."
fi

# 6. MinIO Bucket
echo "[6/7] MinIO bucket is automatically created by minio-init container."

# 7. Summary
echo "========================================"
echo "✅ Initialization Complete"
echo "========================================"
echo "Services available at:"
echo "- UI: http://localhost:3001"
echo "- Producer API: http://localhost:8080"
echo "- Kafka Connect: http://localhost:8083"
echo "- Elasticsearch: http://localhost:9200"
echo "- MinIO Console: http://localhost:9001 (minioadmin/minioadmin)"
echo "- Prometheus: http://localhost:9090"
echo "- Grafana: http://localhost:3000"
echo "========================================"
