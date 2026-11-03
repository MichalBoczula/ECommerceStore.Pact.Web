# ECommerceStore.Pact.Web

Angular SPA for the ECommerceStore Pact contract registry. WEB/01 establishes the workspace,
responsive application shell, navigation, theme and verification pipeline. No registry API is
called yet. Section pages are intentional empty states; no sample results are shown as live evidence.

## Run locally

Use Node 22.12+ (or Node 24), npm 11 and Bash for the verification scripts.

```bash
npm ci
npm start
```

Open http://localhost:4200. No backend, database, publisher token or Azure deployment is required
for this foundation. `/` opens `/overview`. Applications, dependencies, contracts, verifications,
compatibility and issue history have bookmarkable routes. An unknown route has a recovery page.

## Verification

```bash
npx playwright install --with-deps chromium
npm run verify
```

`npm run verify` runs source checks, a high/critical dependency audit, lint, production build,
Vitest coverage and Playwright shell smoke tests. On Windows use Git Bash or WSL. The smoke suite
starts Angular itself. Individual stages are available as `bash scripts/ci.sh source|audit|build|unit|smoke`.

Unit JUnit output is `TestResults/unit.xml`; coverage is under `coverage/`. Browser reports,
failure screenshots and traces are under `TestResults/`. CI runs on PRs targeting `main` and pushes
to `main`, includes dependency review and secret scanning, and requires every mandatory job in
`quality-gate`. This foundation does not publish images or deploy infrastructure.

## Architecture and design

- Standalone Angular 21, OnPush components, strict TypeScript/templates, Material and SCSS.
- NgRx root registration and development-only DevTools; feature stores/effects/facades arrive
  with their use cases. No synthetic business state or placeholder HTTP repository is introduced.
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

Next: WEB/02 adds browsable dashboard read contracts to the API; WEB/03 pins those contracts and
adds the generated Kiota boundary. Browser reads will use `/backend/api/...` through the local
proxy/Nginx, while CI remains responsible for publishing registry evidence.
