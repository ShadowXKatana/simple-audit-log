#!/bin/bash

# Configuration
API_URL="http://localhost:8080/api/audit"
COUNT=${1:-100} # Default 100
CONCURRENCY=${2:-10} # Default 10

echo "🚀 Starting Load Test..."
echo "- Target: $API_URL"
echo "- Total Events: $COUNT"
echo "- Concurrency: $CONCURRENCY"

# Mock event data
EVENT_DATA='{
  "actor": {
    "user_id": "LOAD-TESTER",
    "role": "SYSTEM",
    "ip_address": "127.0.0.1",
    "user_agent": "load-test-script"
  },
  "event": {
    "action": "ACCESS",
    "module": "system",
    "outcome": "SUCCESS"
  },
  "target": {
    "resource_type": "system",
    "resource_id": "test-data-generation"
  }
}'

# Create a temporary file with the payload
echo "$EVENT_DATA" > /tmp/test-event.json

# Use wrk or ab if available, otherwise fallback to simple curl loop in background
if command -v ab &> /dev/null; then
    echo "Using Apache Benchmark (ab)..."
    ab -n $COUNT -c $CONCURRENCY -p /tmp/test-event.json -T "application/json" $API_URL
else
    echo "Apache Benchmark (ab) not found. Falling back to bash loop (slower)..."
    seq 1 $COUNT | xargs -P $CONCURRENCY -I {} curl -s -X POST -H 'Content-Type: application/json' -d @/tmp/test-event.json $API_URL > /dev/null
    echo "Done sending events via bash loop."
fi

# Cleanup
rm /tmp/test-event.json

echo "✅ Load test complete."
