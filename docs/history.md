# Stored comparisons and comparable issue history (WEB/06)

This feature reads existing evidence through the pinned anonymous API. The browser never runs
oasdiff, publishes a comparison, elects a latest version or calculates issue transitions locally.

## Stored contract comparisons

`/contracts/comparisons` is linked from Contracts. It supports `consumerApplicationId`,
`providerApplicationId`, `sourceApplicationId`, `kind` (ConsumerPact/ProviderOpenApi), `baselineRef`,
`limit` (1–100, default 25) and opaque `after` cursor filters. Submission removes the old cursor;
paging retains scope. Reload/back/forward restore the bookmark. `/contracts/comparisons/:id` opens
one exact saved snapshot and links to both original publications and registered versions. These
routes take priority over the existing publication-ID route and keep Contracts active in navigation.

Snapshots show complete source commits, hashes, refs, binding/version/publication IDs, selected
baseline, profile, tool/version, publisher and timestamp. Byte changes and JSON changes are separate
stored booleans; missing values are invalid responses, not defaults. Schema assessment remains
NoBreakingChangesDetected, PotentiallyBreaking or NotAssessed. Finding severity, messages, operation,
limitations and the API's reported consumer impact are displayed as text. No schema classification
becomes a Passed run, a consumer-safety claim or a compatibility decision. Empty discovery does not
recompute a comparison or imply an unchanged contract.

## Explicit issue-history selection

`/issue-history` accepts `beforeRunId`, `afterRunId` and `baselineRef`. The provider baseline ref
must match the before run's reported source ref, and the API requires the same directed integration.
Use as baseline for issue history on verification details pre-fills only that ID/ref. A candidate
is always explicit; incomplete selection makes no history request. Unknown/duplicate filters and
invalid UUIDs fail visibly. The browser does not reorder the selected runs by upload or execution
time, pick a latest report, or silently change an invalid baseline. All three values survive reload.

The API policy is `exact-pact-requirements-v1`. It groups mismatch requirements using the integration,
operation, JSON path and expected value, independent of changing actual values/message wording.
The frontend treats issue keys as opaque and displays the returned classification:

| Transition | Interpretation under the supported policy |
| --- | --- |
| Resolved | The requirement is absent in the comparable passing candidate |
| Persisting | The same mismatch requirement exists in both selected runs |
| Appeared | A new mismatch follows a passing baseline |
| Observed | A mismatch is observed without a passing baseline |
| Unconfirmed | Absence without a passing candidate does not confirm a fix |
| RequirementsChanged | Changed Pact requirements do not establish a provider fix |
| VerifierChanged | Changed verifier/version/configuration/check prevents comparable evidence |

The response's comparable flag, reason, baseline ref and policy are explicit. Negative decisions
are never upgraded by the browser. A positive comparable response must have matching Pact hash and
verifier/check identities. Resolved also requires a prior mismatch, no matching candidate mismatch,
and a Passed candidate. Unsupported policies/transitions, duplicate issue keys, non-mismatch
projections or inconsistent positive evidence fail as invalid responses. These are response guards,
not an alternative matching engine. An empty projection is not a compatibility decision.

The approved two-run timeline is populated only with the explicit returned records. IDs, provider
commits and CI run/attempt/check identities are visible in full. Full before/after evidence expands
consumer commits, Pact hashes, verifier/version/configuration, source refs and timestamps. Both
original reports and their CI evidence remain linked. No illustrative design values appear as live data.

## Lossless diagnostics and boundaries

Before/after reports reuse the verification mapper. The history projection also contains nullable
issue sides; Kiota 1.34 chooses the empty branch of its generated nullable union. The handwritten
mapper reads that side's validated metadata from the same captured response and reuses the existing
lossless diagnostic mapping. Generated output is not patched or replaced with a parallel REST client.

A null whole issue side means no matching mismatch in that run. Inside an issue, omitted expected/
actual values remain distinct from JSON null, false and zero. Arbitrary numeric precision is retained
in diagnostic JSON text, and `actualPresent` remains a separate API fact. Text interpolation and shared
safe provenance links prevent diagnostic HTML or unsafe URL schemes from becoming executable content.

One lazy feature owns the repository, facade, state and effects across comparison/history routes.
Changing the selection or leaving cancels pending requests and clears stale evidence. Validation,
missing references, unavailable service, invalid responses and successful empty results remain
distinct. Existing quality gates, generated-client drift checks and anonymous GET transport apply.

Tests use the actual generated client and controlled HTTP responses to cover nullable sides, precise
values, every transition, unsafe positive projections, query/cursor scope, cancellation, errors,
provenance navigation, mobile layout and axe accessibility. These do not establish live API/MongoDB
or hosted source-CI acceptance on their own. Hosted evidence remains WEB/12; image/Nginx and Terraform remain WEB/10-11.

WEB/09 now verifies the real browser/API/MongoDB path in the separate
[isolated registry acceptance suite](registry-acceptance.md). Synthetic publications in that suite
do not establish the source-CI pilot or hosted acceptance.
