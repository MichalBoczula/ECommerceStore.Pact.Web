# Pact web delivery backlog

Each task is a separately reviewable PR. Implementation status does not establish Azure deployment.
The backend's PACT/09 source-CI pilot and the final hosted acceptance remain explicit dependencies.

| Task | Package | Status | Depends on |
| --- | --- | --- | --- |
| WEB/01 | Angular foundation | Merged ([#1](https://github.com/MichalBoczula/ECommerceStore.Pact.Web/pull/1)); CI passed | - |
| WEB/02 | Dashboard read API (Pact API repository) | Merged ([API #9](https://github.com/MichalBoczula/ECommerceStore.Pact/pull/9)); CI passed | Backend evidence model |
| WEB/03 | Pinned Kiota client, repositories, mappers and errors | Merged ([#2](https://github.com/MichalBoczula/ECommerceStore.Pact.Web/pull/2)); CI passed | 01, 02 |
| WEB/04 | Application, version, integration and contract explorer | Merged ([#3](https://github.com/MichalBoczula/ECommerceStore.Pact.Web/pull/3)); CI passed | 03 |
| WEB/05 | Verification history and diagnostic details | Merged ([#4](https://github.com/MichalBoczula/ECommerceStore.Pact.Web/pull/4)); CI passed | 03, 04 |
| WEB/06 | Contract comparisons and comparable issue history | Merged ([#5](https://github.com/MichalBoczula/ECommerceStore.Pact.Web/pull/5)); CI passed | 05 |
| WEB/07 | Explicit-version compatibility matrices | Merged ([#6](https://github.com/MichalBoczula/ECommerceStore.Pact.Web/pull/6)); CI passed | 03, 04 |
| WEB/08 | Overview and directed dependency graph | Implemented; PR verification in progress | 04, 05, 07 |
| WEB/09 | Registry-backed browser acceptance | Planned | 04-08 |
| WEB/10 | Tested/scanned immutable image publication | Planned | 09 |
| WEB/11 | Pact Web in existing Terraform root/state | Planned | 10 |
| WEB/12 | Hosted acceptance using real source-CI evidence | Planned | 11, backend PACT/09, operator deployment |

## WEB/01 acceptance

- Reproducible locked Angular 21 workspace; strict TypeScript/templates, Material/SCSS theme,
  NgRx root registration and development-only DevTools following storefront patterns.
- Responsive shell based on the approved Figma sidebar, local licensed typography, active
  navigation, lazy page routes, document titles, keyboard skip link and not-found recovery.
- Empty states remain honest: no fabricated counts, reports, compatibility outcomes or API health.
- Source/audit/lint/production-build, Vitest coverage and focused browser smoke checks pass.
  Initial CI also requires dependency review and secret scanning through a fail-closed gate.
- Local startup and verification work without a registry deployment. No Docker/Azure release is claimed.

## Subsequent acceptance

- **02:** paginated discovery for applications/versions, integrations, publications, profiles,
  comparisons and decisions, filtered run browsing, and graph/overview projections. Stable ordering,
  explicit evidence scope and relevant indexes. Deliver the necessary part of backend PACT/11
  before expanding every integration; registered but untested relationships stay visible as such.
- **03:** reviewed OpenAPI with source commit/hash, pinned generator, committed generated client,
  drift checks, same-origin API boundary and ProblemDetails mapping. No publisher token in the browser.
- **04:** browse application → version → integration → publication, preserve URL filters, show
  full identities/provenance and download original artifacts.
- **05:** explicit run history, interaction/method/path, expected/actual diagnostics, missing versus
  null, CI run/attempt/check and commit links; four evidence statuses remain distinct.
- **06:** browse stored comparison snapshots and compare explicit runs. Keep schema findings separate
  from verification outcomes; use the API's comparable-evidence policy for confirmed issue resolution.
- **07:** browse stored decisions by pinned profile, exact versions/hash/CI selection, missing checks
  and evidence. Respect bounded matrix semantics; UI never infers compatibility from latest uploads.
- **08:** overview and selectable directed graph, exact version filters, evidence drill-down and
  accessible list alternative. Clearly label declared/tested relationships without implying traces.
- **09:** isolated browser/API/MongoDB acceptance exercises browsing, filtering, failure diagnosis,
  confirmed resolution, all statuses, mobile/accessibility and unavailable registry behavior.
- **10:** build once, smoke/scan and publish the same image after main quality gates, recording a digest.
- **11:** add pact_web configuration, names, proxy URL, probes, dependency validation and tests to the
  existing Terraform root/state/ACA environment; retain scale to zero and current services.
- **12:** after manual deployment, verify deep links, proxy routing, readiness and the real Payments
  → Invoice failure/fix evidence flow. CI fixtures alone do not prove hosted source-CI integration.
