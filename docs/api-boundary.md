# Reviewed API contract and anonymous reads

WEB/03 pins the complete OpenAPI 3.1.1 document exported from the reviewed WEB/02 source tree,
merged in [Pact API PR #9](https://github.com/MichalBoczula/ECommerceStore.Pact/pull/9). The manifest
in `contracts/upstream/manifest.json` records the source commit, tree and exact snapshot SHA256.
This is a source-build export, not an image digest or deployed-service attestation. The exported
server address is deliberately `http://pact-contract-source.invalid`; infrastructure always sets
the adapter base URL to the current browser origin plus `/backend` before constructing the client.

## Generate and check

```bash
npm ci
npm run api:generate
npm run api:check
```

Generation downloads Kiota **1.34.1**, verifies the pinned Linux x64 release archive SHA256 and
selects only `/api/**#GET`. Curl, unzip, sha256sum and Bash are required. For an already installed
generator, `KIOTA_BIN=/absolute/path/to/kiota` is supported and its version is checked. The npm
Kiota runtime/serialization packages are locked at the reference storefront's preview.103 version.
Kiota's TypeScript output is preview software; generator/runtime upgrades require regeneration
and the same tests. Its `tinyduration` dependency is an explicit CommonJS build allowance.

Never edit generated files. The generator removes its transient log and mechanically strips
trailing whitespace; it does not change schemas, models, methods or serializers. The drift check
compares the full file set and bytes before and after regeneration, failing on changed, missing or
extra source files. It also checks the raw upstream hash, forbids unpinned external `$ref` values,
checks for generated mutation methods and restricts transport imports to infrastructure and the
application and lazy registry route composition roots. CI executes this check before lint/build.
Existing quality gates stay mandatory. Generated files are excluded from lint and coverage, with actual generated request and
response handling covered through the repositories.

To update a contract:

1. Review and pin the upstream commit/tree. Build and run that API source, then export
   `/openapi/v1.json` with `Host: pact-contract-source.invalid` so the server address is stable.
   The WEB/02 export used a Release build in Production, with no publisher credentials and no
   database reads. Keep the API's document bytes intact, including the final newline if present.
2. Update the snapshot and manifest's source/export/hash fields together. Do not substitute a live
   endpoint without recording its provenance; deployment identity will be handled in WEB/10-12.
3. Run generation, review the contract/client changes, adapt handwritten mappers and run verification.
   Commit the snapshot, manifest, generated file set and lockfile together.

## Transport and repository scope

Browser → `/backend/api/...` → Angular dev proxy → Pact `/api/...`. The local target defaults to
`http://127.0.0.1:5080`; `PACT_API_URL` changes only the development server's proxy target.
Production must implement the same prefix removal and preserve `/api`, query encoding and original
response bytes in WEB/10. No Nginx/container/Azure deployment is delivered by WEB/03.

The transport permits only GET at the current origin under `/backend/api/`. It uses anonymous
authentication, omits cookies, refuses credential headers, disables redirects and caching, and
does not retry implicitly. Browser configuration contains no publisher secret or external API URL.
Each cold Observable subscription creates its own adapter and abort controller. Unsubscription
aborts in-flight work, including body reads, and suppresses late emissions; response captures are
isolated between concurrent requests. Effects can use `switchMap` for changing selections.

`provideRegistryReads()` binds these handwritten domain ports:

| Port | Implemented reads |
| --- | --- |
| `RegistryRepository` | Application discovery, exact versions, directed integrations, publication discovery/details, artifact metadata and original content bytes |
| `VerificationRepository` | Filtered paginated report discovery and exact run details |

The generated client contains the remaining read endpoints too. Domain models and repository ports
for comparisons, issue history, profiles, compatibility matrices, overview and graph will be added
with their feature tasks. No empty feature state/effect/facade is introduced. WEB/04 connects these
reads to the Applications, Dependencies and Contracts screens. The other section pages remain
honest empty states until their feature tasks.

## Evidence and failures

Mappers copy full IDs, commits, hashes, CI run/attempt/check, verifier configuration and provenance.
They do not select a latest compatible version or infer results from declarations. Opaque cursors
are returned unchanged; the API owns ordering and cursor/filter validation. Integer|string unions
in ASP.NET's OpenAPI become Kiota untyped values or string query parameters. Handwritten adapters
convert those explicitly and reject missing, negative, fractional or unsafe counts. Missing or
unknown verification statuses fail as invalid responses; Passed, Failed, Error and Unverified stay
distinct.

Run diagnostics use a second, lossless parse of the same response body captured by the fetch adapter.
Kiota still builds the request and deserializes typed report metadata. `expected` and `actual`
become `{ present: false }` or `{ present: true, json: string }`, preserving omitted fields, explicit
null, false, zero, nested JSON and arbitrary numeric precision. `actualPresent` remains a separate
API fact. Render diagnostic JSON, messages and validation text with Angular text interpolation,
never `innerHTML`. Original artifacts return the untouched ArrayBuffer, never reserialized JSON.

ProblemDetails map to validation (400/422), not-found (404), unavailable (502/503/504) or service
errors, using the HTTP status rather than a conflicting body status. Field validation arrays and
trace IDs are retained. Server titles/details, raw HTML and internal exception text are not exposed.
Network failure and malformed/empty successful responses have distinct errors. An invalid response
does not become an empty registry, a zero count or a passing result.

Repository tests execute the real generated client against controlled fetch responses, including
serialization, encoding, binary content, errors, cancellation and concurrent diagnostics. Browser
smoke verifies the actual Angular proxy against a local HTTP fixture and covers shell accessibility
and navigation. These fixtures do not establish live registry, MongoDB or hosted acceptance; those
remain WEB/09 and WEB/12.
