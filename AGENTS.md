# Agent instructions

Read README.md, TECHNICAL_TODO.md and docs/architecture.md before editing.
Scope each PR to its backlog item. Code, commits, documentation and PRs are in English.

- Follow the storefront's standalone Angular, Material, SCSS and NgRx patterns.
- Presentation uses facades; state/effects coordinate use cases. Feature repository ports and explicit mappers isolate generated Kiota DTOs. Add these layers when the feature needs them, not as empty scaffolding.
- Generate clients from reviewed, pinned OpenAPI. Never hand-edit generated output.
- Browser requests use the frontend's same-origin proxy boundary once WEB/03 adds it. Publisher credentials belong in CI, never the browser or public assets.
- Preserve exact commit, contract hash, profile and CI execution identities. Display abbreviations only with access to full values.
- Keep Passed, Failed, Error and Unverified distinct. Declared integration, schema change, verification outcome and compatibility decision are separate concepts.
- Dependency graphs represent declared/tested relationships, not runtime traces. Missing evidence is never a passing result.
- Render external diagnostic values as text. Missing and null are distinct. Preserve append-only evidence and the API's comparable-history policy.
- Do not present design examples or fixture results as live registry data. Preserve honest empty, loading, unavailable and error states.
- Keep fonts/assets local, preserve licenses, and use the approved Figma layout and tokens. Support keyboard and mobile navigation.
- Run bash scripts/verify.sh, or the affected scripts/ci.sh stages, and report only checks actually run. Preserve lockfiles and the fail-closed CI quality gate.
- Image publication and Terraform/cloud work belong to WEB/10-12. Use the existing Terraform root/state when those tasks are implemented.
- Mark a backlog item complete only after its acceptance criteria are verified. Use the PR template and describe any unavailable verification.
