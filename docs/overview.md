# Registry overview and directed dependency graph (WEB/08)

`/overview` reads global inventory, filtered recorded-report counts, one page of declared
dependencies and up to five recent matching verification reports. The browser does not infer
compatibility, choose a latest version/run, reconstruct missing data or publish evidence.

| Projection | Scope |
| --- | --- |
| Inventory | Global registered applications/versions, declarations, publications, profiles, comparisons and compatibility decisions |
| Report counts | Recorded executions matching the selected evidence filters; Passed, Failed, Error and Unverified remain separate |
| Dependency graph | A page of declarations matching application/consumer/provider filters; each edge has separately filtered report counts |
| Recent evidence | Up to five matching report summaries with exact report ID, provider commit and CI run/attempt/check |

The metric cards label their scope. Failed and Unverified **reports** are not counts of failed
compatibility selections or missing checks. Zero matching reports does not establish passing
evidence. Inventory is unaffected by evidence filters; the projections are not a transactional
snapshot. The overview retains the API's observation timestamp and evidence policy:
`RecordedReportsOnly-v1; not a compatibility decision; not a transactional snapshot`.

The URL is the filter source of truth. Application IDs and full commit/hash selections are
validated and normalized; ref, status, issue code/path, CI execution and verifier configuration
filters retain their exact roles. No application, ref, version or execution is chosen by default.
The form groups full version/CI filters in a disclosure. Applying filters removes the old cursor.

Graph page size is 1–100 edges (default 25). Its opaque cursor is passed unchanged only to the
dependency projection; overview counts and the five-report preview never receive that cursor.
Back/forward and reload restore the filters/page. `isComplete: false` is always labeled as a
partial page, including the last page when it is not also the first. The browser does not fetch
all pages and does not treat the current page as the entire registry.

Every graph edge remains **Declared**, regardless of its report counts. A solid arrow means
matching recorded evidence exists; a dashed arrow means no matching reports. Neither is a
compatibility result or a runtime trace. Nodes are applications appearing on the returned page,
not an inventory of every application/version. Evidence filters do not remove declarations
with zero matching reports. The API owns these projections and ordering.

The graph adapts the approved Figma application-node, connector, panel, typography and selected-
dependency patterns. Connectors represent API-supplied relationship data: their paths are rendered
from returned edges rather than shipping the design's illustrative fixed topology. All displayed
applications, counts and evidence come from repository reads. No design example is bundled as data.

Layout is deterministic presentation geometry. It supports branching, cycles and disconnected
components without dropping/reversing declarations; column placement does not imply execution
order. The canvas scrolls within its container. Long node labels retain the full value in a title
and in the list. Every arrow has a keyboard target and Enter/Space selection; the native-button
dependency list is a complete accessible alternative on mobile and desktop. Selection is local
view state, resets when filters/pages change, and never elects a verification run.

Selected edges show all four report counts. Verification drill-down narrows the API's normalized
selection to the directed consumer/provider pair and preserves full commit/hash/ref/CI/configuration
filters. The generic application filter is removed after narrowing to that exact pair. Each recent
report opens by its own immutable ID. Declaration links open the application-level integration;
compatibility remains a separately stored-decision feature.

Overview, graph and recent reports load concurrently through the generated anonymous GET client.
Each section retains its own safe error, so a failed projection does not hide the successful ones.
Retry re-reads the current selection. New selections and leaving cancel all pending reads and
clear stale data. Handwritten mappers validate safe counts/totals, supported policy, graph bounds,
node/edge membership, duplicates and completeness flags; use cases reject a different returned
evidence selection. The existing same-response capture distinguishes a null selection from a
valid empty selection despite Kiota's object-null deserialization behavior. Generated code and
the pinned OpenAPI remain unchanged; `errorEscaped` maps explicitly to the API's Error count.

Tests execute real generated-client requests against controlled HTTP responses and cover filtering,
query encoding, nullable selections, four counts, empty/unavailable/malformed states, bounds,
pagination, partial errors, cancellation, cycles, exact drill-down, keyboard and responsive/axe checks.
These fixtures are not live source-CI evidence. Image/Nginx, existing Terraform root/state and
hosted acceptance remain WEB/10–12.

WEB/09 now verifies the real browser/API/MongoDB path in the separate
[isolated registry acceptance suite](registry-acceptance.md). Synthetic publications in that suite
do not establish the source-CI pilot or hosted acceptance.
