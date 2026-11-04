# Verification evidence (WEB/05)

`/verifications` browses recorded executions. `/verifications/:id` opens one exact immutable report.
Both use the pinned read API and real generated Kiota serialization through handwritten domain
repositories. No report is evaluated, published or assigned a new outcome by the browser.

## History selection

| Filter | Meaning |
| --- | --- |
| `applicationId` | Application in either consumer or provider role |
| `consumerApplicationId`, `providerApplicationId` | Directed application roles |
| `consumerCommitSha`, `providerCommitSha` | Exact registered source commits |
| `contractSha256` | Exact consumer Pact hash |
| `sourceRef` | Reported provider source ref |
| `status` | Passed, Failed, Error or Unverified |
| `issueCode`, `jsonPath` | Recorded issue matches |
| `ciRunId`, `ciAttempt`, `ciCheckId` | Exact CI execution/check selection |
| `verifierName`, `verifierVersion`, `configurationSha256` | Pinned verifier/check configuration |
| `limit`, `after` | Page size 1–100 (default 25) and opaque API cursor |

All filters live in the URL. Advanced fields open when their bookmarked values are present. Applying
or clearing filters removes the old cursor; paging retains the scope. Reload and back/forward restore
the selection. Duplicate, unsupported, unknown-status and invalid numeric URL filters produce a
visible validation error. Remaining filter syntax and cursor scope are validated by the API. The
former placeholder `provider` query is not an alias; use `providerApplicationId`.

The detail route fetches its explicit ID, irrespective of retained history filters. Its breadcrumb
returns to that history bookmark. An absent report, unavailable registry, invalid response and a
successful empty page remain separate states. Failed, Error and Unverified are never converted to
Passed; an empty issue list or empty query result does not establish passing evidence. Report history
is separate from a compatibility decision.

## Evidence and diagnostics

The detail view adapts the approved Figma desktop/mobile verification layout: outcome summary,
consumer/provider/CI cards, expected/actual panels and evidence actions. Real records retain full
identities and expand naturally rather than clipping content to the design's illustrative text.
WEB/06 now provides comparable issue transitions through an explicit before/after selection.
No sample failing/fixed timeline is presented as registry evidence.

Commit SHAs, Pact hash, run/attempt/check IDs and source links remain available in full. CI run IDs
stay strings, including values larger than JavaScript's safe integer range. Full report provenance
exposes publication/binding/version IDs, verifier/configuration, publisher, source ref and timestamps.
Registered source versions are fetched separately to provide exact GitHub commit links. Their IDs,
application and commit must match the report; unavailable or mismatched supplementary metadata
cannot hide the report or replace its recorded identities. Internal exact-version links remain usable.

Each issue shows kind, code, message, interaction, method, path, JSON path and optional evidence URL.
The existing lossless mapper supplies diagnostic JSON text without rounding arbitrary numeric values.
Text interpolation preserves and safely renders missing fields, explicit JSON null, false, zero,
objects, arrays and strings. `actualPresent` is displayed separately as true, false or not reported;
it does not substitute for diagnostic-value presence. Large JSON values wrap and can be scrolled
with the keyboard. No diagnostic value becomes HTML.

HTTP(S) provenance links reuse the shared safe link handling. Other schemes remain plain text.
The consumer publication button targets the report's exact publication ID. Download consumer Pact
uses the report's pinned consumer hash, saves unchanged bytes through the shared browser adapter,
and reports a failed download without claiming success. It never reserializes a JSON artifact.

Use as baseline for issue history opens `/issue-history` with the exact current report ID and its
provider source ref. The candidate must still be selected explicitly.

The explorer links declarations to consumer/provider history and retains a selected source commit
in its matching role without pinning the other application's version. A consumer Pact publication scopes
history by its consumer commit, provider and Pact hash. A provider OpenAPI publication scopes it by
provider commit; its schema hash is not a consumer Pact verification hash. No latest version or
compatibility selection is inferred from a publication.

## State and verification

History/detail, supplementary metadata and downloads use cancellable effects. Changing selection
or leaving the feature suppresses stale results, clears notifications and cancels pending work.
Downloads use concurrency protection; bytes never enter NgRx state. Read failures are plain
serializable state with safe messages, validation fields and trace IDs.

Unit tests cover exact query mapping, numeric/string identities, invalid selections, ID matching,
metadata mismatches/outages, cancellation, retry, download concurrency and publication evidence
scopes. Browser tests use controlled HTTP responses and the actual generated client to exercise
all four statuses, bookmarks, paging, diagnostics/precision, safe rendering, links, downloads,
failure states and responsive accessibility. Fixtures stay outside application assets. Desktop and
mobile screenshots are inspected against the approved concepts.

These checks do not establish live browser/API/MongoDB or hosted/source-CI acceptance. Those remain
WEB/09 and WEB/12. Container publication, production Nginx and Terraform remain WEB/10-11.
