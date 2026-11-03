# ECommerceStore.Pact.Web

Angular SPA for the ECommerceStore Pact contract registry. The Angular shell and anonymous API
read boundary are implemented. Section pages remain intentional empty states until WEB/04-08;
no sample results are shown as live evidence and the shell does not request registry data.

## Run locally

Use Node 22.12+ (or Node 24), npm 11 and Bash for the verification scripts.

```bash
npm ci
npm start
```

Open http://localhost:4200. No backend, database, publisher token or Azure deployment is required
to navigate the shell. `/` opens `/overview`. Applications, dependencies, contracts, verifications,
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
  with their screens. Registry and verification repository ports expose handwritten read models;
  generated Kiota DTOs stay in infrastructure.
- Seven navigation destinations, responsive Material drawer, active-link semantics, skip link,
  document titles, and a not-found route. Browser smoke tests cover navigation and accessibility.
- Roboto and Material Icons are served locally with licenses; no Google Fonts request is required.
- Distinct theme tokens reserve Passed, Failed, Error and Unverified without assigning statuses
  to records that have no verification evidence.

[Architecture decisions](docs/architecture.md) · [Delivery backlog](TECHNICAL_TODO.md) ·
[Approved Figma concepts](https://www.figma.com/design/5MNjC3C2tH2MEwBdtw34B5?node-id=5-1661)

The foundation implements the shared shell from the design. Dashboard graphs, counts, filters,
diagnostics and timelines follow in their backlog items after the API read contracts stabilize.

## Related repositories

- [Pact API](https://github.com/MichalBoczula/ECommerceStore.Pact)
- [Angular reference patterns](https://github.com/MichalBoczula/ecommerce-store-web)
- [Existing Terraform root and state](https://github.com/MichalBoczula/ECommerceStore.Terraform)

WEB/02 is merged in the API; WEB/03 pins its OpenAPI and adds read repositories, mappers, safe
ProblemDetails errors, cancellation and contract drift checks. Next: WEB/04 builds the application,
version, integration and publication explorer. Production Nginx/image delivery follows in WEB/10;
CI remains responsible for publishing registry evidence.
