import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

function snapshot() {
  const root = 'src/app/shared/infrastructure/api-clients/pact';
  return Object.fromEntries(readdirSync(root, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile() && !entry.name.endsWith('.log')).map(entry => {
      const path = join(entry.parentPath, entry.name);
      return [path, readFileSync(path, 'utf8')];
    }).sort(([a], [b]) => a.localeCompare(b)));
}
const before = snapshot();
execFileSync('bash', ['scripts/generate-api-client.sh'], { stdio: 'inherit' });
const after = snapshot();
const changed = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(path => before[path] !== after[path]);
if (changed.length) throw new Error(`Generated client drift. Regenerate and commit all output with the reviewed contract.\n${changed.join('\n')}`);
console.log('Generated client matches pinned contract and generator.');
