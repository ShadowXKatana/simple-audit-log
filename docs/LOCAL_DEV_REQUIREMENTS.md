# Local Development Requirements
# Centralized Audit & Compliance Logging Service

**Based on:** RFC — Centralized Audit & Compliance Logging Service
**Author:** Jiratip Hemwutthipan
**Target Environment:** MacBook M3 16GB (local dev/test only)
**Date:** 2026-02-19
**Status:** Draft

---

## 1. Project Overview

Local development stack ที่ลด scale จาก RFC production architecture เพื่อให้รันได้บน MacBook M3 16GB โดยยังคง core pipeline และ data flow เหมือน production ทุกอย่าง ต่างกันเฉพาะ HA / replication / security ที่ตัดออกเพื่อประหยัด resource

**Core Pipeline (เหมือน Production):**
```
Next.js UI → Go Producer API → Kafka → Kafka Connect → Elasticsearch + MinIO
```

**Memory Budget:** Docker stack ≤ 6 GB (เหลือ ~8-10 GB สำหรับ macOS + apps)

---

## 2. Repository Structure

```
audit-logging-local/
├── docker-compose.yml
├── .env
├── frontend/             # Next.js 15
├── producer-api/         # Go HTTP API + Kafka producer
├── kafka/                # KRaft config
├── schema-registry/      # Avro schemas
├── kafka-connect/        # Connector configs + plugins
├── elasticsearch/        # ES config
├── minio/                # MinIO data dir
├── prometheus/           # Prometheus config + alert rules
├── grafana/              # Dashboards + datasources
└── scripts/              # init.sh, load-test.sh, presets/
```

---

## 3. Infrastructure Requirements

### 3.1 Kafka (KRaft Mode)

| Item | Local Dev | Production (RFC) |
|------|-----------|-----------------|
| Mode | KRaft (no ZooKeeper) | ZooKeeper / KRaft |
| Brokers | 1 | 3 |
| replication.factor | 1 | 3 |
| min.insync.replicas | 1 | 2 |
| unclean.leader.election | true | false |
| log.retention | 24h | capacity-based |
| Port | 9092 | 9092 |

**Topics ที่ต้องสร้าง:**
- `audit-log` — partitions=3, replication=1
- `audit-log-dlq` — partitions=1, replication=1
- `audit-log-s3-dlq` — partitions=1, replication=1

**Producer Configs (คงไว้เหมือน RFC):**
- `acks=all`
- `enable.idempotence=true`
- `retries=MAX_INT`
- `compression.type=lz4`

### 3.2 Schema Registry

| Item | Value |
|------|-------|
| Nodes | 1 |
| Format | Avro |
| Compatibility | BACKWARD |
| Port | 8081 |

**Schema:** `audit-log-value` — Avro schema ตรงกับ JSON schema ใน RFC ทุก field

### 3.3 Kafka Connect

| Item | Local Dev | Production (RFC) |
|------|-----------|-----------------|
| Workers | 1 | 2+ |
| tasks.max (per connector) | 2 | 6 |
| batch.size | 100 | 500 |
| max.buffered.records | 500 | 5000 |
| Port | 8083 | 8083 |

**Connectors:**
1. `audit-log-es-sink` — Elasticsearch Sink Connector
   - write.method: upsert (UUID v7 as `_id`)
   - errors.tolerance: all
   - DLQ: `audit-log-dlq`

2. `audit-log-s3-sink` — S3 (MinIO) Sink Connector
   - format: Parquet (Snappy)
   - partitioner: TimeBasedPartitioner (`year/month/day`)
   - flush.size: 1000 (ลดจาก 10000)
   - rotate: 3600000ms (1h)
   - DLQ: `audit-log-s3-dlq`

### 3.4 Elasticsearch

| Item | Local Dev | Production (RFC) |
|------|-----------|-----------------|
| Nodes | 1 (single-node) | 10 (master+data+coord) |
| Heap | `-Xms1g -Xmx1g` | per node sizing |
| Shards | 1 | 3 |
| Replicas | 0 | 1 |
| Security | disabled | TLS + RBAC |
| Port | 9200 | 9200 |

**Index:** `audit-log-YYYY.MM` (time-based, monthly)
**Mapping:** Strict (no dynamic mapping) — เหมือน RFC
**ILM:** ไม่ใช้ใน local (data น้อย)

### 3.5 MinIO

