import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = 'src/app/shared/infrastructure/api-clients/pact';
for (const entry of readdirSync(root, { recursive: true, withFileTypes: true })) {
  if (!entry.isFile()) continue;
  const path = join(entry.parentPath, entry.name);
  writeFileSync(path, readFileSync(path, 'utf8').replace(/[\t ]+$/gm, ''));
}
