import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const manifest = JSON.parse(readFileSync('contracts/upstream/manifest.json', 'utf8'));
const bytes = readFileSync(manifest.specPath);
assert.equal(createHash('sha256').update(bytes).digest('hex'), manifest.specSha256, 'Upstream OpenAPI hash drift');
assert.match(manifest.sourceCommit, /^[a-f0-9]{40}$/);
assert.match(manifest.sourceTree, /^[a-f0-9]{40}$/);
const spec = JSON.parse(bytes);
assert.equal(spec.openapi, '3.1.1');
function checkReferences(value) {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (key === '$ref') assert.ok(typeof child === 'string' && child.startsWith('#/'), 'External OpenAPI references are not pinned');
    else checkReferences(child);
  }
}
checkReferences(spec);
const generated = 'src/app/shared/infrastructure/api-clients/';
for (const entry of readdirSync('src/app', { recursive: true, withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.ts')) continue;
  const path = join(entry.parentPath, entry.name);
  const source = readFileSync(path, 'utf8');
  if (path.startsWith(generated)) assert.doesNotMatch(source, /^\s+(post|put|patch|delete):\s*\{/m, 'Generated browser client must be read-only');
  else if (!path.includes('/infrastructure/') && !['src/app/app.config.ts', 'src/app/features/registry/registry.routes.ts', 'src/app/features/verifications/verification.routes.ts'].includes(path)) {
    assert.doesNotMatch(source, /from\s+['"][^'"]*(?:api-clients|kiota|infrastructure\/)/, `${path} must not import transport infrastructure`);
  }
}
console.log(`Pinned Pact OpenAPI verified at ${manifest.sourceCommit}.`);