| Item | Local Dev | Production (RFC) |
|------|-----------|-----------------|
| Nodes | 1 (filesystem mode) | 4 nodes |
| Drives | 1 directory | 4+ drives/node |
| Erasure Coding | ไม่มี | EC:2 |
| Object Lock | ไม่ใช้ | COMPLIANCE mode |
| API Port | 9000 | 9000 |
| Console Port | 9001 | — |

**Bucket:** `audit-log-archive`
**Path Pattern:** `topics/audit-log/year=YYYY/month=MM/day=dd/*.snappy.parquet`

### 3.6 Prometheus + Grafana

| Service | Port | Notes |
|---------|------|-------|
| Prometheus | 9090 | scrape interval: 15s |
| Grafana | 3000 | no auth (admin/admin) |
| Alertmanager | — | ไม่ใช้ใน local |

**Exporters:**
- JMX Exporter (Kafka): :7071
- JMX Exporter (Connect): :7072
- Elasticsearch Exporter: :9114

**Dashboards (import จาก Grafana marketplace หรือ custom):**
- Kafka Overview
- Kafka Connect
- Elasticsearch
- Pipeline Overview (custom)

---

## 4. Go Producer API Requirements

### 4.1 Overview

HTTP REST API server ที่ทำหน้าที่ 2 อย่าง:
1. รับ audit event จาก Next.js → validate → produce ไปยัง Kafka
2. Query ข้อมูลจาก Elasticsearch และ Kafka Connect REST API สำหรับ UI

**Language:** Go 1.22+
**Router:** `chi` หรือ `gin`
**Port:** 8080
**CORS:** เปิดสำหรับ localhost:3001

### 4.2 Internal Packages

```
producer-api/
├── main.go
├── go.mod
└── internal/
    ├── kafka/
    │   └── producer.go       # Kafka producer (confluent-kafka-go หรือ sarama)
    ├── schema/
    │   ├── auditlog.go       # Avro schema definition
    │   └── uuidv7.go         # UUID v7 generator
    ├── handler/
    │   ├── audit.go          # POST /api/audit/*
    │   ├── logs.go           # GET /api/logs
    │   └── status.go         # GET /api/connectors, /api/dlq
    └── es/
        └── client.go         # Elasticsearch query client
```

### 4.3 HTTP API Endpoints

#### Health
```
GET /health
Response: 200 { "status": "ok", "kafka": "connected" }
```

#### Send Audit Events
```
POST /api/audit
Body: AuditEvent (full JSON schema)
Response: 201 { "log_id": "uuid-v7", "offset": 42 }

POST /api/audit/create        → action: CREATE
POST /api/audit/update        → action: UPDATE
POST /api/audit/delete        → action: DELETE
POST /api/audit/access        → action: ACCESS
POST /api/audit/auth          → action: AUTHENTICATION
Body: ชื่อ field เหมือน schema ใน RFC แต่ optional fields ไม่ต้องใส่ครบ
Response: 201 { "log_id": "...", "offset": ... }
```

#### Query Logs
```
GET /api/logs?size=50&from=0&action=UPDATE&user_id=EMP-123
Response: 200 {
  "total": 100,
  "logs": [ ...AuditEvent[] ]
}
```

#### System Status
```
GET /api/connectors
Response: proxy จาก Kafka Connect REST API :8083
{ "es-sink": "RUNNING", "s3-sink": "RUNNING" }

GET /api/dlq
Response: { "es_dlq_count": 0, "s3_dlq_count": 0 }
```

### 4.4 Audit Event Schema (Go struct)

ต้องตรงกับ RFC JSON schema ทุก field:

```go
type AuditEvent struct {
    Timestamp string  `json:"timestamp"`  // ISO 8601, auto-generated ถ้าไม่ส่งมา
    LogID     string  `json:"log_id"`     // UUID v7, auto-generated
    Actor     Actor   `json:"actor"`
    Event     Event   `json:"event"`
    Target    Target  `json:"target"`
    Changes   *Change `json:"changes,omitempty"`
    Payload   *Change `json:"payload,omitempty"`
    Metadata  *Meta   `json:"metadata,omitempty"`
}

type Actor struct {
    UserID    string `json:"user_id"`
    Role      string `json:"role"`
    IPAddress string `json:"ip_address,omitempty"`
    UserAgent string `json:"user_agent,omitempty"`
}

type Event struct {
    Action  string `json:"action"`
    Module  string `json:"module,omitempty"`
    Outcome string `json:"outcome"`
}

type Target struct {
    ResourceType string `json:"resource_type"`
    ResourceID   string `json:"resource_id"`
}

type Change struct {
    Field    string      `json:"field,omitempty"`
    OldValue interface{} `json:"old_value"`
    NewValue interface{} `json:"new_value"`
}

type Meta struct {
    CorrelationID string `json:"correlation_id,omitempty"`
    ServiceName   string `json:"service_name,omitempty"`
}
```

