#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
image="${1:?Usage: scripts/smoke-image.sh IMAGE}"
stack="pact-web-smoke-${GITHUB_RUN_ID:-local}-$$"
web="$stack-web"
upstream="$stack-api"
invalid="$stack-invalid"
mkdir -p TestResults/container
cleanup() {
  local result=$?
  docker logs "$web" > TestResults/container/nginx.log 2>&1 || true
  docker logs "$upstream" > TestResults/container/upstream.log 2>&1 || true
  docker rm -f "$web" "$upstream" "$invalid" >/dev/null 2>&1 || true
  docker network rm "$stack" >/dev/null 2>&1 || true
  return "$result"
}
trap cleanup EXIT

docker network create "$stack" >/dev/null
docker run -d --name "$upstream" --network "$stack" --network-alias registry \
  --mount "type=bind,src=$PWD/scripts/image-smoke-upstream.mjs,dst=/smoke.mjs,readonly" \
  node:22-alpine node /smoke.mjs >/dev/null
docker run -d --name "$web" --network "$stack" -p 127.0.0.1::8080 \
  --read-only --tmpfs /tmp:rw,nosuid,noexec,size=32m --cap-drop ALL --security-opt no-new-privileges \
  -e PACT_API_URL=http://registry:8080 "$image" >/dev/null
address=$(docker port "$web" 8080/tcp)
base="http://$address"
curl --fail --silent --show-error --retry 30 --retry-delay 1 --retry-all-errors \
  --retry-max-time 60 --max-time 3 "$base/health/ready" > TestResults/container/ready.txt
test "$(docker exec "$web" id -u)" -gt 0
docker exec "$web" nginx -t
curl --fail --silent --show-error --retry 15 --retry-delay 1 --retry-all-errors \
  --retry-max-time 30 --max-time 3 "$base/backend/api/ready" > /dev/null
python3 scripts/check-image-http.py --url "$base"

for origin in '' 'https://user:password@registry' 'https://registry/api' 'https://registry:99999' $'https://registry\ninjected'; do
  if timeout 10s docker run --rm --name "$invalid" --network none -e "PACT_API_URL=$origin" "$image" > TestResults/container/invalid-origin.log 2>&1; then
    echo 'Unsafe/absent API origin was accepted' >&2; exit 1
  else
    result=$?
    # A timeout, daemon error or Nginx DNS failure must not masquerade as validation.
    test "$result" -eq 1
    grep -Eq 'PACT_API_URL must be|Set the server-side Pact API origin' TestResults/container/invalid-origin.log
  fi
done
docker stop "$upstream" >/dev/null
python3 scripts/check-image-http.py --url "$base" --unavailable
echo 'Production image passed non-root/read-only startup, origin validation, SPA and anonymous proxy checks.'
