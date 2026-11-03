# WEB/01 verification record

Local verification on 2026-11-03 used Node 24.22.1 and npm 11.9.0, within the declared engines.
CI selects Node 22 and npm 11.5.2. The repository lockfile was verified with a clean `npm ci`.

| Check | Result |
| --- | --- |
| Locked install (`npm ci --no-audit --no-fund`) | Passed |
| Source whitespace, shell syntax and ESLint configuration syntax | Passed |
| Application/spec TypeScript checks (`tsc --noEmit`) | Passed |
| Angular/template lint | Passed |
| Production Angular build | Passed; lazy overview, section and not-found chunks |
| Vitest coverage | 5 tests passed; 96.2% statements, 92% branches, 100% functions, 94.28% lines |
| Playwright shell smoke | 4 tests passed, including desktop/mobile axe checks |
| Dependency audit | Passed configured high/critical gate; 0 high, 0 critical; 33 moderate transitive tooling findings remain |
| CI workflow YAML and mandatory job coverage | Parsed; every verification job is included in quality-gate |
| Vendored font checksums | Match the source values in public/fonts/README.md |
| Hosted GitHub CI, gitleaks and dependency-review action | Pending; tracked by the feature PR checks |

The environment returned invalid archives for Playwright's normal Chromium download. Browser
checks used a temporary configuration outside the repository with separately installed Chromium
153.0.8010.0 from `@sparticuz/chromium@153.0.0`. The committed CI configuration continues to install
and use Playwright's normal pinned Chromium. No browser assertions, accessibility rules, quality
gates or dependencies were bypassed to obtain a passing run. The alternate binary is not an
application dependency and is not committed. This local run does not establish hosted CI success.

API integration, registry-backed browser acceptance, image publication and hosted deployment are
planned work, not outcomes established by these UI foundation checks.
