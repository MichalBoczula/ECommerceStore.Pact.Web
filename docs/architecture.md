# Angular foundation and boundaries

## Implemented in WEB/01

This is a conventional standalone Angular SPA, following the storefront's Angular 21, Material,
SCSS and NgRx patterns. `App` composes the shared workspace shell; feature pages load lazily.
The root redirects to overview. The shared section metadata supplies navigation, route data and
titles. Non-overview sections temporarily use one shared empty-state page, replaced as each feature
lands. Unknown addresses retain their URL and offer recovery.

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
The development proxy removes only `/backend`, preserving `/api`; production Nginx follows in
WEB/10. One Pact API does not require a new business BFF. Reviewed upstream OpenAPI and pinned
Kiota 1.34.1 produce one committed GET-only client, loaded on the first repository read.
Handwritten infrastructure repositories and mappers keep transport DTOs outside presentation and
domain models. Domain-facing ports do not reference generated clients. Registry and verification
reads have concrete ports and providers; history, matrix and dashboard ports arrive with those
features. Errors map from ProblemDetails into presentation-safe domain errors. See
[the contract and transport details](api-boundary.md).

Presentation → facade → NgRx actions/effects/selectors → repository port → Kiota adapter → API.
Use cancellation/latest-request behavior and URL filters where the use case requires it. The API owns
pagination, discovery projections and evidence policies; the browser does not fetch every record to
reconstruct the database. Each read subscription owns an adapter and AbortController. Unsubscribe
aborts the fetch and prevents stale emissions. No automatic retries or redirects cross this boundary.
API/DTO/library changes land with their contracts and meaningful tests.

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
  of live-data presentation. The foundation intentionally contains no registry examples or calls.

## Verification and delivery

WEB/01 unit tests cover route transitions, direct bookmarks, titles, unknown addresses and drawer
behavior. Playwright smoke covers the rendered shell, active navigation, mobile/resizing/Escape,
keyboard skip navigation, local fonts and axe accessibility. These are UI foundation checks; real
registry/container acceptance belongs to WEB/09 and source-CI/hosted acceptance to WEB/12.

CI on `main`/PRs runs source checks, audit, lint/build, coverage, browser smoke, dependency review and
gitleaks. `quality-gate` fails when a mandatory dependency fails, is cancelled or unexpectedly skipped.
The build job also verifies the snapshot hash, infrastructure import boundary and deterministic
regeneration of the GET-only client. Generated files are excluded from lint/coverage; generated
serialization is exercised by repository tests. WEB/10 will add build-once scanned-image publication.
WEB/11 reuses the existing Terraform root/state and ACA environment. No image publishing, Terraform
apply or cloud readiness is part of WEB/01-03.
