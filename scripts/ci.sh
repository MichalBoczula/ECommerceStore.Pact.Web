#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

case "${1:?Usage: scripts/ci.sh source|audit|build|unit|smoke}" in
  source)
    git diff --check
    for script in scripts/*.sh; do bash -n "$script"; done
    node --check eslint.config.js
    ;;
  audit) npm audit --audit-level=high ;;
  build)
    npm run lint
    npm run build -- --configuration production
    ;;
  unit) npm run test:coverage ;;
  smoke) npm run test:smoke ;;
  *) echo 'Unknown verification stage.' >&2; exit 2 ;;
esac
