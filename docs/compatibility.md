# Stored compatibility matrices (WEB/07)

The browser reads immutable CI-published decisions. It never evaluates or publishes a decision,
chooses a latest version/profile/run, or reconstructs a matrix from unrelated reports.

| Route | Selection and behavior |
| --- | --- |
| `/compatibility` | Stored decisions; paginated filters for consumer/provider application, full consumer/provider commit SHA, Pact SHA256, profile ID and recorded status |
| `/compatibility/decisions/:id` | One complete stored decision, pinned profile snapshot and every selected matrix row/check |
| `/compatibility/profiles` | Immutable profiles; paginated consumer/provider, name and exact version filters |
| `/compatibility/profiles/:id` | Full profile identity/content hash and required verifier/check configurations |

List filters and opaque cursors live in the URL. Applying filters removes the previous cursor;
back/forward, reload and detail breadcrumbs preserve the selection. Decision version/hash filters
must match the **same row**, as enforced by the API. A detail view always shows the full matrix,
including other rows of a decision found through a filtered row. CI run/attempt/check selectors
are recorded row/check facts; the decision-list API does not support filtering on them.

The decision detail keeps the API's `explicit-ci-execution-v1` policy, four outcomes and `compatible`
flag. Full consumer/provider commits and registered version IDs, consumer Pact binding/hash,
provider source ref, CI run ID and attempt are visible. A snapshot contains 1–10 distinct explicit
selections and a complete set of 1–10 checks from its pinned consumer-owned profile. The UI does
not expand those selections into a Cartesian product or combine separately stored decisions.

Every check shows its required verifier name/version/configuration, applicability reason, selected
evidence ID/payload hash, observed verifier, original reported status, issue count, publisher and
links to the exact report/publication/CI run where present. Internal drill-down uses exact IDs;
external URLs pass the shared HTTP(S)-only validator. External metadata is interpolated as text.

| API reason | Meaning in the matrix |
| --- | --- |
| `ContractNotPublished` | No consumer Pact binding for the exact selected versions/hash |
| `MissingExecution` | No report for the selected run, attempt and required check |
| `VerifierMismatch` | The observed verifier differs from the pinned requirement |
| `SourceRefMismatch` | The reported provider source ref differs from the selection |
| `Reported` | The selected evidence applies; retain its Passed, Failed, Error or Unverified outcome |

A mismatched report may itself say Passed while the required check remains Unverified. Both facts
are displayed separately. `missingChecks` includes every Unverified/inapplicable check;
`unresolvedChecks` includes every check that is not Passed. Empty lists are labeled as recorded
facts, rather than proving compatibility independently. Schema findings and publication metadata
never supply a missing verification result.

The mapper validates bounds, duplicate rows/checks, profile membership, missing/unresolved sets,
supported policy/status/reason values and positive-evidence consistency. Inconsistent positive
snapshots are invalid responses. It preserves the server's row and matrix outcomes and never
upgrades a negative outcome. Missing decisions, unavailable responses and malformed records have
separate recoverable states; selection changes, failures and leaving the feature clear stale data.

Kiota 1.34's nullable `observedVerifier` union selects an empty member, including for JSON null.
The repository captures the same successful response through the existing lossless transport;
the handwritten mapper reads only this nullable member at its corresponding row/check index.
Generated request construction and all other typed metadata remain in use. The pinned OpenAPI,
generated client and anonymous GET-only transport are unchanged. Publisher credentials stay in CI.

Explorer links retain the selected source commit in its consumer/provider role. Consumer
publications scope decisions by Pact hash; provider OpenAPI hashes are not used as Pact hashes.
Profile discovery links to decisions with an explicit profile ID, without resolving a default.

The new views compose the approved Figma evidence table/panel and status-badge patterns with the
existing Material controls, local fonts and theme tokens. The matrix is a named, keyboard-scrollable
native table; full row/check evidence uses native disclosure controls. Repository tests exercise
the real generated Kiota client; state/use-case tests cover selection, cancellation and safe errors.
Browser checks cover exact links/bookmarks, all outcomes/reasons, multirow snapshots, recovery,
responsive layout and accessibility. Controlled HTTP fixtures are test-only data; hosted source-CI
evidence remains WEB/12.

WEB/09 now verifies the real browser/API/MongoDB path in the separate
[isolated registry acceptance suite](registry-acceptance.md). Synthetic publications in that suite
do not establish the source-CI pilot or hosted acceptance.
