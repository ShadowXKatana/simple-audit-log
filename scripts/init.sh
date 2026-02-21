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

# 1. Wait for services to be ready
echo "[1/7] Waiting for services to become healthy..."
sleep 10 # Basic wait, assumes docker-compose healthecks have run

# 2. Create Kafka Topics
echo "[2/7] Creating Kafka topics..."
docker exec al-kafka kafka-topics --bootstrap-server $KAFKA_BROKER --create --if-not-exists --topic audit-log --partitions 3 --replication-factor 1
docker exec al-kafka kafka-topics --bootstrap-server $KAFKA_BROKER --create --if-not-exists --topic audit-log-dlq --partitions 1 --replication-factor 1
docker exec al-kafka kafka-topics --bootstrap-server $KAFKA_BROKER --create --if-not-exists --topic audit-log-s3-dlq --partitions 1 --replication-factor 1

# 3. Register Avro Schema
echo "[3/7] Registering Avro schema..."
# Assuming schema file exists or we create a dummy one for now, as it's not present yet
# curl -X POST -H "Content-Type: application/vnd.schemaregistry.v1+json" --data "@infra/schema-registry/audit-log-value.json" $SCHEMA_REGISTRY_URL/subjects/audit-log-value/versions
echo "Schema registration skipped (needs schema file at infra/schema-registry/audit-log-value.json)"

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
