#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
for stage in source audit build unit smoke; do
  bash scripts/ci.sh "$stage"
done
