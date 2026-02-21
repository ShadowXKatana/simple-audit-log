# Technical Design Document
# Centralized Audit Logging — Local Dev Stack

**Based on:** LOCAL_DEV_REQUIREMENTS.md + RFC_full.md
**Author:** Jiratip Hemwutthipan
**Date:** 2026-02-19
**Status:** Draft

---

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Docker Compose (audit-net)                   │
│                                                                     │
│  ┌──────────────────┐   HTTP :8080    ┌────────────────────────┐   │
│  │  Next.js :3001   │ ─────────────►  │   Go Producer API      │   │
│  │                  │ ◄─────────────  │      :8080             │   │
│  │  /               │   JSON resp     │                        │   │
│  │  /send           │                 │  POST /api/audit/*     │   │
│  │  /logs           │ ──────────────► │  GET  /api/logs        │   │
│  │  /status         │                 │  GET  /api/connectors  │   │
│  └──────────────────┘                 │  GET  /api/dlq         │   │
│                                       └───────────┬────────────┘   │
│                                                   │                 │
│                                      produce      │ :9092           │
│                                                   ▼                 │
│                              ┌────────────────────────────────┐    │
│                              │   Kafka (KRaft) :9092          │    │
│                              │   Schema Registry  :8081       │    │
│                              │                                │    │
│                              │   topics:                      │    │
│                              │   • audit-log (p=3, r=1)       │    │
│                              │   • audit-log-dlq (p=1, r=1)   │    │
│                              │   • audit-log-s3-dlq (p=1, r=1)│    │
│                              └─────────────┬──────────────────┘    │
│                                            │ consume                │
│                              ┌─────────────▼──────────────────┐    │
│                              │   Kafka Connect :8083          │    │
│                              │                                │    │
│                              │  ┌─────────────┐ ┌──────────┐ │    │
│                              │  │  ES Sink    │ │  S3 Sink │ │    │
│                              │  │  tasks=2    │ │  tasks=2 │ │    │
│                              │  └──────┬──────┘ └────┬─────┘ │    │
│                              └─────────│──────────────│───────┘    │
│                                        │              │             │
│                              ┌─────────▼──┐  ┌────────▼────────┐  │
│                              │Elasticsearch│  │     MinIO       │  │
│                              │ :9200      │  │  :9000 (API)    │  │
│                              │ heap=1g    │  │  :9001 (UI)     │  │
│                              │ single-node│  │  single-node    │  │
│                              └─────┬──────┘  └─────────────────┘  │
│                                    │ query logs                    │
│                                    └──────────► Go Producer API    │
│                                                                     │
│  ┌─────────────────────────────────────┐                           │
│  │  Prometheus :9090  Grafana :3000    │                           │
│  │  JMX :7071 (kafka) :7072 (connect) │                           │
│  │  ES Exporter :9114                  │                           │
│  └─────────────────────────────────────┘                           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Data Flow Design

### 2.1 Send Audit Event (Happy Path)

```
User fills form (Next.js /send)
  │
  │ POST /api/audit/update
  │ { actor, event, target, changes }
  ▼
Go Producer API
  ├─ validate required fields
  ├─ auto-fill: log_id (UUID v7), timestamp (now RFC3339)
  ├─ serialize to Avro (via Schema Registry HTTP API)
  └─ produce to Kafka topic "audit-log" (acks=all, idempotent)
       │
       │ offset + log_id returned
       ▼
  Response 201: { "log_id": "...", "offset": 42 }
  │
  ▼
Next.js แสดง success toast พร้อม log_id

──── async (Kafka → sinks) ────────────────────────────────

Kafka Connect (ES Sink)
  ├─ consume from "audit-log"
  ├─ batch 100 records
  ├─ upsert to Elasticsearch index "audit-log-YYYY.MM"
  │   └─ _id = log_id (UUID v7) → idempotent
  └─ commit offset after success

Kafka Connect (S3 Sink)
  ├─ consume from "audit-log"
  ├─ buffer 1000 records or 1h
  ├─ write Parquet (Snappy) to MinIO
  │   └─ path: topics/audit-log/year=YYYY/month=MM/day=dd/*.snappy.parquet
  └─ commit offset after success
```

### 2.2 Query Logs (Next.js /logs)

```
User opens /logs page (Next.js)
  │
  │ GET /api/logs?size=50&from=0
  ▼
Go Producer API
  └─ ES query: GET /audit-log-*/_search
       {
         "sort": [{ "timestamp": "desc" }],
         "from": 0,
         "size": 50,
         "query": { "match_all": {} }
       }
       │
       ▼
  Response 200: { "total": N, "logs": [...] }
  │
  ▼
