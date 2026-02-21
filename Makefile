.PHONY: help pull start infra consumer apps monitor init down clean dev-api dev-ui load-test

# Default target
help:
	@echo ""
	@echo "Simple Audit Log — Make Targets"
	@echo "================================"
	@echo ""
	@echo "  Setup"
	@echo "    make pull          Pull all Docker images"
	@echo ""
	@echo "  Start"
	@echo "    make start         Start all services (infra + consumer + apps + monitor)"
	@echo "    make infra         Start infrastructure only (Kafka, ES, MinIO, Schema Registry)"
	@echo "    make consumer      Start Kafka Connect consumers"
	@echo "    make apps          Start Producer API and UI"
	@echo "    make monitor       Start Prometheus and Grafana"
	@echo ""
	@echo "  Init"
	@echo "    make init          Create Kafka topics and deploy Kafka Connect connectors"
	@echo ""
	@echo "  Dev (local, no Docker)"
	@echo "    make dev-api       Run Go Producer API locally"
	@echo "    make dev-ui        Run Next.js UI locally"
	@echo ""
	@echo "  Load Testing"
	@echo "    make load-test                          Run load test (default: 100 events, 10 concurrent)"
	@echo "    make load-test COUNT=500 CONCURRENCY=20 Run with custom settings"
	@echo ""
	@echo "  Stop"
	@echo "    make down          Stop all services (keep volumes)"
	@echo "    make clean         Stop all services and remove volumes"
	@echo ""

# ── Docker ───────────────────────────────────────────────────────────────────

pull:
	docker compose --profile infra --profile consumer --profile apps --profile monitor pull

start:
	./scripts/start-all.sh

infra:
	./scripts/start-infra.sh

consumer:
	docker compose --profile consumer up -d

apps:
	docker compose --profile apps up -d

monitor:
	docker compose --profile monitor up -d

# ── Initialization ────────────────────────────────────────────────────────────

init:
	./scripts/init.sh

# ── Local Development ─────────────────────────────────────────────────────────

dev-api:
	cd apps/producer && go run main.go

dev-ui:
	cd apps/ui && npm run dev

# ── Load Testing ──────────────────────────────────────────────────────────────

COUNT       ?= 100
CONCURRENCY ?= 10

load-test:
	./scripts/load-test.sh $(COUNT) $(CONCURRENCY)

# ── Teardown ──────────────────────────────────────────────────────────────────

down:
	docker compose --profile infra --profile consumer --profile apps --profile monitor down

clean:
	docker compose --profile infra --profile consumer --profile apps --profile monitor down -v
