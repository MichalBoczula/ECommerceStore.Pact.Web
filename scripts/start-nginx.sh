#!/usr/bin/env sh
set -eu

invalid_url() { echo 'PACT_API_URL must be an http(s) origin with a DNS/IPv4 host and optional port, without path, credentials or query.' >&2; exit 1; }
if [ -z "${PACT_API_URL:-}" ]; then
    echo 'Set the server-side Pact API origin with PACT_API_URL, e.g. https://pact.example.com' >&2
    exit 1
fi
# Reject every character outside the origin grammar, including line breaks, before envsubst.
case "$PACT_API_URL" in *[!a-zA-Z0-9:./-]*) invalid_url ;; esac
printf '%s\n' "$PACT_API_URL" | grep -Eq '^https?://([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)*[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(:[1-9][0-9]{0,4})?$' || invalid_url
authority=${PACT_API_URL#*://}
case "$authority" in *:*) test "${authority##*:}" -le 65535 || invalid_url ;; esac
test -s /usr/share/nginx/html/index.html
# Substitute this variable only. Nginx variables ($uri, $proxy_host, etc.) stay intact.
envsubst '${PACT_API_URL}' < /etc/nginx/pact-server.conf.template > /tmp/pact-web-server.conf
exec nginx -g 'daemon off;'
