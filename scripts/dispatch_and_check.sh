#!/usr/bin/env bash
set -euo pipefail
trap 'echo "Aborted."; exit 1' ERR SIGINT SIGTERM

# Usage: ./scripts/dispatch_and_check.sh [RIDER_ID]
RID=${1:-424242}
TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")
TMPDIR="/tmp/ti_dispatch_${RID}_${TIMESTAMP}"
mkdir -p "$TMPDIR"

RAILWAY_URL="https://zwiftervals-production.up.railway.app/dispatch-workflow/${RID}"
DISPATCH_OUT="$TMPDIR/railway_dispatch_${RID}.json"
RUNS_OUT="$TMPDIR/runs_${RID}.json"

echo "1) dispatching CI workflow for rider ${RID} via Railway"
# use short timeout, save http code separately
if ! curl --fail --show-error --silent -X POST "$RAILWAY_URL" -H 'Content-Type: application/json' -o "$DISPATCH_OUT" -w "%{http_code}" --max-time 30 >"$TMPDIR/dispatch_http_code"; then
  echo "dispatch: curl returned non-zero (see $DISPATCH_OUT or $TMPDIR/dispatch_http_code)"
else
  echo "dispatch: HTTP $(cat "$TMPDIR/dispatch_http_code") -> $DISPATCH_OUT"
fi

sleep 1

echo "2) fetching recent workflow runs for branch ci/debug-workflow-push"
URL="https://api.github.com/repos/franko-c/training_insights/actions/workflows/generate-rider-data.yml/runs?branch=ci/debug-workflow-push&per_page=5"

if [ -n "${GITHUB_TOKEN-}" ]; then
  echo "Using GITHUB_TOKEN for authenticated request"
  if ! curl --fail --show-error --silent -H "Authorization: token $GITHUB_TOKEN" "$URL" -o "$RUNS_OUT" --max-time 30; then
    echo "fetch runs: curl failed (see $RUNS_OUT)"
  else
    echo "fetch runs: saved to $RUNS_OUT"
  fi
else
  if ! curl --fail --show-error --silent "$URL" -o "$RUNS_OUT" --max-time 30; then
    echo "fetch runs: curl failed (see $RUNS_OUT)"
  else
    echo "fetch runs: saved to $RUNS_OUT"
  fi
fi

# show small heads
echo "--- head $DISPATCH_OUT ---"
head -n 200 "$DISPATCH_OUT" || true
echo "--- end ---"

echo "--- head $RUNS_OUT ---"
head -n 200 "$RUNS_OUT" || true
echo "--- end ---"

# try to print a compact summary of the most recent run
if command -v jq >/dev/null 2>&1; then
  echo "recent run (jq):"
  jq '.workflow_runs[0] | {id,html_url,status,conclusion,head_branch,created_at}' "$RUNS_OUT" || true
else
  echo "recent run (python):"
  python3 - <<PY || true
import json
p = "$RUNS_OUT"
try:
    data = json.load(open(p))
    runs = data.get('workflow_runs', [])
    if not runs:
        print('no workflow_runs found')
    else:
        r = runs[0]
        print(json.dumps({k: r.get(k) for k in ('id','html_url','status','conclusion','head_branch','created_at')}, indent=2))
except Exception as e:
    print('failed to parse runs file:', e)
PY
fi

echo "Logs and JSON saved in $TMPDIR"

exit 0
