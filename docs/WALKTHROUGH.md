# Project Walkthrough

# Simple Audit Log — Step-by-Step Guide

This walkthrough takes you through the entire project from setup to sending your first audit event, querying logs, and understanding every component along the way.

---

## Table of Contents

1. [What This Project Does](#1-what-this-project-does)
2. [Architecture Overview](#2-architecture-overview)
3. [Prerequisites](#3-prerequisites)
4. [Getting Started — Full Stack Launch](#4-getting-started--full-stack-launch)
5. [Getting Started — Dev Mode (Selective)](#5-getting-started--dev-mode-selective)
6. [Walkthrough: Sending Your First Audit Event](#6-walkthrough-sending-your-first-audit-event)
7. [Walkthrough: Querying Logs](#7-walkthrough-querying-logs)
8. [Walkthrough: Checking Pipeline Status](#8-walkthrough-checking-pipeline-status)
9. [Understanding the Components](#9-understanding-the-components)
   - [Producer API (Go)](#91-producer-api-go)
   - [UI (Next.js)](#92-ui-nextjs)
   - [Kafka & Schema Registry](#93-kafka--schema-registry)
   - [Kafka Connect (Consumer)](#94-kafka-connect-consumer)
   - [Elasticsearch](#95-elasticsearch)
   - [MinIO (S3-compatible storage)](#96-minio-s3-compatible-storage)
   - [Monitoring (Prometheus & Grafana)](#97-monitoring-prometheus--grafana)
10. [Data Flow — End to End](#10-data-flow--end-to-end)
11. [API Reference](#11-api-reference)
12. [Event Presets](#12-event-presets)
13. [Load Testing](#13-load-testing)
14. [Docker Compose Profiles](#14-docker-compose-profiles)
15. [Troubleshooting](#15-troubleshooting)
16. [Cleanup](#16-cleanup)

---

## 1. What This Project Does

Simple Audit Log is a **centralized audit logging system** that captures, stores, and queries compliance-grade audit events. It demonstrates a production-like event-driven pipeline running entirely on a local machine.

**Key capabilities:**

- Send structured audit events (create, update, delete, access, authentication) via a REST API
- Events are serialized with Avro, produced to Kafka, and consumed by Kafka Connect
- Logs are indexed into Elasticsearch for real-time search
- Logs are archived to MinIO (S3-compatible) as Parquet files for long-term storage
- A Next.js dashboard provides a UI for sending events, viewing logs, and monitoring status
- Failed events are routed to dead-letter queues (DLQ) for inspection

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Docker Compose (audit-net)                   │
│                                                                     │
│  ┌──────────────┐   HTTP :8080    ┌─────────────────────────┐      │
│  │ Next.js UI   │ ─────────────►  │   Go Producer API       │      │
│  │   :3001      │ ◄─────────────  │      :8080              │      │
│  └──────────────┘                 └───────────┬─────────────┘      │
│                                               │                     │
│                                  produce      │ :9092                │
│                                               ▼                     │
│                          ┌──────────────────────────────────┐      │
│                          │  Kafka (KRaft)   :9092           │      │
│                          │  Schema Registry :8081           │      │
│                          │  Topics: audit-log, DLQs         │      │
│                          └───────────────┬──────────────────┘      │
│                                          │ consume                  │
│                          ┌───────────────▼──────────────────┐      │
│                          │  Kafka Connect :8083             │      │
│                          │  ┌──────────┐  ┌──────────┐     │      │
│                          │  │ ES Sink  │  │ S3 Sink  │     │      │
│                          │  └────┬─────┘  └────┬─────┘     │      │
│                          └───────│─────────────│────────────┘      │
│                                  │             │                    │
│                      ┌───────────▼──┐  ┌───────▼──────────┐       │
│                      │Elasticsearch │  │     MinIO        │       │
│                      │   :9200      │  │  :9000 / :9001   │       │
│                      └──────────────┘  └──────────────────┘       │
│                                                                     │
│         ┌──────────────────────────────────────────┐               │
│         │  Prometheus :9090  │  Grafana :3000      │               │
│         └──────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Prerequisites

| Tool           | Version | Check                    |
| -------------- | ------- | ------------------------ |
| Docker         | 24+     | `docker --version`       |
| Docker Compose | v2+     | `docker compose version` |
| Go             | 1.22+   | `go version`             |
| Node.js        | 20+     | `node --version`         |
| npm            | 10+     | `npm --version`          |

> **Note:** Go and Node.js are only needed if you want to run the Producer API or UI locally outside of Docker.

---

## 4. Getting Started — Full Stack Launch

The fastest way to see everything running:

### Step 1: Clone and enter the project

```bash
cd simple-audit-log
```

### Step 2: Set up environment variables

```bash
cp .env.template .env
```

The defaults work out of the box for Docker-based setup.

### Step 3: Pull Docker images

```bash
make pull
```

### Step 4: Start everything

```bash
make start
```

### Step 5: Initialize the pipeline

Wait about 30 seconds for services to become healthy, then:

```bash
make init
```

1. Create Kafka topics (`audit-log`, `audit-log-dlq`, `audit-log-s3-dlq`)
2. **Register the Avro schema** in Schema Registry (`audit-log-value`)
3. Deploy the Elasticsearch Sink Connector
4. Deploy the S3 (MinIO) Sink Connector
5. Confirm MinIO bucket creation (handled by `minio-init` container)

### Step 6: Open the UI

Open **http://localhost:3001** in your browser. You should see the dashboard.

---

## 5. Getting Started — Dev Mode (Selective)

If you're developing on the Go API or Next.js UI and want faster iteration:

### Step 1: Start infrastructure only

```bash
make infra
```

### Step 2: Initialize topics and connectors

```bash
# Start Kafka Connect
make consumer

# Wait ~15 seconds, then deploy connectors
make init
```

### Step 3: Run the Producer API locally

```bash
cd apps/producer
go mod download
go run main.go
```

The API starts on **http://localhost:8080** with these defaults:

| Variable       | Default                 |
| -------------- | ----------------------- |
| `KAFKA_BROKER` | `localhost:9092`        |
| `KAFKA_TOPIC`  | `audit-log`             |
| `ES_URL`       | `http://localhost:9200` |
| `CONNECT_URL`  | `http://localhost:8083` |
| `API_PORT`     | `8080`                  |

### Step 4: Run the UI locally

```bash
cd apps/ui
npm install
npm run dev
```

The UI starts on **http://localhost:3001**.

---

## 6. Walkthrough: Sending Your First Audit Event

### Option A: Using the UI

1. Open **http://localhost:3001**
2. Click **Send Event** in the sidebar
3. Select a preset (e.g., "Update Credit Limit") or fill in the form manually:
   - **Actor:** User ID, Role, IP Address
   - **Event:** Action type, Module, Outcome
   - **Target:** Resource type and ID
   - **Changes** (optional): Field name, old value, new value
4. Click **Send**
5. A success toast appears with the generated `log_id` and Kafka offset

### Option B: Using curl

Send a generic audit event:

```bash
curl -X POST http://localhost:8080/api/audit \
  -H "Content-Type: application/json" \
  -d '{
    "actor": {
      "user_id": "EMP-001",
      "role": "ADMIN",
      "ip_address": "192.168.1.100"
    },
    "event": {
      "action": "UPDATE",
      "module": "credit-management",
      "outcome": "SUCCESS"
    },
    "target": {
      "resource_type": "credit_limit",
      "resource_id": "CL-2026-0001"
    },
    "changes": {
      "field": "credit_limit",
      "old_value": 50000,
      "new_value": 100000
    }
  }'
```

**Response (201 Created):**

```json
{
  "log_id": "019...",
  "offset": 0
}
```

You can also use action-specific endpoints:

```bash
# Create event
curl -X POST http://localhost:8080/api/audit/create -H "Content-Type: application/json" -d @scripts/presets/create-user.json

# Update event
curl -X POST http://localhost:8080/api/audit/update -H "Content-Type: application/json" -d @scripts/presets/update-credit.json

# Delete event
curl -X POST http://localhost:8080/api/audit/delete -H "Content-Type: application/json" -d @scripts/presets/delete-account.json

# Access event
curl -X POST http://localhost:8080/api/audit/access -H "Content-Type: application/json" -d @scripts/presets/access-record.json

# Auth event
curl -X POST http://localhost:8080/api/audit/auth -H "Content-Type: application/json" -d @scripts/presets/login.json
```

### What happens behind the scenes

1. The Go API validates the request and auto-fills `log_id` (UUID v7) and `timestamp` (RFC 3339)
2. The event is serialized to Avro using the schema from Schema Registry
3. The event is produced to the `audit-log` Kafka topic with `acks=all` and idempotence enabled
4. Kafka Connect picks up the event within seconds:
   - **ES Sink** indexes it into Elasticsearch as `audit-log-YYYY.MM`
   - **S3 Sink** buffers it and eventually writes a Parquet file to MinIO

---

## 7. Walkthrough: Querying Logs

### Option A: Using the UI

1. Open **http://localhost:3001**
2. Click **View Logs** in the sidebar
3. The log viewer table displays the most recent events, sorted by timestamp (newest first)
4. Use the **Action**, **User ID**, **From**, and **To** date filters to narrow results, then click **Search**

### Option B: Using curl

```bash
# Get the 50 most recent logs
curl http://localhost:8080/api/logs

# Paginate: get 10 logs, skip the first 20
curl "http://localhost:8080/api/logs?size=10&from=20"

# Filter by action
curl "http://localhost:8080/api/logs?action=UPDATE"

# Filter by user ID
curl "http://localhost:8080/api/logs?user_id=EMP-001"

# Filter by date range (ISO 8601)
curl "http://localhost:8080/api/logs?date_from=2026-02-01T00:00:00Z&date_to=2026-02-22T23:59:59Z"

# Combine filters
curl "http://localhost:8080/api/logs?action=UPDATE&date_from=2026-02-22T00:00:00Z"
```

**Response (200 OK):**

```json
{
  "total": 42,
  "logs": [
    {
      "timestamp": "2026-02-22T10:30:00Z",
      "log_id": "019...",
      "actor": { "user_id": "EMP-001", "role": "ADMIN", ... },
      "event": { "action": "UPDATE", "module": "credit-management", "outcome": "SUCCESS" },
      "target": { "resource_type": "credit_limit", "resource_id": "CL-2026-0001" },
      "changes": { "field": "credit_limit", "old_value": 50000, "new_value": 100000 }
    }
  ]
}
```

> **Note:** Logs appear in Elasticsearch within a few seconds of being produced to Kafka, depending on the Connect batch interval.

### Option C: Query Elasticsearch directly

```bash
curl "http://localhost:9200/audit-log-*/_search?pretty" \
  -H "Content-Type: application/json" \
  -d '{"query": {"match_all": {}}, "size": 5, "sort": [{"timestamp": "desc"}]}'
```

---

## 8. Walkthrough: Checking Pipeline Status

### Option A: Using the UI

1. Open **http://localhost:3001**
2. Click **Status** in the sidebar
3. View connector health (RUNNING / FAILED / PAUSED) and DLQ message counts

### Option B: Using the API

```bash
# Connector statuses
curl http://localhost:8080/api/connectors

# Dead-letter queue counts
curl http://localhost:8080/api/dlq
```

### Option C: Kafka Connect REST API directly

```bash
# List all connectors
curl http://localhost:8083/connectors

# Check ES Sink status
curl http://localhost:8083/connectors/audit-log-es-sink/status

# Check S3 Sink status
curl http://localhost:8083/connectors/audit-log-s3-sink/status
```

---

## 9. Understanding the Components

### 9.1 Producer API (Go)

**Location:** `apps/producer/`

The Producer API is a Go HTTP server built with the [Gin](https://github.com/gin-gonic/gin) framework. It follows a clean architecture pattern:

```
apps/producer/
├── main.go                           # Entry point — wires dependencies
└── internal/
    ├── domain/
    │   ├── entity.go                 # Core types: AuditEvent, Actor, Event, Target, etc.
    │   └── repository.go            # Interface definitions
    ├── repository/
    │   ├── kafka_producer.go         # Kafka producer (Avro serialization)
    │   ├── es_client.go              # Elasticsearch query client
    │   └── connect_client.go         # Kafka Connect REST client
    ├── usecase/
    │   └── audit_usecase.go          # Business logic (validate, enrich, produce)
    └── delivery/http/
        ├── router.go                 # Route definitions + CORS middleware
        └── audit_handler.go          # HTTP handlers for all endpoints
```

**Key behavior:**

- Auto-generates `log_id` (UUID v7) and `timestamp` for every event
- Serializes events to Avro via Schema Registry before producing to Kafka
- Produces with `acks=all` and `enable.idempotence=true` for guaranteed delivery
- Uses LZ4 compression for Kafka messages
- Queries Elasticsearch for the `/api/logs` endpoint
- Proxies connector status and DLQ counts via Kafka AdminClient

### 9.2 UI (Next.js)

**Location:** `apps/ui/`

A Next.js 14 application with Tailwind CSS providing three main pages:

| Page       | URL       | Description                                                                           |
| ---------- | --------- | ------------------------------------------------------------------------------------- |
| Dashboard  | `/`       | Overview stats, recent events feed (polls every 5s)                                   |
| Send Event | `/send`   | Form to compose and send audit events                                                 |
| View Logs  | `/logs`   | Table of audit logs from Elasticsearch; filter by action, user ID, and **date range** |
| Status     | `/status` | Connector health and DLQ counts                                                       |

**Key files:**

- `src/lib/api.ts` — HTTP client functions for communicating with the Go API
- `src/lib/types.ts` — TypeScript type definitions matching the Go domain entities
- `src/lib/presets.ts` — Pre-built event templates for quick testing
- `src/components/sidebar.tsx` — Navigation sidebar

The dashboard auto-polls every 5 seconds for live updates.

### 9.3 Kafka & Schema Registry

**Kafka** runs in KRaft mode (no ZooKeeper) as a single broker.

| Setting       | Value               |
| ------------- | ------------------- |
| Mode          | KRaft (single-node) |
| External port | 9092                |
| Internal port | 29092               |
| Topics        | 3 (see below)       |

**Topics:**

| Topic              | Partitions | Description               |
| ------------------ | ---------- | ------------------------- |
| `audit-log`        | 3          | Main audit event stream   |
| `audit-log-dlq`    | 1          | Dead letters from ES Sink |
| `audit-log-s3-dlq` | 1          | Dead letters from S3 Sink |

**Schema Registry** (port 8081) stores the Avro schema for `AuditEvent`. The schema is automatically registered by `make init` (step 2) using the definition at `infra/schema-registry/audit-log-value.json`. The schema defines the full structure:

- `timestamp` (string) — ISO 8601
- `log_id` (string) — UUID v7
- `actor` — `user_id`, `role`, `ip_address`, `user_agent`
- `event` — `action`, `module`, `outcome`
- `target` — `resource_type`, `resource_id`
- `changes` (optional) — `field`, `old_value`, `new_value`
- `payload` (optional) — same structure as changes
- `metadata` (optional) — `correlation_id`, `service_name`

### 9.4 Kafka Connect (Consumer)

**Location:** `consumer/`

Kafka Connect runs two sink connectors that consume from the `audit-log` topic:

#### Elasticsearch Sink (`audit-log-es-sink`)

- Config: `consumer/connectors/es-sink.json`
- Writes to monthly indices: `audit-log-YYYY.MM`
- Uses `upsert` write method with UUID v7 as `_id` (idempotent)
- Batches 100 records at a time
- Failed records go to `audit-log-dlq`

#### S3 Sink (`audit-log-s3-sink`)

- Config: `consumer/connectors/s3-sink.json`
- Writes Parquet files (Snappy compression) to MinIO
- Partitioned by time: `topics/audit-log/year=YYYY/month=MM/day=dd/`
- Flushes every 1000 records or 1 hour
- Failed records go to `audit-log-s3-dlq`

### 9.5 Elasticsearch

Single-node Elasticsearch 8.15 with security disabled (local dev only).

- Port: **9200**
- Heap: 1 GB
- Index pattern: `audit-log-*` (monthly rotation via TimestampRouter transform)

### 9.6 MinIO (S3-compatible storage)

MinIO provides S3-compatible object storage for Parquet archives.

- API Port: **9000**
- Console UI: **http://localhost:9001** (login: `minioadmin` / `minioadmin`)
- Bucket: `audit-log-archive` (auto-created by the `minio-init` container)

To browse archived Parquet files, open the MinIO Console and navigate to the `audit-log-archive` bucket.

### 9.7 Monitoring (Prometheus & Grafana)

- **Prometheus:** http://localhost:9090 — Scrapes metrics from:
  - Kafka (JMX Exporter :7071)
  - Kafka Connect (JMX Exporter :7072)
  - **Elasticsearch Exporter** (:9114) — exposes ES cluster health, index sizes, query rates, and shard stats in Prometheus format
- **Grafana:** http://localhost:3000 — Pre-provisioned with Prometheus as a datasource
- **Elasticsearch Exporter:** http://localhost:9114/metrics — Raw Prometheus metrics from Elasticsearch

---

## 10. Data Flow — End to End

Here's what happens from the moment you click "Send" to seeing the log in the viewer:

```
1. USER clicks Send (or curl POST)
         │
         ▼
2. Next.js UI → POST /api/audit/update → Go Producer API (:8080)
         │
         ▼
3. Go API validates fields, generates log_id (UUID v7) + timestamp
         │
         ▼
4. Go API serializes event to Avro (schema `audit-log-value` was pre-registered in Schema Registry by `make init`)
         │
         ▼
5. Go API produces message to Kafka topic "audit-log" (acks=all, idempotent)
         │
         ▼
6. Kafka returns offset → API responds 201 { log_id, offset }
         │
         ▼
7. Kafka Connect ES Sink consumes message
   ├─ Batches up to 100 records
   ├─ Upserts to Elasticsearch index "audit-log-2026.02"
   └─ On failure → routes to "audit-log-dlq"
         │
         ▼
8. Kafka Connect S3 Sink consumes message
   ├─ Buffers up to 1000 records or 1 hour
   ├─ Writes Parquet file to MinIO: audit-log-archive/topics/audit-log/year=2026/month=02/day=22/
   └─ On failure → routes to "audit-log-s3-dlq"
         │
         ▼
9. User opens /logs → GET /api/logs → Go API queries Elasticsearch → Returns results
```

**Latency expectations (local dev):**

- Steps 1–6: ~50–200ms (API round-trip + Kafka produce)
- Step 7: ~1–5 seconds (Connect poll interval + ES write)
- Step 8: Parquet flush may take up to 1 hour (or 1000 records, whichever comes first)

---

## 11. API Reference

Base URL: `http://localhost:8080`

### Health

| Method | Path      | Description  |
| ------ | --------- | ------------ |
| GET    | `/health` | Health check |

### Audit Events

| Method | Path                | Description                                    |
| ------ | ------------------- | ---------------------------------------------- |
| POST   | `/api/audit`        | Send a generic audit event                     |
| POST   | `/api/audit/create` | Send a CREATE event (action auto-set)          |
| POST   | `/api/audit/update` | Send an UPDATE event (action auto-set)         |
| POST   | `/api/audit/delete` | Send a DELETE event (action auto-set)          |
| POST   | `/api/audit/access` | Send an ACCESS event (action auto-set)         |
| POST   | `/api/audit/auth`   | Send an AUTHENTICATION event (action auto-set) |

**Request Body (all audit endpoints):**

```json
{
  "actor": {
    "user_id": "string (required)",
    "role": "string (required)",
    "ip_address": "string (optional)",
    "user_agent": "string (optional)"
  },
  "event": {
    "action": "string (required for /api/audit, auto-set for typed endpoints)",
    "module": "string (optional)",
    "outcome": "string (required — SUCCESS / FAILURE)"
  },
  "target": {
    "resource_type": "string (required)",
    "resource_id": "string (required)"
  },
  "changes": {
    "field": "string (optional)",
    "old_value": "any (optional)",
    "new_value": "any (optional)"
  },
  "metadata": {
    "correlation_id": "string (optional)",
    "service_name": "string (optional)"
  }
}
```

### Query

| Method | Path        | Query Params                                                | Description                   |
| ------ | ----------- | ----------------------------------------------------------- | ----------------------------- |
| GET    | `/api/logs` | `size`, `from`, `action`, `user_id`, `date_from`, `date_to` | Query logs from Elasticsearch |

### System

| Method | Path              | Description                    |
| ------ | ----------------- | ------------------------------ |
| GET    | `/api/connectors` | Kafka Connect connector status |
| GET    | `/api/dlq`        | DLQ message counts             |

---

## 12. Event Presets

The project includes sample event presets for quick testing:

| Preset              | File                                  | Action         |
| ------------------- | ------------------------------------- | -------------- |
| Update Credit Limit | `scripts/presets/update-credit.json`  | UPDATE         |
| Create User         | `scripts/presets/create-user.json`    | CREATE         |
| Delete Account      | `scripts/presets/delete-account.json` | DELETE         |
| Access Record       | `scripts/presets/access-record.json`  | ACCESS         |
| Login               | `scripts/presets/login.json`          | AUTHENTICATION |

Use them with curl:

```bash
curl -X POST http://localhost:8080/api/audit \
  -H "Content-Type: application/json" \
  -d @scripts/presets/update-credit.json
```

These same presets are also available in the UI Send Event page as dropdown options.

---

## 13. Load Testing

The built-in load test script sends concurrent events to the API:

```bash
# Default: 100 events, 10 concurrent
make load-test

# Custom: 500 events, 20 concurrent
make load-test COUNT=500 CONCURRENCY=20

# Stress test: 5000 events, 50 concurrent
make load-test COUNT=5000 CONCURRENCY=50
```

The script uses Apache Benchmark (`ab`) if installed, otherwise falls back to parallel curl requests.

After a load test, check the pipeline:

```bash
# Verify events reached Elasticsearch
curl "http://localhost:9200/audit-log-*/_count" | jq

# Check for DLQ messages
curl http://localhost:8080/api/dlq

# Browse Parquet archives in MinIO Console
open http://localhost:9001
```

---

## 14. Docker Compose Profiles

The project uses Docker Compose profiles to control which services start:

| Profile    | Services                                            | Use Case                 |
| ---------- | --------------------------------------------------- | ------------------------ |
| `infra`    | Kafka, Schema Registry, Elasticsearch, MinIO        | Always needed            |
| `consumer` | Kafka Connect (ES Sink + S3 Sink)                   | Needed for data flow     |
| `apps`     | Producer API, UI                                    | Can run locally instead  |
| `monitor`  | Prometheus, Grafana, Elasticsearch Exporter (:9114) | Optional — observability |

**Common commands:**

```bash
# Infrastructure only (for local app development)
make infra

# Infra + consumer (run apps locally)
docker compose --profile infra --profile consumer up -d

# Everything
make start

# View logs for a specific service
docker compose logs -f kafka-connect

# Restart a service
docker compose --profile apps restart producer-api
```

---

## 15. Troubleshooting

### Kafka Connect connectors not starting

```bash
# Check connector status
curl http://localhost:8083/connectors/audit-log-es-sink/status | jq

# Re-deploy a connector
curl -X DELETE http://localhost:8083/connectors/audit-log-es-sink
curl -X POST -H "Content-Type: application/json" \
  --data @consumer/connectors/es-sink.json \
  http://localhost:8083/connectors
```

### Logs not appearing in Elasticsearch

1. Verify events reach Kafka:
   ```bash
   docker exec al-kafka kafka-console-consumer \
     --bootstrap-server localhost:9092 \
     --topic audit-log \
     --from-beginning \
     --max-messages 5
   ```
2. Check Kafka Connect logs:
   ```bash
   docker compose logs -f kafka-connect
   ```
3. Check DLQ for failed messages:
   ```bash
   curl http://localhost:8080/api/dlq
   ```

### Elasticsearch is not reachable

```bash
# Check if ES is healthy
curl http://localhost:9200/_cluster/health?pretty

# Check container status
docker ps | grep elasticsearch
docker compose logs elasticsearch
```

### Schema Registry errors

```bash
# List registered schemas
curl http://localhost:8081/subjects

# Check if audit-log schema exists
curl http://localhost:8081/subjects/audit-log-value/versions
```

### Services running out of memory

Each service has memory limits configured in `docker-compose.yml` per the resource budget (total ≤ 6 GB):

| Service         | Limit |
| --------------- | ----- |
| Kafka           | 768m  |
| Schema Registry | 512m  |
| Kafka Connect   | 768m  |
| Elasticsearch   | 1536m |
| MinIO           | 512m  |
| Producer API    | 128m  |
| UI              | 384m  |
| Prometheus      | 256m  |
| Grafana         | 256m  |
| ES Exporter     | 128m  |

If the stack still struggles, remove the `monitor` profile first (saves ~640 MB), or lower Elasticsearch heap in `docker-compose.yml`: change `-Xms1g -Xmx1g` to `-Xms512m -Xmx512m`.

### Port conflicts

Default ports used by the project:

| Port | Service         |
| ---- | --------------- |
| 3000 | Grafana         |
| 3001 | Next.js UI      |
| 8080 | Producer API    |
| 8081 | Schema Registry |
| 8083 | Kafka Connect   |
| 9000 | MinIO API       |
| 9001 | MinIO Console   |
| 9090 | Prometheus      |
| 9092 | Kafka           |
| 9114 | ES Exporter     |
| 9200 | Elasticsearch   |

If any port is already in use, stop the conflicting process or update the port mapping in `docker-compose.yml`.

---

## 16. Cleanup

### Stop all services (keep data)

```bash
make down
```

### Stop and remove all data

```bash
make clean
```

This removes all Docker volumes including Kafka data, Elasticsearch indices, MinIO objects, and Grafana/Prometheus data.

---

## Service URLs Quick Reference

| Service               | URL                                             |
| --------------------- | ----------------------------------------------- |
| UI Dashboard          | http://localhost:3001                           |
| Producer API          | http://localhost:8080                           |
| Elasticsearch         | http://localhost:9200                           |
| Kafka Connect         | http://localhost:8083                           |
| Schema Registry       | http://localhost:8081                           |
| MinIO Console         | http://localhost:9001 (minioadmin / minioadmin) |
| Prometheus            | http://localhost:9090                           |
| Grafana               | http://localhost:3000                           |
| ES Exporter (metrics) | http://localhost:9114/metrics                   |
