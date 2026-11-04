# Angular foundation and boundaries

## Implemented in WEB/01

This is a conventional standalone Angular SPA, following the storefront's Angular 21, Material,
SCSS and NgRx patterns. `App` composes the shared workspace shell; feature pages load lazily.
The root redirects to overview. The shared section metadata supplies navigation, route data and
titles. The registry explorer owns Applications, Dependencies and Contracts; verification evidence
owns Verifications. History owns stored comparisons under Contracts and the Issue history destination.
Compatibility owns stored decision matrices and pinned profiles. Overview owns inventory, filtered
report counts, the directed dependency graph and recent matching evidence.
Unknown addresses retain their URL and offer recovery.

The shell owns only navigation and responsive drawer behavior. Its viewport state uses Angular
signals/CDK; it does not belong in the business store. NgRx is registered centrally, with DevTools
only in development. Add feature state, effects, facades, repository ports and mappers when their
use cases exist. The storefront's feature layering is the reference; empty files/interfaces are not
required to establish the boundary.

Material handles drawer overlay, focus trapping and Escape. Desktop uses a persistent 240px sidebar;
below 768px the header opens an overlay drawer and selecting a destination closes it. Navigation
links expose the current page. Local fonts, visible keyboard focus, a skip link and one main region
are part of the shell. Semantic colors follow the approved Figma concepts and existing store palette.

## API boundary (WEB/03)

Browser → same-origin `/backend/api/...` → Angular development proxy or Nginx → Pact `/api/...`.
The development proxy removes only `/backend`, preserving `/api`; production Nginx implements
the same path boundary with anonymous GETs in WEB/10. One Pact API does not require a new business BFF. Reviewed upstream OpenAPI and pinned
Kiota 1.34.1 produce one committed GET-only client, loaded on the first repository read.
Handwritten infrastructure repositories and mappers keep transport DTOs outside presentation and
domain models. Domain-facing ports do not reference generated clients. Registry and verification
reads, history, compatibility and overview have concrete ports and providers.
Errors map from ProblemDetails into presentation-safe domain errors. See
[the contract and transport details](api-boundary.md).

Presentation → facade → NgRx actions/effects/selectors → repository port → Kiota adapter → API.
Use cancellation/latest-request behavior and URL filters where the use case requires it. The API owns
pagination, discovery projections and evidence policies; the browser does not fetch every record to
reconstruct the database. Each read subscription owns an adapter and AbortController. Unsubscribe
aborts the fetch and prevents stale emissions. No automatic retries or redirects cross this boundary.
API/DTO/library changes land with their contracts and meaningful tests.

## Registry explorer (WEB/04)

One lazy route group owns the application/version, integration and publication routes, feature state,
effects, facade and repository bindings. The root keeps only the root store. Route-local providers
avoid downloading transport infrastructure on shell-only navigation and register the effects once
across explorer routes. The import guard permits this route composition root to bind infrastructure.

URL parameters are the selection source of truth. Navigation dispatches one request per selection;
`switchMap` cancels the previous read, and leaving the page cancels reads/downloads and clears state.
Filter submission removes the old cursor. Paging preserves the filters, and browser back/forward
restores both values and data. Errors are serializable plain state; failed reads never become empty
results. An explicit artifact download uses a browser adapter after fetching original bytes; binary
content never enters the store. See [explorer behavior](explorer.md).

## Verification evidence (WEB/05)

A separate lazy route group owns filtered history and exact report details with its own facade,
state and effects. It reuses the reviewed verification repository and shared provenance fields,
error mapping/panels and browser download adapter. These shared pieces contain no feature state.
The import guard permits both route composition roots to bind infrastructure.

The URL is the history selection source of truth. Query changes cancel previous reads and reset
stale data; applying filters removes the old cursor. Exact run routes fetch by report ID only and
retain the history query for the breadcrumb. Primary report data renders before supplementary
registered-version lookups. Those lookups validate exact identities, cancel on selection changes
and cannot hide the report when a repository link is unavailable. Binary downloads stay outside
the store. See [verification behavior](verifications.md).

## Stored comparisons and issue history (WEB/06)

One lazy route group owns `/contracts/comparisons`, exact snapshot details and `/issue-history`.
A route guard gives the comparison paths priority over publication-ID routes without loading the
history feature during ordinary shell navigation. The feature uses a facade, serializable NgRx
state, cancellable effects and a handwritten repository over the existing pinned GET client.

