#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

version=1.34.1
archive_sha256=682416ab85c07bb3152e4c2c54293ae51f582aebde381699d8999f7b076755dd
if [[ -n "${KIOTA_BIN:-}" ]]; then
  kiota_bin="$KIOTA_BIN"
else
  tool_dir="$PWD/.tools/kiota/$version"
  kiota_bin="$tool_dir/kiota"
  if [[ ! -x "$kiota_bin" ]]; then
    mkdir -p "$tool_dir"
    archive="$(mktemp)"
    trap 'rm -f "$archive"' EXIT
    curl --fail --location --retry 3 --silent --show-error \
      "https://github.com/microsoft/kiota/releases/download/v$version/linux-x64.zip" --output "$archive"
    printf '%s  %s\n' "$archive_sha256" "$archive" | sha256sum --check --status
    unzip -q -o "$archive" kiota appsettings.json -d "$tool_dir"
    chmod +x "$kiota_bin"
  fi
fi
reported_version="$("$kiota_bin" --version)"
if [[ "${reported_version%%+*}" != "$version" ]]; then
  echo "Kiota $version is required." >&2
  exit 1
fi
node scripts/check-api-contract.mjs
output=src/app/shared/infrastructure/api-clients/pact
"$kiota_bin" generate --openapi contracts/upstream/pact.openapi.json \
  --language TypeScript --class-name PactApiClient --namespace-name ApiSdk \
  --output "$output" --include-path '/api/**#GET' --additional-data --clean-output --log-level Error
rm -f "$output/.kiota.log"
# Kiota emits trailing spaces. Mechanical whitespace normalization is part of generation.
node scripts/normalize-generated-client.mjs