Next.js render table
```

### 2.3 Error Path → DLQ

```
Kafka Connect (ES Sink) ── write fails (e.g. mapping conflict)
  ├─ retry up to 10 times (backoff 3s)
  └─ non-retryable → produce to "audit-log-dlq"
       └─ error headers:
            __connect.errors.exception.class.name
            __connect.errors.exception.message
            __connect.errors.topic
            __connect.errors.offset

Go Producer API GET /api/dlq
  └─ AdminClient.ListOffsets("audit-log-dlq")
  └─ Response: { "es_dlq_count": 1, "s3_dlq_count": 0 }
```

---

## 3. Directory & File Design

```
audit-logging-local/
│
├── docker-compose.yml               ← orchestrate ทุก service
├── .env                             ← environment variables
├── .env.example                     ← template สำหรับ commit
│
├── frontend/                        ← Next.js 15
│   ├── Dockerfile
│   ├── package.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── src/
│       ├── app/
│       │   ├── layout.tsx           ← root layout + nav
│       │   ├── page.tsx             ← Dashboard
│       │   ├── send/
│       │   │   └── page.tsx         ← Send Event form
│       │   ├── logs/
│       │   │   └── page.tsx         ← Log viewer table
│       │   └── status/
│       │       └── page.tsx         ← Connector status
│       ├── components/
│       │   ├── ui/                  ← shadcn/ui components
│       │   ├── EventForm.tsx        ← form สำหรับ /send
│       │   ├── LogTable.tsx         ← table สำหรับ /logs
│       │   ├── StatusCard.tsx       ← card สำหรับ /status
│       │   └── RecentFeed.tsx       ← live feed สำหรับ dashboard
│       ├── lib/
│       │   ├── api.ts               ← HTTP client → Go API
│       │   └── types.ts             ← TypeScript types (AuditEvent etc.)
│       └── hooks/
│           └── usePolling.ts        ← poll endpoint ทุก 5s
│
├── producer-api/                    ← Go HTTP API + Kafka producer
│   ├── Dockerfile
│   ├── go.mod                       ← module: github.com/.../producer-api
│   ├── go.sum
│   ├── main.go                      ← HTTP server bootstrap
│   └── internal/
│       ├── config/
│       │   └── config.go            ← read env vars
│       ├── kafka/
│       │   └── producer.go          ← Kafka producer wrapper
│       ├── schema/
│       │   ├── auditlog.go          ← AuditEvent struct + Avro registration
│       │   └── uuidv7.go            ← UUID v7 generator
│       ├── handler/
│       │   ├── audit.go             ← POST /api/audit/*
│       │   ├── logs.go              ← GET /api/logs
│       │   └── status.go            ← GET /api/connectors, /api/dlq
│       ├── es/
│       │   └── client.go            ← ES HTTP client (search)
│       └── middleware/
│           └── cors.go              ← CORS สำหรับ localhost:3001
│
├── kafka/
│   └── kraft/
│       └── server.properties        ← KRaft single-broker config
│
├── schema-registry/
│   └── schemas/
│       └── audit-log-value.avsc     ← Avro schema file
│
├── kafka-connect/
│   ├── plugins/                     ← mount JAR files
│   │   ├── kafka-connect-elasticsearch-*.jar
│   │   └── kafka-connect-s3-*.jar
│   └── connectors/
│       ├── es-sink.json             ← ES Sink connector config
│       └── s3-sink.json             ← S3/MinIO Sink connector config
│
├── elasticsearch/
│   └── config/
│       └── elasticsearch.yml        ← single-node config
│
├── minio/
│   └── data/                        ← volume mount point
│
├── prometheus/
│   ├── prometheus.yml               ← scrape configs
│   └── rules/
│       └── kafka-alerts.yml         ← alert rules (consumer lag, DLQ)
│
├── grafana/
│   ├── provisioning/
│   │   ├── datasources/
│   │   │   └── prometheus.yml
│   │   └── dashboards/
│   │       └── dashboard.yml
│   └── dashboards/
│       ├── kafka-overview.json
│       ├── kafka-connect.json
│       ├── elasticsearch.json
│       └── pipeline-overview.json
│
└── scripts/
    ├── init.sh                      ← bootstrap (topics + schema + connectors + bucket)
    ├── load-test.sh                 ← send N events
    └── presets/
        ├── update-credit.json
        ├── create-user.json
        ├── delete-account.json
        ├── access-record.json
        └── login.json
```

---

## 4. Avro Schema Design

### `audit-log-value.avsc`

```json
{
  "type": "record",
  "name": "AuditEvent",
  "namespace": "com.audit.log",
  "fields": [
    { "name": "timestamp",  "type": "string" },
    { "name": "log_id",     "type": "string" },
    {
      "name": "actor",
      "type": {
        "type": "record", "name": "Actor",
        "fields": [
          { "name": "user_id",    "type": "string" },
          { "name": "role",       "type": "string" },
          { "name": "ip_address", "type": ["null", "string"], "default": null },
          { "name": "user_agent", "type": ["null", "string"], "default": null }
        ]
      }
    },
    {
      "name": "event",
      "type": {
        "type": "record", "name": "Event",
        "fields": [
          { "name": "action",  "type": "string" },
          { "name": "module",  "type": ["null", "string"], "default": null },
          { "name": "outcome", "type": "string" }
        ]
      }
    },
    {
      "name": "target",
      "type": {
        "type": "record", "name": "Target",
        "fields": [
          { "name": "resource_type", "type": "string" },
          { "name": "resource_id",   "type": "string" }
        ]
      }
    },
    { "name": "changes", "type": ["null", "string"], "default": null },
    { "name": "payload", "type": ["null", "string"], "default": null },
    { "name": "metadata","type": ["null", "string"], "default": null }
  ]
}
```

> `changes`, `payload`, `metadata` serialize เป็น JSON string เพื่อ flexibility
> (Avro ไม่รองรับ nested dynamic object โดยตรงแบบ type-safe)

---

## 5. API Design

### 5.1 Request / Response Examples

**POST /api/audit/update**
```json
// Request
{
  "actor": {
    "user_id": "EMP-123",
    "role": "ADMIN",
    "ip_address": "127.0.0.1"
  },
  "event": {
    "action": "UPDATE_CREDIT_LIMIT",
    "module": "LOAN_SERVICE",
    "outcome": "SUCCESS"
  },
  "target": {
    "resource_type": "CUSTOMER_ACCOUNT",
    "resource_id": "ACC-123456"
  },
  "changes": {
    "field": "credit_limit",
    "old_value": "5000000.00",
    "new_value": "10000000.00"
  }
}

// Response 201
{
  "log_id": "01952fa3-8e1b-7000-9c44-1a2b3c4d5e6f",
  "offset": 42,
  "partition": 1,
  "topic": "audit-log"
}
```

**GET /api/logs?size=20&action=UPDATE**
```json
// Response 200
{
  "total": 87,
  "logs": [
    {
      "timestamp": "2026-02-19T10:00:00Z",
      "log_id": "01952fa3-...",
      "actor": { "user_id": "EMP-123", "role": "ADMIN" },
      "event": { "action": "UPDATE_CREDIT_LIMIT", "outcome": "SUCCESS" },
      "target": { "resource_type": "CUSTOMER_ACCOUNT", "resource_id": "ACC-123456" },
      "changes": { "field": "credit_limit", "old_value": "5000000.00", "new_value": "10000000.00" }
    }
  ]
}
```

**GET /api/connectors**
```json
// Response 200
{
  "connectors": {
    "audit-log-es-sink":  { "state": "RUNNING", "tasks": [{ "id": 0, "state": "RUNNING" }] },
    "audit-log-s3-sink":  { "state": "RUNNING", "tasks": [{ "id": 0, "state": "RUNNING" }] }
  }
}
```

**GET /api/dlq**
```json
// Response 200
{
  "es_dlq_count":  0,
  "s3_dlq_count":  0
}
```

### 5.2 Error Responses

```json
// 400 Bad Request
{ "error": "validation failed", "details": "actor.user_id is required" }

// 503 Service Unavailable
{ "error": "kafka unavailable", "details": "connection refused :9092" }
```

---

## 6. Kafka Connect Config Design

### `connectors/es-sink.json`

```json
{
  "name": "audit-log-es-sink",
  "config": {
    "connector.class": "io.confluent.connect.elasticsearch.ElasticsearchSinkConnector",
    "tasks.max": "2",
    "topics": "audit-log",
    "connection.url": "http://elasticsearch:9200",
    "type.name": "_doc",
    "key.ignore": "false",
    "schema.ignore": "true",
    "transforms": "extractLogId",
    "transforms.extractLogId.type": "org.apache.kafka.connect.transforms.ValueToKey",
    "transforms.extractLogId.fields": "log_id",
    "write.method": "upsert",
    "batch.size": "100",
    "max.buffered.records": "500",
    "max.retries": "10",
    "retry.backoff.ms": "3000",
    "errors.tolerance": "all",
    "errors.deadletterqueue.topic.name": "audit-log-dlq",
    "errors.deadletterqueue.topic.replication.factor": "1",
    "errors.deadletterqueue.context.headers.enable": "true"
  }
}
```

### `connectors/s3-sink.json`

```json
{
  "name": "audit-log-s3-sink",
  "config": {
    "connector.class": "io.confluent.connect.s3.S3SinkConnector",
    "tasks.max": "2",
    "topics": "audit-log",
    "s3.region": "us-east-1",
    "s3.bucket.name": "audit-log-archive",
    "s3.part.size": "5242880",
    "store.url": "http://minio:9000",
    "storage.class": "io.confluent.connect.s3.storage.S3Storage",
    "format.class": "io.confluent.connect.s3.format.parquet.ParquetFormat",
    "parquet.codec": "snappy",
    "partitioner.class": "io.confluent.connect.storage.partitioner.TimeBasedPartitioner",
    "path.format": "'year'=YYYY/'month'=MM/'day'=dd",
    "partition.duration.ms": "3600000",
    "locale": "en_US",
    "timezone": "Asia/Bangkok",
    "timestamp.extractor": "RecordField",
    "timestamp.field": "timestamp",
    "flush.size": "1000",
    "rotate.interval.ms": "3600000",
    "errors.tolerance": "all",
    "errors.deadletterqueue.topic.name": "audit-log-s3-dlq",
    "errors.deadletterqueue.topic.replication.factor": "1",
    "errors.deadletterqueue.context.headers.enable": "true"
  }
}
```

---

## 7. Elasticsearch Index Design

### Index Template

```json
PUT _index_template/audit-log-template
{
  "index_patterns": ["audit-log-*"],
  "template": {
    "settings": {
      "number_of_shards": 1,
      "number_of_replicas": 0,
      "index.mapping.total_fields.limit": 100
    },
    "mappings": {
      "dynamic": "strict",
      "properties": {
        "timestamp":  { "type": "date" },
        "log_id":     { "type": "keyword" },
        "actor": {
          "properties": {
            "user_id":    { "type": "keyword" },
            "role":       { "type": "keyword" },
            "ip_address": { "type": "ip" },
            "user_agent": { "type": "text", "index": false }
          }
        },
        "event": {
          "properties": {
            "action":  { "type": "keyword" },
            "module":  { "type": "keyword" },
            "outcome": { "type": "keyword" }
          }
        },
        "target": {
          "properties": {
            "resource_type": { "type": "keyword" },
            "resource_id":   { "type": "keyword" }
          }
        },
        "changes":  { "type": "object", "dynamic": true },
        "payload":  { "type": "object", "dynamic": true },
        "metadata": { "type": "object", "dynamic": true }
      }
    }
  }
}
```

---

## 8. Frontend Component Design

### Page: `/send` — State Flow

```
EventForm
  ├── actionType state   → controls which fields to show
  │    CREATE / UPDATE / DELETE → show changes/payload section
  │    ACCESS / AUTH            → changes/payload hidden
  │
  ├── presetLoader       → fetch scripts/presets/*.json → fill form
  │
  ├── onSubmit
  │    └── POST /api/audit/{actionType.toLowerCase()}
  │         ├── loading state → disable button
  │         ├── success → show toast(log_id) + reset form
  │         └── error   → show error banner
  │
  └── fields
       ├── user_id (required)
       ├── role (dropdown)
       ├── module (optional text)
       ├── resource_type (required)
       ├── resource_id (required)
       ├── outcome (dropdown: SUCCESS / FAILURE)
       └── changes section (show if UPDATE/DELETE/CREATE)
            ├── field name
            ├── old value (JSON textarea)
            └── new value (JSON textarea)
```

### Page: `/logs` — Query Flow

```
LogTable
  ├── filter state: { action, user_id, dateFrom, dateTo, page }
  ├── useEffect(filters) → GET /api/logs?...
  ├── table columns:
  │    timestamp | log_id (first 8 chars) | user_id | action | resource | outcome
  └── row click → modal/drawer แสดง full JSON
```

### TypeScript Types (`src/lib/types.ts`)

```typescript
export interface AuditEvent {
  timestamp: string
  log_id: string
  actor: {
    user_id: string
    role: string
    ip_address?: string
    user_agent?: string
  }
  event: {
    action: string
    module?: string
    outcome: 'SUCCESS' | 'FAILURE' | 'PENDING'
  }
  target: {
    resource_type: string
    resource_id: string
  }
  changes?: {
    field?: string
    old_value: unknown
    new_value: unknown
  }
  payload?: {
    old_value: unknown
    new_value: unknown
  }
  metadata?: {
    correlation_id?: string
    service_name?: string
  }
}

export interface SendResponse {
  log_id: string
  offset: number
  partition: number
  topic: string
}

export interface LogsResponse {
  total: number
  logs: AuditEvent[]
}

export interface ConnectorStatus {
  connectors: Record<string, {
    state: 'RUNNING' | 'PAUSED' | 'FAILED' | 'UNASSIGNED'
    tasks: Array<{ id: number; state: string }>
  }>
}

export interface DLQCount {
  es_dlq_count: number
  s3_dlq_count: number
}
```

---

## 9. docker-compose.yml Design (Service Specs)

```yaml
version: '3.8'

services:

  kafka:
    image: confluentinc/cp-kafka:7.7.0
    environment:
      KAFKA_NODE_ID: 1
      KAFKA_PROCESS_ROLES: broker,controller
      KAFKA_LISTENERS: PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@kafka:9093
      KAFKA_LOG_DIRS: /var/lib/kafka/data
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: 'false'
      KAFKA_DEFAULT_REPLICATION_FACTOR: 1
      KAFKA_MIN_INSYNC_REPLICAS: 1
      KAFKA_JVM_PERFORMANCE_OPTS: "-Xms256m -Xmx512m"
      EXTRA_ARGS: -javaagent:/usr/share/jmx-exporter/jmx_prometheus_javaagent.jar=7071:/usr/share/jmx-exporter/kafka-broker.yml
    ports: ["9092:9092", "7071:7071"]
    volumes:
      - kafka-data:/var/lib/kafka/data
    deploy:
      resources:
        limits: { memory: 768m }

  schema-registry:
    image: confluentinc/cp-schema-registry:7.7.0
    environment:
      SCHEMA_REGISTRY_KAFKASTORE_BOOTSTRAP_SERVERS: kafka:9092
      SCHEMA_REGISTRY_HOST_NAME: schema-registry
      SCHEMA_REGISTRY_LISTENERS: http://0.0.0.0:8081
    ports: ["8081:8081"]
    depends_on: [kafka]
    deploy:
      resources:
        limits: { memory: 512m }

  kafka-connect:
    image: confluentinc/cp-kafka-connect:7.7.0
    environment:
      CONNECT_BOOTSTRAP_SERVERS: kafka:9092
      CONNECT_REST_PORT: 8083
      CONNECT_GROUP_ID: audit-connect-group
      CONNECT_CONFIG_STORAGE_TOPIC: _connect-configs
      CONNECT_OFFSET_STORAGE_TOPIC: _connect-offsets
      CONNECT_STATUS_STORAGE_TOPIC: _connect-status
      CONNECT_CONFIG_STORAGE_REPLICATION_FACTOR: 1
      CONNECT_OFFSET_STORAGE_REPLICATION_FACTOR: 1
      CONNECT_STATUS_STORAGE_REPLICATION_FACTOR: 1
      CONNECT_KEY_CONVERTER: org.apache.kafka.connect.json.JsonConverter
      CONNECT_VALUE_CONVERTER: io.confluent.connect.avro.AvroConverter
      CONNECT_VALUE_CONVERTER_SCHEMA_REGISTRY_URL: http://schema-registry:8081
      CONNECT_PLUGIN_PATH: /usr/share/java,/etc/kafka-connect/plugins
      KAFKA_JVM_PERFORMANCE_OPTS: "-Xms256m -Xmx512m"
      EXTRA_ARGS: -javaagent:/usr/share/jmx-exporter/jmx_prometheus_javaagent.jar=7072:/usr/share/jmx-exporter/kafka-connect.yml
    ports: ["8083:8083", "7072:7072"]
    volumes:
      - ./kafka-connect/plugins:/etc/kafka-connect/plugins
    depends_on: [kafka, schema-registry]
    deploy:
      resources:
        limits: { memory: 768m }

  elasticsearch:
    image: elasticsearch:8.12.0
    environment:
      discovery.type: single-node
      xpack.security.enabled: 'false'
      ES_JAVA_OPTS: "-Xms1g -Xmx1g"
    ports: ["9200:9200"]
    volumes:
      - es-data:/usr/share/elasticsearch/data
      - ./elasticsearch/config/elasticsearch.yml:/usr/share/elasticsearch/config/elasticsearch.yml
    deploy:
      resources:
        limits: { memory: 1536m }

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports: ["9000:9000", "9001:9001"]
    volumes:
      - minio-data:/data
    deploy:
      resources:
        limits: { memory: 512m }

  prometheus:
    image: prom/prometheus:latest
    ports: ["9090:9090"]
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - ./prometheus/rules:/etc/prometheus/rules
      - prometheus-data:/prometheus
    deploy:
      resources:
        limits: { memory: 256m }

  grafana:
    image: grafana/grafana:latest
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
      GF_AUTH_ANONYMOUS_ENABLED: 'true'
    ports: ["3000:3000"]
    volumes:
      - ./grafana/provisioning:/etc/grafana/provisioning
      - ./grafana/dashboards:/var/lib/grafana/dashboards
      - grafana-data:/var/lib/grafana
    deploy:
      resources:
        limits: { memory: 256m }

  producer-api:
    build: ./producer-api
    environment:
      KAFKA_BROKER: kafka:9092
      SCHEMA_REGISTRY_URL: http://schema-registry:8081
      KAFKA_TOPIC: audit-log
      ES_URL: http://elasticsearch:9200
      CONNECT_URL: http://kafka-connect:8083
      PORT: 8080
    ports: ["8080:8080"]
    depends_on: [kafka, schema-registry, elasticsearch]
    deploy:
      resources:
        limits: { memory: 128m }

  frontend:
    build: ./frontend
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:8080
    ports: ["3001:3001"]
    depends_on: [producer-api]
    deploy:
      resources:
        limits: { memory: 384m }

volumes:
  kafka-data:
  es-data:
  minio-data:
  prometheus-data:
  grafana-data:

networks:
  default:
    name: audit-net
```

---

## 10. init.sh Flow Design

```bash
#!/usr/bin/env bash
# scripts/init.sh — Bootstrap audit-logging-local stack

STEPS:
1. wait_for_service kafka:9092          (TCP check, timeout 60s)
2. wait_for_service schema-registry:8081 (HTTP /subjects, timeout 60s)
3. wait_for_service kafka-connect:8083   (HTTP /, timeout 90s)
4. wait_for_service elasticsearch:9200   (HTTP /_cluster/health, timeout 60s)
5. wait_for_service minio:9000          (HTTP /minio/health/live, timeout 30s)

6. create_topics
   kafka-topics --create --topic audit-log      --partitions 3 --replication-factor 1
   kafka-topics --create --topic audit-log-dlq  --partitions 1 --replication-factor 1
   kafka-topics --create --topic audit-log-s3-dlq --partitions 1 --replication-factor 1

7. register_schema
   POST http://schema-registry:8081/subjects/audit-log-value/versions
   body: { "schema": "<avsc content>" }

8. create_es_index_template
   PUT http://elasticsearch:9200/_index_template/audit-log-template
   body: <template JSON>

9. deploy_connectors
   POST http://kafka-connect:8083/connectors   body: es-sink.json
   POST http://kafka-connect:8083/connectors   body: s3-sink.json

10. create_minio_bucket
    mc alias set local http://minio:9000 minioadmin minioadmin
    mc mb local/audit-log-archive --ignore-existing

11. print_summary
    ✅ Kafka topics: audit-log, audit-log-dlq, audit-log-s3-dlq
    ✅ Schema registered: audit-log-value v1
    ✅ ES index template: audit-log-template
    ✅ Connectors: audit-log-es-sink (RUNNING), audit-log-s3-sink (RUNNING)
    ✅ MinIO bucket: audit-log-archive

    🌐 Next.js UI:     http://localhost:3001
    🔌 Go API:         http://localhost:8080
    📊 Grafana:        http://localhost:3000  (admin/admin)
    🗄️  MinIO Console:  http://localhost:9001  (minioadmin/minioadmin)
    📡 Kafka Connect:  http://localhost:8083
```

---

## 11. Preset Payloads Design

### `scripts/presets/update-credit.json`
```json
{
  "actor": { "user_id": "EMP-123", "role": "ADMIN", "ip_address": "10.20.30.40" },
  "event": { "action": "UPDATE_CREDIT_LIMIT", "module": "LOAN_SERVICE", "outcome": "SUCCESS" },
  "target": { "resource_type": "CUSTOMER_ACCOUNT", "resource_id": "ACC-123456" },
  "changes": { "field": "credit_limit", "old_value": "5000000.00", "new_value": "10000000.00" },
  "metadata": { "correlation_id": "req-xyz-789", "service_name": "loan-service" }
}
```

### `scripts/presets/create-user.json`
```json
{
  "actor": { "user_id": "ADMIN-001", "role": "SUPER_ADMIN" },
  "event": { "action": "CREATE_USER", "outcome": "SUCCESS" },
  "target": { "resource_type": "EMPLOYEE", "resource_id": "EMP-2026-05" },
  "payload": {
    "old_value": null,
    "new_value": { "employee_id": "EMP-2026-05", "department": "IT Support", "status": "ACTIVE" }
  }
}
```

### `scripts/presets/delete-account.json`
```json
{
  "actor": { "user_id": "ADMIN-002", "role": "COMPLIANCE_OFFICER" },
  "event": { "action": "DELETE_ACCOUNT", "module": "ACCOUNT_SERVICE", "outcome": "SUCCESS" },
  "target": { "resource_type": "CUSTOMER_ACCOUNT", "resource_id": "ACC-789012" },
  "payload": {
    "old_value": { "account_id": "ACC-789012", "balance": 250000.00 },
    "new_value": null
  }
}
```

---

## 12. Implementation Order

```
Step 1:  docker-compose.yml + .env
Step 2:  kafka/ KRaft config
Step 3:  schema-registry/ avsc schema
Step 4:  elasticsearch/ config + index template
Step 5:  kafka-connect/ connector JSONs + download plugins
Step 6:  minio/ (no config needed, just volume)
Step 7:  prometheus/ + grafana/ configs
Step 8:  scripts/init.sh
Step 9:  producer-api/ (Go)
           config → kafka → schema → es client → handlers → main
Step 10: frontend/ (Next.js)
           types → api.ts → components → pages
Step 11: Test end-to-end
           docker-compose up → init.sh → UI → verify logs → verify MinIO
```
