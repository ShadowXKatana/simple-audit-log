#!/bin/bash
echo "Starting Infrastructure Only (Infra)"
docker compose --profile infra up -d
echo "Infrastructure containers are starting in detached mode."