### 4.5 Validation Rules

| Field | Rule |
|-------|------|
| `actor.user_id` | required, non-empty |
| `actor.role` | required, non-empty |
| `event.action` | required, non-empty |
| `event.outcome` | required, one of: `SUCCESS`, `FAILURE`, `PENDING` |
| `target.resource_type` | required, non-empty |
| `target.resource_id` | required, non-empty |
| `log_id` | auto-generate UUID v7 ถ้าไม่ส่งมา |
| `timestamp` | auto-generate RFC3339 ถ้าไม่ส่งมา |

---

## 5. Next.js Frontend Requirements

### 5.1 Overview

Simple web UI สำหรับ test และ observe pipeline
ไม่มี auth, ไม่มี role — ใช้ใน local dev เท่านั้น

**Framework:** Next.js 15 (App Router)
**Styling:** Tailwind CSS + shadcn/ui
**Language:** TypeScript
**Port:** 3001
**API Base URL:** `http://localhost:8080` (via env var `NEXT_PUBLIC_API_URL`)

### 5.2 Pages & Features

#### `/` — Dashboard
- แสดง stats: total logs ส่งวันนี้, connector status badge (RUNNING/FAILED), DLQ count
- แสดง recent 10 logs แบบ live feed (poll ทุก 5s หรือ SSE)
- Quick action buttons: ไปหน้า Send Event

#### `/send` — Send Audit Event
- Form เลือก action type: `CREATE`, `UPDATE`, `DELETE`, `ACCESS`, `AUTHENTICATION`
- Fields:
  - User ID (text input)
  - Role (dropdown: `ADMIN`, `SUPER_ADMIN`, `COMPLIANCE_OFFICER`, `USER`)
  - Module (text input, optional)
  - Resource Type (text input)
  - Resource ID (text input)
  - Outcome (dropdown: `SUCCESS`, `FAILURE`)
  - Changes / Payload section (แสดงตาม action type ที่เลือก)
- **Preset buttons** — โหลด preset payload จาก presets/ (UPDATE_CREDIT_LIMIT, CREATE_USER, DELETE_ACCOUNT)
- หลัง submit: แสดง `log_id` และ Kafka offset ที่ได้รับกลับมา
- Error state: แสดง error message จาก API

#### `/logs` — Log Viewer
- Table แสดง audit logs จาก Elasticsearch
- Columns: `timestamp`, `log_id` (truncated), `user_id`, `action`, `resource_type`, `resource_id`, `outcome`
- Filter: action type, user_id, date range
- Pagination: 50 rows/page
- Click row → expand JSON detail

#### `/status` — System Status
- Connector status cards: ES Sink, S3 Sink (RUNNING / PAUSED / FAILED)
- DLQ count badges
- Link ไปยัง Grafana dashboard

### 5.3 API Client (`src/lib/api.ts`)

```typescript
// Endpoints ที่ต้อง implement
sendAuditEvent(event: AuditEvent): Promise<{ log_id: string; offset: number }>
getLogs(params: LogQuery): Promise<{ total: number; logs: AuditEvent[] }>
getConnectorStatus(): Promise<Record<string, string>>
getDLQCount(): Promise<{ es_dlq_count: number; s3_dlq_count: number }>
```

### 5.4 Preset Payloads

สร้าง JSON presets ใน `scripts/presets/` สำหรับ quick-fill form:

**update-credit.json** — UPDATE_CREDIT_LIMIT
**create-user.json** — CREATE_USER
**delete-account.json** — DELETE_ACCOUNT
**access-record.json** — ACCESS sensitive data
**login.json** — AUTHENTICATION login

---

## 6. Docker Compose Requirements

### 6.1 Services

