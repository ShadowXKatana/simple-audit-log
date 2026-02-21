# Simple Audit Log

A centralized audit logging system built with **Go** (Producer API), **Next.js** (UI), **Kafka**, **Elasticsearch**, **MinIO**, and **Kafka Connect**.

```
Next.js UI (:3001) ──► Go Producer API (:8080) ──► Kafka (:9092)
                              │                         │
                              │ query                   │ consume
                              ▼                         ▼
                        Elasticsearch ◄──── Kafka Connect ────► MinIO
                          (:9200)             (:8083)          (:9000)
```

---

## Prerequisites

- **Docker** & **Docker Compose**
- **Go** 1.22+ (for local producer dev)
- **Node.js** 20+ & **npm** (for local UI dev)

---

## Project Structure

| Component      | Path             | Description                                              |
| -------------- | ---------------- | -------------------------------------------------------- |
| Producer API   | `apps/producer/` | Go HTTP API — produces audit events to Kafka             |
| UI             | `apps/ui/`       | Next.js dashboard — send events, view logs, check status |
| Consumer       | `consumer/`      | Kafka Connect sink connectors (Elasticsearch + S3/MinIO) |
| Infrastructure | `infra/`         | Config for Kafka, Elasticsearch, MinIO, Schema Registry  |
| Monitoring     | `monitor/`       | Prometheus & Grafana config                              |
| Scripts        | `scripts/`       | Helper scripts for init, start, and load testing         |

---

## Setup

### Environment Variables

Copy the template and adjust values if needed:

```bash
cp .env.template .env
```

Default `.env.template` values:

```dotenv
# Kafka
KAFKA_BROKER=kafka:29092
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

> **Tip:** For local dev (without Docker), override broker/service URLs to `localhost`:
>
> ```dotenv
> KAFKA_BROKER=localhost:9092
> ES_URL=http://localhost:9200
> CONNECT_URL=http://localhost:8083
> ```

### Producer API (Go)

```bash
cd apps/producer
go mod download
```

### UI (Next.js)

```bash
cd apps/ui
npm install
```

### Infrastructure (Docker)

Pull all required Docker images:

```bash
docker compose --profile infra --profile consumer --profile apps --profile monitor pull
```

---

## 1. Run Each Part in Dev Mode

> **Note:** Infrastructure services (Kafka, Elasticsearch, etc.) must be running first. Start them with:
>
> ```bash
> docker compose --profile infra up -d
> ```
>
> Then initialize topics and connectors:
>
> ```bash
> ./scripts/init.sh
> ```

### Producer API (Go)

```bash
cd apps/producer
go run main.go
```

The API starts on **http://localhost:8080** by default.

Environment variables (with defaults):

| Variable       | Default                 |
| -------------- | ----------------------- |
| `KAFKA_BROKER` | `localhost:9092`        |
| `KAFKA_TOPIC`  | `audit-log`             |
| `ES_URL`       | `http://localhost:9200` |
| `CONNECT_URL`  | `http://localhost:8083` |
| `API_PORT`     | `8080`                  |

### UI (Next.js)

```bash
cd apps/ui
npm install
npm run dev
```

The UI starts on **http://localhost:3001**.

Environment variables:

| Variable              | Default                 |
| --------------------- | ----------------------- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080` |

---

## 2. Run Each Part with Docker

> Infrastructure must be running first:
>
> ```bash
> docker compose --profile infra up -d
> ```

### Producer API

```bash
docker compose --profile apps up -d producer-api
```

Or build and run manually:

```bash
cd apps/producer
docker build -t audit-producer-api .
docker run -p 8080:8080 \
  -e KAFKA_BROKER=host.docker.internal:9092 \
  -e ES_URL=http://host.docker.internal:9200 \
  -e CONNECT_URL=http://host.docker.internal:8083 \
  audit-producer-api
```

### UI

```bash
docker compose --profile apps up -d ui
```

Or build and run manually:

```bash
cd apps/ui
docker build -t audit-ui .
docker run -p 3001:3000 \
  -e NEXT_PUBLIC_API_URL=http://localhost:8080 \
  audit-ui
```

### Consumer (Kafka Connect)

```bash
docker compose --profile consumer up -d
```

---

## 3. Run Everything with Docker

Start all services at once:

```bash
docker compose --profile infra --profile consumer --profile apps --profile monitor up -d
```

Or use the helper script:

```bash
./scripts/start-all.sh
```

Then initialize Kafka topics and deploy connectors:

```bash
./scripts/init.sh
```

### Docker Compose Profiles

| Profile    | Services                                     |
| ---------- | -------------------------------------------- |
| `infra`    | Kafka, Schema Registry, Elasticsearch, MinIO |
| `consumer` | Kafka Connect (ES Sink + S3 Sink)            |
| `apps`     | Producer API, UI                             |
| `monitor`  | Prometheus, Grafana                          |

### Stop Everything

```bash
docker compose --profile infra --profile consumer --profile apps --profile monitor down
```

To also remove volumes:

```bash
docker compose --profile infra --profile consumer --profile apps --profile monitor down -v
```

---

## Service URLs

| Service         | URL                                             |
| --------------- | ----------------------------------------------- |
| UI              | http://localhost:3001                           |
| Producer API    | http://localhost:8080                           |
| Elasticsearch   | http://localhost:9200                           |
| Kafka Connect   | http://localhost:8083                           |
| Schema Registry | http://localhost:8081                           |
| MinIO Console   | http://localhost:9001 (minioadmin / minioadmin) |
| Prometheus      | http://localhost:9090                           |
| Grafana         | http://localhost:3000                           |

---

## Load Testing

```bash
./scripts/load-test.sh [count] [concurrency]
# Example: send 500 events with 20 concurrent requests
./scripts/load-test.sh 500 20
```
