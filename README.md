# ECommerceStore.Pact.Web

Angular SPA for the ECommerceStore Pact contract registry. The Angular shell and anonymous API
read boundary, registry explorer, verification details, stored comparisons and comparable issue
history, stored compatibility matrices and the registry overview/directed dependency graph are implemented. Issue history
reads the registry only after an explicit before/after selection. No sample results are shown as live evidence.

## Run locally

Use Node 22.12+ (or Node 24), npm 11 and Bash for the verification scripts.

```bash
npm ci
npm start
```

Open http://localhost:4200. No backend, database, publisher token or Azure deployment is required
to navigate the shell; explorer records require the running Pact API. `/` opens `/overview`. Applications, dependencies, contracts, verifications,
compatibility and issue history have bookmarkable routes. An unknown route has a recovery page.

The read repositories use same-origin `/backend/api/...`. Development strips only `/backend`
and forwards to `http://127.0.0.1:5080` (the API launch profile). Override the server-side target with
`PACT_API_URL=http://127.0.0.1:5080 npm start`. No API URL or publisher credential is shipped to the
browser. See [API boundary and contract updates](docs/api-boundary.md).

## Verification

```bash
npx playwright install --with-deps chromium
npm run verify
```

`npm run verify` runs source/contract checks, a high/critical dependency audit, lint, production build,
Vitest coverage, controlled-HTTP browser smoke and real registry browser acceptance. The full run
also requires .NET SDK 10 and Docker (or a configured native MongoDB 8.0 executable). On Windows use
Git Bash or WSL. Individual stages are available as `bash scripts/ci.sh source|contract|audit|build|unit|smoke|registry`.
See [isolated API/MongoDB acceptance](docs/registry-acceptance.md) for startup, isolation and reports.

Unit JUnit output is `TestResults/unit.xml`; coverage is under `coverage/`. Browser reports,
failure screenshots and traces are under `TestResults/`. CI runs on PRs targeting `main` and pushes
to `main`, includes dependency review and secret scanning, and requires every mandatory job in
`quality-gate`, including the real registry acceptance job. This foundation does not publish images or deploy infrastructure.

## Architecture and design

- Standalone Angular 21, OnPush components, strict TypeScript/templates, Material and SCSS.
- NgRx root registration and development-only DevTools; feature stores/effects/facades arrive
  with their screens. The registry explorer and verification evidence have facades, feature state
  and cancellable effects.
  Registry, verification, history, compatibility and overview repository ports expose handwritten read models;
  generated Kiota DTOs stay in infrastructure.
- Seven navigation destinations, responsive Material drawer, active-link semantics, skip link,
  document titles, and a not-found route. The explorer adds cursor pagination, bookmarkable filters,
  full provenance and original-byte artifact downloads. Verification views add exact evidence filters,
  four distinct statuses and lossless expected/actual diagnostics. Stored comparison findings and
  API-projected issue transitions remain separate from compatibility decisions. Browser smoke covers accessibility.
- Roboto and Material Icons are served locally with licenses; no Google Fonts request is required.
- Distinct theme tokens reserve Passed, Failed, Error and Unverified without assigning statuses
  to records that have no verification evidence.

[Architecture decisions](docs/architecture.md) · [Delivery backlog](TECHNICAL_TODO.md) ·
[Approved Figma concepts](https://www.figma.com/design/5MNjC3C2tH2MEwBdtw34B5?node-id=5-1661)

The explorer extends the approved shell, cards, typography and Material control patterns.
See [explorer routes and evidence scope](docs/explorer.md) and [verification history and details](docs/verifications.md).
See [stored comparisons and comparable issue history](docs/history.md),
[stored compatibility matrices and pinned profiles](docs/compatibility.md) and
[overview scopes and the directed dependency graph](docs/overview.md).

## Related repositories

- [Pact API](https://github.com/MichalBoczula/ECommerceStore.Pact)
- [Angular reference patterns](https://github.com/MichalBoczula/ecommerce-store-web)
- [Existing Terraform root and state](https://github.com/MichalBoczula/ECommerceStore.Terraform)

WEB/02 is merged in the API; WEB/03 pins its OpenAPI and adds the read boundary. WEB/04 implements
the application, version, integration and publication explorer. WEB/05 adds verification history
and diagnostic details. WEB/06 adds stored contract comparisons and comparable issue history.
WEB/07 adds stored explicit-version compatibility matrices and pinned profile browsing.
WEB/08 adds global inventory, filtered report counts and a selectable, paged declaration graph.
WEB/09 adds isolated real browser/API/MongoDB acceptance as a mandatory CI job.
Next: WEB/10 adds tested/scanned immutable image publication and production Nginx;
CI remains responsible for publishing registry evidence.
