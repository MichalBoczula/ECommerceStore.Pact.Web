# ECommerceStore.Pact.Web

Angular SPA for the ECommerceStore Pact contract registry. The Angular shell and anonymous API
read boundary, registry explorer and verification history/details are implemented. Applications,
Dependencies, Contracts and Verifications read the registry; overview, compatibility and issue
history retain intentional empty states. No sample results are shown as live evidence.

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
Vitest coverage and Playwright shell smoke tests. On Windows use Git Bash or WSL. The smoke suite
starts Angular itself. Individual stages are available as `bash scripts/ci.sh source|contract|audit|build|unit|smoke`.

Unit JUnit output is `TestResults/unit.xml`; coverage is under `coverage/`. Browser reports,
failure screenshots and traces are under `TestResults/`. CI runs on PRs targeting `main` and pushes
to `main`, includes dependency review and secret scanning, and requires every mandatory job in
`quality-gate`. This foundation does not publish images or deploy infrastructure.

## Architecture and design

- Standalone Angular 21, OnPush components, strict TypeScript/templates, Material and SCSS.
- NgRx root registration and development-only DevTools; feature stores/effects/facades arrive
  with their screens. The registry explorer and verification evidence have facades, feature state
  and cancellable effects.
  Registry and verification repository ports expose handwritten read models;
  generated Kiota DTOs stay in infrastructure.
- Seven navigation destinations, responsive Material drawer, active-link semantics, skip link,
  document titles, and a not-found route. The explorer adds cursor pagination, bookmarkable filters,
  full provenance and original-byte artifact downloads. Verification views add exact evidence filters,
  four distinct statuses and lossless expected/actual diagnostics. Browser smoke covers accessibility.
- Roboto and Material Icons are served locally with licenses; no Google Fonts request is required.
- Distinct theme tokens reserve Passed, Failed, Error and Unverified without assigning statuses
  to records that have no verification evidence.

[Architecture decisions](docs/architecture.md) · [Delivery backlog](TECHNICAL_TODO.md) ·
[Approved Figma concepts](https://www.figma.com/design/5MNjC3C2tH2MEwBdtw34B5?node-id=5-1661)

The explorer extends the approved shell, cards, typography and Material control patterns.
See [explorer routes and evidence scope](docs/explorer.md) and [verification history and details](docs/verifications.md).
Dashboard graphs, summary counts, contract comparisons and comparable issue timelines follow in
their backlog items.

## Related repositories

- [Pact API](https://github.com/MichalBoczula/ECommerceStore.Pact)
- [Angular reference patterns](https://github.com/MichalBoczula/ecommerce-store-web)
- [Existing Terraform root and state](https://github.com/MichalBoczula/ECommerceStore.Terraform)

WEB/02 is merged in the API; WEB/03 pins its OpenAPI and adds the read boundary. WEB/04 implements
the application, version, integration and publication explorer. WEB/05 adds verification history
and diagnostic details. Next: WEB/06 adds stored contract comparisons and comparable issue history. Production Nginx/image delivery follows in WEB/10;
CI remains responsible for publishing registry evidence.
