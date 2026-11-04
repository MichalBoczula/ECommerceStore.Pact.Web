# Production image and publication (WEB/10)

## Runtime contract

The multi-stage Dockerfile installs the locked npm dependencies with npm 11.5.2, builds the
production Angular application on Node 22, and copies only the browser output into Nginx.
Node, source code, test fixtures and publisher credentials are absent from the runtime stage.
The build context is an allowlist. The Nginx runtime receives available Alpine package fixes;
CI scans the resulting image rather than assuming a moving base tag is safe.

The container runs as `nginx`, listens on **8080**, and supports a read-only root filesystem
with a writable `/tmp`. The only required setting is **`PACT_API_URL`**, a server-side HTTP(S)
origin with a DNS/IPv4 host and optional port, for example `https://ca-ecommercestore-pact-dev.example.azurecontainerapps.io`.
Do not append `/api` or a trailing slash. Startup rejects absent values, credentials, paths,
queries, invalid ports and configuration injection. Only this variable is substituted into
the Nginx template; neither it nor a publisher token is written to browser assets.

- `/backend/api/...` forwards anonymous **GET** requests to `/api/...`, stripping only `/backend`.
  Encoded query values and original response bytes are preserved. Authorization,
  Proxy-Authorization and Cookie headers are removed; upstream Set-Cookie is hidden.
  Non-GET methods return 405. Other `/backend` and direct `/api` paths return 404.
- HTTPS upstreams use SNI and certificate verification against the CA bundle. Upstream
  redirects are not rewritten or followed by Nginx; the browser transport rejects redirects.
  ProblemDetails and failure status codes pass through without a SPA fallback.
- `/health/live` returns `live`; `/health/ready` returns `ready` when the local entry point exists.
  Startup also requires that entry point. These probes establish local Nginx/SPA availability,
  independently of the API, MongoDB or verification/compatibility results. The image healthcheck
  uses `/health/ready`; WEB/11 configures the ACA probes and target port.
- Deep links return the Angular entry point with `Cache-Control: no-store`. Hashed JS/CSS
  bundles are immutable for one year. Other assets revalidate; missing assets return 404.
  Fonts remain local with their existing licenses.

```bash
docker build --platform linux/amd64 --tag ecommerce-store-pact-web:local .
docker run --rm -p 8080:8080 --read-only --tmpfs /tmp \
  --cap-drop ALL --security-opt no-new-privileges \
  -e PACT_API_URL=https://your-pact-api.example.com ecommerce-store-pact-web:local
```

The configured hostname must resolve when Nginx starts. Recreate/restart the container after
changing the API origin. Access to the real API remains subject to its ingress policy.

## Mandatory image checks

`bash scripts/ci.sh container` builds a local candidate once and runs the production image checks.
CI sets `PACT_WEB_IMAGE_PREBUILT=true` to reuse its Buildx candidate. Docker is required; the full
`npm run verify` includes this stage after the browser/API/MongoDB stages. Python 3, Bash and
curl run the probes without adding packages to the runtime image.

The harness owns an isolated Docker network, a synthetic Node HTTP upstream and the candidate
container. It checks non-root/read-only startup, Nginx configuration, local probes, SPA bookmarks,
hashed bundles, font bytes, cache policy, missing assets, exact query routing, stripped credentials,
blocked methods/prefixes, original artifact bytes, upstream 503 ProblemDetails, invalid origins
and an actual stopped-upstream outage. Cleanup removes owned containers/network on exit.
Reports and container logs are under `TestResults/container/`. These transport fixtures do not
claim real registry evidence. The separate WEB/09 suite retains eight real API/MongoDB scenarios.

## Build once, test, scan, archive, gate, publish

Every PR and `main` push builds one **linux/amd64** candidate with source/revision OCI labels.
The container job smoke tests it, runs Trivy for fixable HIGH/CRITICAL vulnerabilities, and
records its image ID, full workflow commit and platform in `image.json`. A failed scan blocks
the gate; unfixed vulnerabilities are outside this existing repository scan policy.
The job saves the candidate, removes its local tag, reloads the archive and verifies the same
image ID/source/revision/platform. The report artifact includes both the scan and image identity.

The fail-closed quality gate requires build, unit, browser smoke, real registry acceptance,
container checks, secret scan, and Dependency Review (intentionally skipped on a main push).
Cancelled, failed or unexpected skipped dependencies block publication. PRs receive no Docker Hub
credentials and do not publish.

On a green **push to `main` only**, CI transfers `pact-web-tested-image` to a separate publication
job (one-day retention). That job loads the archive and verifies its identity again. It does not
build. The existing Docker Hub convention is reused:

| Setting | Value |
| --- | --- |
| Repository variable | `DOCKER_IMAGE`, default `mb0101/ecommerce-store-pact-web` |
| Username secret | `DOCKER_USER`, fallback `DOCKERHUB_USERNAME` |
| Token secret | `DOCKER_TOKEN`, fallback `DOCKERHUB_TOKEN` |
| Published tags | Full workflow commit SHA and `latest` |
| Receipt artifact | `pact-web-image-reference` (30 days) |

Missing credentials fail explicitly. Both tags must identify the tested image, and their pushed
manifest digests must agree. The receipt records `commitSha`, `imageId`, `platform`, `repository`,
`digest` and `imageReference`. Tags can move; use the receipt's immutable
**`docker.io/mb0101/ecommerce-store-pact-web@sha256:...`** reference for deployment.
Source checks include eight identity/receipt regression tests, including rejection of a different
image, workflow commit, repository source, platform or altered metadata.

PR validation proves candidate building, smoke, scan and archive transfer. Actual Docker Hub
publication and its digest receipt can only be established by the post-merge main workflow.
Publication does not apply Terraform or deploy Azure. WEB/11 uses the existing root/state and
ACA environment; WEB/12 verifies the hosted route/proxy behavior and real source-CI evidence.
