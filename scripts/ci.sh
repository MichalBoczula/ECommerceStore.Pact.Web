#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

case "${1:?Usage: scripts/ci.sh source|contract|audit|build|unit|smoke|registry|container}" in
  source)
    git diff --check
    for script in scripts/*.sh; do bash -n "$script"; done
    node --check eslint.config.js
    node --check proxy.conf.cjs
    for script in scripts/*.mjs; do node --check "$script"; done
    python3 -B scripts/test-image-metadata.py
    node scripts/check-api-contract.mjs
    ;;
  contract) npm run api:check ;;
  audit) npm audit --audit-level=high ;;
  build)
    npm run lint
    npm run build -- --configuration production
    ;;
  unit) npm run test:coverage ;;
  smoke) npm run test:smoke ;;
  registry) npm run test:registry ;;
  container)
    if [[ "${PACT_WEB_IMAGE_PREBUILT:-false}" != true ]]; then
      docker build --platform linux/amd64 --tag ecommerce-store-pact-web:ci \
        --label org.opencontainers.image.source=https://github.com/MichalBoczula/ECommerceStore.Pact.Web \
        --label "org.opencontainers.image.revision=$(git rev-parse HEAD)" .
    fi
    bash scripts/smoke-image.sh ecommerce-store-pact-web:ci
    ;;
  *) echo 'Unknown verification stage.' >&2; exit 2 ;;
esac