Comparison snapshots are read, never recomputed by the browser. Schema assessment, content/JSON
change, findings, limitations and consumer impact remain separate facts from run outcomes and
compatibility. Issue history requires explicit before/after IDs and the provider baseline ref. The
API owns issue grouping/transitions; the mapper validates the supported policy and positive-resolution
evidence without inventing transitions or upgrading negative decisions. Both run snapshots and
nullable historical issue sides retain lossless diagnostics. See [history behavior](history.md).

## Stored compatibility matrices (WEB/07)

One lazy route group owns compatibility decision browsing/details and immutable profile browsing/details.
Its facade, state, cancellable effects and repository reuse the anonymous GET-only boundary. List
filters and cursor bookmarks remain URL-owned; direct IDs retrieve complete stored snapshots. No
publisher endpoint or client-side evaluation is added.

The API owns the explicit-CI-execution policy, selected rows, applicability reasons, outcomes and
compatibility flag. Handwritten mapping validates bounds, complete pinned-profile check membership
and positive-evidence consistency without upgrading negative evidence. Nullable observed-verifier
metadata uses the same captured response to preserve null despite Kiota's union behavior. Native
tables and disclosures retain full evidence and keyboard/mobile access. See [compatibility behavior](compatibility.md).

## Registry overview and dependency graph (WEB/08)

The overview is a lazy route with a facade, serializable state, cancellable effects and repository.
Three concurrent reads separate global inventory/filtered counts, one declaration graph page and
five recent report summaries. Each section has an independent safe failure state. API selection
echoes are checked, graph cursors stay out of the counts/report preview, and failed/new selections
never retain stale evidence. The shell itself makes no registry reads.

Graph geometry is presentation-only and preserves directed declarations, cycles and disconnected
components. Arrow/list selection is local UI state; it does not choose a run or compatibility result.
Full selected evidence filters survive drill-down; partial pages and zero matching reports are
explicit. See [overview behavior and accessible graph semantics](overview.md).

## Evidence rules

- CI publishes registrations, artifacts, verification reports, comparison snapshots and decisions.
  The MVP browser reads them. No publisher secret is embedded in browser configuration or assets.
- Application commits, contract hashes, publication IDs, required-check profiles and exact CI
  executions are immutable identities. A shortened display must still expose the full value.
- Passed, Failed, Error and Unverified are different outcomes. Missing evidence is never success.
- Publication, schema classification, verification and compatibility are separate facts.
- Issue resolution follows comparable requirements and a passing candidate, not requirement removal.
- Graph edges are declared/tested dependencies, not observed runtime traces or a business sequence.
- Render diagnostics as text and distinguish absent values from JSON null. Keep design fixtures out
  of live-data presentation. Feature views read registered records/projections without bundled fixtures;
  the shell owns navigation and responsive behavior only.

## Verification and delivery

WEB/01 unit tests cover route transitions, direct bookmarks, titles, unknown addresses and drawer
behavior. Playwright smoke covers the rendered shell, active navigation, mobile/resizing/Escape,
keyboard skip navigation, local fonts and axe accessibility. These are UI foundation checks; real
registry/container acceptance belongs to WEB/09 and source-CI/hosted acceptance to WEB/12.

WEB/09 adds real browser acceptance against a clean API checkout pinned to the reviewed OpenAPI
source and an isolated MongoDB. Setup publishes synthetic data through authenticated API endpoints;
the browser performs anonymous GETs through the Angular proxy without request interception.
Failure/fix history, immutable missing-check snapshots, four statuses, original bytes, lossless
diagnostics, mobile/keyboard/axe and actual unavailable-database responses are exercised. Processes
and data are owned by the harness. See [registry acceptance](registry-acceptance.md).

CI on `main`/PRs runs source checks, audit, lint/build, coverage, browser smoke, real registry acceptance, dependency review and
gitleaks. `quality-gate` fails when a mandatory dependency fails, is cancelled or unexpectedly skipped.
The build job also verifies the snapshot hash, infrastructure import boundary and deterministic
regeneration of the GET-only client. Generated files are excluded from lint/coverage; generated
serialization is exercised by repository tests.

WEB/10 adds a multi-stage production image: Angular build output and local fonts served by non-root
Nginx on 8080, with deep-link fallback, cache policy, local probes and a server-side API origin.
The GET-only proxy strips credentials/cookies and preserves API failures/original artifacts.
CI builds one image, checks the real container, scans it and verifies archive transfer. The mandatory
gate includes the container job. A green main push loads that archive in a separate publication job,
verifies its source/image identity and pushes those same bytes with a manifest-digest receipt.
See [image delivery and configuration](image-delivery.md). WEB/11 reuses the existing Terraform
root/state and ACA environment. Publication does not establish deployment or cloud readiness.