| Service | Image | Port | Memory Limit |
|---------|-------|------|-------------|
| kafka | confluentinc/cp-kafka:7.7.x | 9092, 7071 | 768m |
| schema-registry | confluentinc/cp-schema-registry:7.7.x | 8081 | 512m |
| kafka-connect | confluentinc/cp-kafka-connect:7.7.x | 8083, 7072 | 768m |
| elasticsearch | elasticsearch:8.x | 9200 | 1.5g |
| minio | minio/minio:latest | 9000, 9001 | 512m |
| prometheus | prom/prometheus:latest | 9090 | 256m |
| grafana | grafana/grafana:latest | 3000 | 256m |
| producer-api | ./producer-api (Dockerfile) | 8080 | 128m |
| frontend | ./frontend (Dockerfile) | 3001 | 384m |

### 6.2 Networks

- `audit-net` — internal bridge network, services communicate by service name
- Only expose ports ที่จำเป็นไปยัง host

### 6.3 Volumes

```yaml
volumes:
  kafka-data:
  es-data:
  minio-data:
  prometheus-data:
  grafana-data:
```

### 6.4 Environment Variables (`.env`)

```env
# Kafka
KAFKA_BROKER=kafka:9092
KAFKA_TOPIC=audit-log

# Schema Registry
SCHEMA_REGISTRY_URL=http://schema-registry:8081

# Elasticsearch
ES_URL=http://elasticsearch:9200

# MinIO
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=audit-log-archive

# Kafka Connect
CONNECT_URL=http://kafka-connect:8083

# Go API
API_PORT=8080

# Next.js
NEXT_PUBLIC_API_URL=http://localhost:8080
```

---

## 7. Scripts Requirements

### `scripts/init.sh`

Runs ครั้งเดียวหลัง `docker-compose up` เพื่อ bootstrap:
1. รอทุก service healthy
2. สร้าง Kafka topics (`audit-log`, `audit-log-dlq`, `audit-log-s3-dlq`)
3. Register Avro schema ไปยัง Schema Registry
4. Deploy ES Sink Connector (`POST /connectors`)
5. Deploy S3 Sink Connector (`POST /connectors`)
6. สร้าง MinIO bucket `audit-log-archive`
7. แสดง summary + URLs

### `scripts/load-test.sh`

ส่ง test events จำนวนมากเพื่อ verify pipeline:
- Default: 100 events, mixed action types
- Options: `--count=N`, `--action=UPDATE`
- แสดง throughput (events/sec) หลังเสร็จ

---

## 8. Non-Functional Requirements (Local Dev)

| NFR | Target | Notes |
|-----|--------|-------|
| Startup time | < 2 min | `docker-compose up` จนถึง all healthy |
| Memory usage | ≤ 6 GB | Docker Desktop memory limit |
| Pipeline latency | < 5s | event ส่งจาก UI → ปรากฏใน /logs |
| Load test target | 500 msgs/sec | ลดจาก 10K/sec ใน RFC |
| ES query response | < 500ms | สำหรับ 50 rows |

---

## 9. Out of Scope (Local Dev Only)

สิ่งต่อไปนี้ **ไม่ implement** ใน local dev เพราะลด complexity:

- mTLS / SASL authentication
- TLS encryption (ใช้ plain HTTP ทั้งหมด)
- Kafka replication (repl=1)
- Elasticsearch ILM policy
- MinIO Object Lock (COMPLIANCE mode)
- MinIO Erasure Coding
- Alertmanager / PagerDuty integration
- SSO / LDAP
- Multi-node clusters ทุกตัว

---

## 10. Definition of Done

- [ ] `docker-compose up` แล้ว `scripts/init.sh` รันผ่านโดยไม่มี error
- [ ] Next.js UI เปิดได้ที่ `http://localhost:3001`
- [ ] ส่ง event จากหน้า `/send` แล้ว log ปรากฏในหน้า `/logs` ภายใน 5 วินาที
- [ ] MinIO console (`http://localhost:9001`) มี Parquet file ใน bucket
- [ ] Grafana (`http://localhost:3000`) แสดง Kafka metrics ได้
- [ ] Connector status หน้า `/status` แสดง RUNNING ทั้งคู่
- [ ] `scripts/load-test.sh` ส่ง 100 events โดยไม่มี error
- [ ] DLQ count = 0 หลัง load test ปกติ
- [ ] Memory รวมไม่เกิน 6 GB (ดูจาก `docker stats`)
