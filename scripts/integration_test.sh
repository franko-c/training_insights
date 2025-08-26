#!/usr/bin/env bash
set -euo pipefail

if [ -z "${TEST_RIDER_ID:-}" ]; then
  echo "TEST_RIDER_ID not set, exiting"
  exit 0
fi

echo "Running integration test for rider ${TEST_RIDER_ID}"
python -m zwift_api_client.utils.data_manager_cli --refresh-rider "${TEST_RIDER_ID}" --yes

DATA_DIR="zwift_api_client/data/riders/${TEST_RIDER_ID}"
if [ ! -d "$DATA_DIR" ]; then
  echo "Expected data dir $DATA_DIR not found"
  exit 2
fi

json_count=$(ls "$DATA_DIR"/*.json 2>/dev/null | wc -l || true)
if [ "$json_count" -lt 1 ]; then
  echo "No JSON files produced for rider ${TEST_RIDER_ID}"
  ls -la "$DATA_DIR" || true
  exit 3
fi

echo "Integration test passed: $json_count JSON files produced for ${TEST_RIDER_ID}"
