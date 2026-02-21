#!/bin/bash
echo "Starting All Profiles (Infra, Consumer, Apps, Monitor)"
docker compose --profile infra --profile consumer --profile apps --profile monitor up -d
echo "All containers are starting in detached mode."
