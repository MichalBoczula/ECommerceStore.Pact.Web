# Real registry browser acceptance (WEB/09)

The `registry-acceptance` CI job runs the Angular application against an actual TCP Pact API and
MongoDB 8.0.15. These tests do not intercept browser requests or replace API/database behavior.
The existing 42 controlled-HTTP smoke tests remain a separate suite.

## Run

Install the repository's Node/npm dependencies, .NET SDK 10, Docker and Playwright Chromium:

```bash
npm ci
npx playwright install --with-deps chromium
npm run test:registry
```

The harness prepares `.tools/registry-api` from `contracts/upstream/manifest.json` when absent.
It requires the exact commit, reviewed tree and clean worktree; it never resets an existing
checkout to hide local changes. To use a separate clean checkout, set `PACT_ACCEPTANCE_API_SOURCE`.
`PACT_ACCEPTANCE_DOTNET` can point to a non-PATH .NET executable. The API is restored in locked mode
and published in Release without changing its source or package locks.

Docker is the default database runtime. The harness owns a randomly named `mongo:8.0.15` container
with a loopback-only ephemeral port and no host data volume. Alternatively, point
`PACT_ACCEPTANCE_MONGOD` to a MongoDB **8.0** executable. Native runs use a new temporary data directory,
loopback TCP and a bounded WiredTiger cache. The MongoDB executable version is recorded. A native
run is a real database run; it does not attest the Docker startup path.

The harness chooses new loopback ports for the APIs and Angular proxies. One Production API uses
a unique `pact_web_<uuid>` database; a second API points to an unavailable loopback MongoDB port.
The second Angular proxy exercises the actual API's safe 503 responses. No existing database,
hosted endpoint, publisher credential or Azure deployment is needed or modified.

`npm run verify` includes this suite after the source/contract/audit/build/unit/smoke checks.
Run `bash scripts/ci.sh registry` for this stage alone. An optional `PACT_ACCEPTANCE_CONFIG` permits
an explicit local Playwright executable/configuration; CI uses the committed configuration and
standard Playwright Chromium. Missing runtimes, source/contract drift, startup failures or failed
tests fail the stage; there is no fixture fallback or conditional test skip.

## Data and assertions

Setup generates a fresh publisher token in the Node harness and passes only its SHA-256 hash to
the isolated healthy API. API children discard inherited registry/Mongo configuration. The raw
token is never an Angular environment value, fixture file, browser request or report artifact.
The unavailable API has no configured publisher. Setup also confirms anonymous writes return 401.

All registrations, original artifacts, reports, profiles, comparisons and decisions are published
through authenticated production API endpoints. No test writes directly to MongoDB. Read assertions
check byte-preserving downloads, real policy projections and immutable earlier records.

The eight browser scenarios exercise:

- Application → exact version → directed integration → publication navigation and original bytes.
- Real cursor/filter bookmarks, issue/path filtering, empty results and all four report statuses.
- Full CI/source identities, lossless numeric diagnostics, absent versus null, and text-safe messages.
- Comparable Failed → Passed history, persisting mismatches and requirement changes that cannot
  establish a provider fix; the original failed report remains unchanged.
- Complete mixed matrices and pinned profiles, missing-check decisions, later evidence and an
  earlier Unverified snapshot that remains immutable.
- Saved comparison semantics and overview/graph drill-down, including an untested declaration.
- Mobile containment, keyboard navigation and axe accessibility with real registry responses.
- Real MongoDB unavailability producing three safe 503 section failures without fabricated metrics.

Every browser API request must be an anonymous GET. Tests install an HTTP-only same-origin test
cookie and verify API requests still omit cookies and Authorization headers. Browser reads travel
through the Angular `/backend` proxy and the actual generated Kiota serialization path.

The API's running OpenAPI is compared losslessly against the reviewed snapshot after replacing
only the ephemeral server origin with the pinned origin. JSON object key order/formatting does not
affect this comparison; arrays, schemas, operations and numeric tokens remain checked. The reviewed
snapshot's SHA-256 is independently verified. This does not regenerate or weaken the GET-only client.

## Evidence and limits

`TestResults/registry/` contains JUnit/HTML browser reports, failure traces/screenshots, API/Mongo/
build logs, the running OpenAPI, synthetic fixture identities and a success receipt. The receipt
records the API commit/tree, pinned and running OpenAPI hashes, SDK and database version. A stale
success receipt is removed at the next start. Cleanup terminates owned processes, removes the
owned Docker container or native data directory, including after failures/signals.

Fixtures are explicitly synthetic registry publications. They validate the real browser/API/Mongo
integration and registry policies; they do **not** run official Pact matching against Invoice or
establish the real Payments → Invoice source-CI pilot. Backend PACT/09 and hosted acceptance remain
separate dependencies. Image/Nginx delivery is WEB/10; existing-root Terraform and hosted acceptance
remain WEB/11–12.

CI adds this job to the fail-closed quality gate alongside the existing required checks and always
uploads its report directory. A cancelled, skipped or failed registry job blocks the gate.
