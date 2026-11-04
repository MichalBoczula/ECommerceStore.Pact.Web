"""Probe the actual Nginx image over HTTP; fixtures establish transport behavior only."""
import argparse
import json
from pathlib import Path
import re
from urllib.error import HTTPError
from urllib.request import HTTPRedirectHandler, Request, build_opener

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--url", required=True)
parser.add_argument("--unavailable", action="store_true")
args = parser.parse_args()
checks = []


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


opener = build_opener(NoRedirect())


def call(path, method="GET", headers=None):
    try:
        response = opener.open(Request(args.url + path, method=method, headers=headers or {}), timeout=15)
    except HTTPError as error:
        response = error
    with response:
        return response.status, response.headers, response.read()


def check(condition, name):
    assert condition, name
    checks.append(name)


if args.unavailable:
    check(call("/backend/api/applications")[0] in (502, 504), "Stopped upstream remains an HTTP failure")
    check(call("/health/ready")[2] == b"ready\n", "Local readiness stays independent of the upstream")
    check(b"<app-root" in call("/verifications/offline-bookmark")[2], "SPA remains available during an API outage")
else:
    status, headers, index = call("/")
    check(status == 200 and b"<app-root" in index, "Production Angular entry point")
    for path in ["/overview", "/applications/payments/versions/" + "a" * 40,
                 "/verifications/bookmark", "/compatibility/decisions/bookmark", "/issue-history?before=one&after=two"]:
        status, headers, body = call(path)
        check(status == 200 and body == index and headers.get("Cache-Control") == "no-store", "Uncached SPA bookmark: " + path)
    check(call("/index.html")[1].get("Cache-Control") == "no-store", "Index is never cached immutably")
    assets = re.findall(rb'(?:src|href)="([^"<>]+\.(?:js|css))"', index)
    check(len(assets) >= 2, "Production script and style references exist")
    for asset in assets:
        status, headers, body = call("/" + asset.decode().lstrip("/"))
        check(status == 200 and len(body) > 100 and "immutable" in headers.get("Cache-Control", ""), "Hashed bundle: " + asset.decode())
    check(call("/favicon.svg")[0] == 200, "Local favicon")
    check(len(call("/3rdpartylicenses.txt")[2]) > 100, "Application dependency license notices")
    font = next(Path("public/fonts").rglob("*.woff2"))
    check(call("/" + font.relative_to("public").as_posix())[2] == font.read_bytes(), "Local licensed font bytes")
    check(call("/missing-bundle-AAAAAAAA.js")[0] == 404, "Missing assets are 404, not SPA HTML")
    check(call("/health/live")[2] == b"live\n" and call("/health/ready")[2] == b"ready\n", "Local liveness/readiness")
    query = "/api/echo?sourceRef=refs%2Fheads%2Ffeature%2Fprovider%2Bfix&commit=" + "a" * 40
    status, headers, body = call("/backend" + query, headers={"Authorization": "Bearer synthetic-smoke",
        "Proxy-Authorization": "Basic synthetic-smoke", "Cookie": "synthetic=smoke"})
    echo = json.loads(body)
    check(status == 200 and echo["path"] == query and echo["method"] == "GET", "Only backend prefix removed; encoded query preserved")
    check(not {"authorization", "proxy-authorization", "cookie"}.intersection(echo["headers"]), "Credentials stripped before upstream")
    check(headers.get("Set-Cookie") is None and headers.get("Cache-Control") == "no-store", "No API cookie/cache propagation")
    before = json.loads(call("/backend/api/count")[2])["requests"]
    for method in ["HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]:
        check(call("/backend/api/echo", method=method)[0] == 405, "Write/non-GET blocked: " + method)
    for path in ["/backend", "/backend/api", "/backend/health/ready", "/backend/openapi/v1.json", "/api/applications"]:
        check(call(path)[0] == 404, "Only the reviewed API prefix is proxied: " + path)
    after = json.loads(call("/backend/api/count")[2])["requests"]
    check(after == before + 1, "Blocked requests never reach upstream")
    check(call("/backend/api/artifact")[2] == '{"exact":9007199254740993,"nullable":null,"text":"żółć"}\r\n'.encode(), "Original artifact bytes preserved")
    status, headers, body = call("/backend/api/unavailable")
    check(status == 503 and headers.get_content_type() == "application/problem+json" and
          body == b'{"status":503,"code":"registry_unavailable"}', "API ProblemDetails/status preserved")

output = Path("TestResults/container")
output.mkdir(parents=True, exist_ok=True)
(output / ("unavailable.json" if args.unavailable else "http.json")).write_text(json.dumps(checks, indent=2) + "\n")
print(f"Passed {len(checks)} production-image HTTP checks.")
