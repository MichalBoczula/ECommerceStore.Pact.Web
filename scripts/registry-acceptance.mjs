import assert from 'node:assert/strict';
import { spawn, execFile } from 'node:child_process';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer, connect } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { seedRegistry } from './seed-registry-acceptance.mjs';
import { parse } from 'lossless-json';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(root, 'contracts/upstream/manifest.json'), 'utf8'));
const output = join(root, 'TestResults/registry'); mkdirSync(output, { recursive: true });
for (const name of ['receipt.json', 'seed.json', 'runtime.openapi.json', 'failure.log']) rmSync(join(output, name), { force: true });
const source = resolve(process.env['PACT_ACCEPTANCE_API_SOURCE'] ?? join(root, '.tools/registry-api'));
const dotnet = process.env['PACT_ACCEPTANCE_DOTNET'] ?? 'dotnet';
const dockerImage = 'mongo:8.0.15';
const children = []; const descriptors = []; const allocated = new Set();
let mongoData; let container; let interrupted = false;
const execute = promisify(execFile);
const delay = ms => new Promise(resolveDelay => setTimeout(resolveDelay, ms));
async function freePort() {
  const server = createServer(); await new Promise((done, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', done); });
  const port = server.address().port; await new Promise(done => server.close(done));
  if (allocated.has(port)) return freePort(); allocated.add(port); return port;
}
function launch(name, executable, args, options = {}) {
  const fd = openSync(join(output, `${name}.log`), 'w'); descriptors.push(fd);
  const child = spawn(executable, args, { cwd: root, detached: true, stdio: ['ignore', fd, fd], ...options });
  children.push(child); child.on('error', error => { child.launchError = error; }); return child;
}
async function complete(child, name) {
  await new Promise((done, reject) => { child.once('error', reject); child.once('exit', (code, signal) => code === 0 ? done() : reject(new Error(`${name} failed (${code ?? signal}); see ${name === 'playwright' ? 'TestResults/registry/html and acceptance.xml' : `TestResults/registry/${name}.log`}`))); });
}
async function waitFor(name, probe, timeout = 90000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline && !interrupted) {
    const failed = children.find(child => child.launchError || (child.exitCode !== null && child.exitCode !== 0));
    if (failed) throw new Error(`${name}: a required process exited; inspect TestResults/registry logs.`);
    try { if (await probe()) return; } catch { /* Service is not ready yet. */ }
    await delay(200);
  }
  throw new Error(`${name} did not become ready; inspect TestResults/registry logs.`);
}
async function ready(url) { return (await fetch(url, { signal: AbortSignal.timeout(3000) })).ok; }
function signalChildren() {
  interrupted = true;
  for (const child of [...children].reverse()) { if (child.exitCode === null && child.pid) { try { process.kill(-child.pid, 'SIGTERM'); } catch { /* Already exited. */ } } }
}
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, signalChildren);

try {
  assert.match(manifest.sourceCommit, /^[a-f0-9]{40}$/); assert.match(manifest.sourceTree, /^[a-f0-9]{40}$/);
  if (!existsSync(source)) {
    mkdirSync(dirname(source), { recursive: true });
    await execute('git', ['clone', '--no-checkout', manifest.repository, source]);
    await execute('git', ['-C', source, 'checkout', '--detach', manifest.sourceCommit]);
  }
  const git = async args => (await execute('git', ['-C', source, ...args], { maxBuffer: 1024 * 1024 })).stdout.trim();
  assert.equal(await git(['rev-parse', 'HEAD']), manifest.sourceCommit, 'Check out the exact API commit from contracts/upstream/manifest.json.');
  assert.equal(await git(['rev-parse', 'HEAD^{tree}']), manifest.sourceTree, 'Pinned API source tree mismatch.');
  assert.equal(await git(['status', '--porcelain', '--untracked-files=all']), '', 'Acceptance requires a clean pinned API checkout.');
  const sdk = (await execute(dotnet, ['--version'])).stdout.trim();
  assert.match(sdk, /^10\./, 'Install .NET SDK 10.');
  const project = join(source, 'src/ECommerceStore.Pact.Api/ECommerceStore.Pact.Api.csproj');
  await complete(launch('api-restore', dotnet, ['restore', project, '--locked-mode', '--disable-parallel', '-p:BuildInParallel=false', '-m:1'], { cwd: source }), 'api-restore');
  const apiDirectory = join(root, '.tools/registry-acceptance-api');
  await complete(launch('api-publish', dotnet, ['publish', project, '--no-restore', '--configuration', 'Release', '--output', apiDirectory, '--disable-build-servers', '-m:1'], { cwd: source }), 'api-publish');

  let mongoUrl; let mongoVersion;
  if (process.env['PACT_ACCEPTANCE_MONGOD']) {
    const executable = process.env['PACT_ACCEPTANCE_MONGOD']; mongoVersion = (await execute(executable, ['--version'])).stdout.split('\n')[0];
    assert.match(mongoVersion, /v8\.0\./, 'Use MongoDB 8.0 for native acceptance.');
    mongoData = await mkdtemp(join(tmpdir(), 'pact-web-registry-')); const port = await freePort();
    launch('mongo', executable, ['--bind_ip', '127.0.0.1', '--port', String(port), '--dbpath', mongoData, '--nounixsocket', '--wiredTigerCacheSizeGB', '0.25', '--quiet']); mongoUrl = `mongodb://127.0.0.1:${port}`;
  } else {
    container = `pact-web-acceptance-${randomUUID()}`;
    await execute('docker', ['run', '--detach', '--rm', '--name', container, '--publish', '127.0.0.1::27017', dockerImage, 'mongod', '--bind_ip_all', '--nounixsocket', '--wiredTigerCacheSizeGB', '0.25'], { maxBuffer: 1024 * 1024 });
    const mapping = (await execute('docker', ['port', container, '27017/tcp'])).stdout.trim(); assert.match(mapping, /^127\.0\.0\.1:\d+$/);
    mongoUrl = `mongodb://${mapping}`; mongoVersion = (await execute('docker', ['exec', container, 'mongod', '--version'])).stdout.split('\n')[0]; assert.match(mongoVersion, /v8\.0\.15/);
  }
  const mongoPort = Number(new URL(mongoUrl).port);
  await waitFor('MongoDB TCP listener', () => new Promise(done => { const socket = connect(mongoPort, '127.0.0.1'); socket.setTimeout(500); socket.once('connect', () => { socket.destroy(); done(true); }); socket.once('error', () => done(false)); socket.once('timeout', () => { socket.destroy(); done(false); }); }));
  const apiPort = await freePort(); const unavailableApiPort = await freePort(); const closedMongoPort = await freePort();
  const basePort = await freePort(); const unavailableBasePort = await freePort();
  const apiUrl = `http://127.0.0.1:${apiPort}`; const unavailableApiUrl = `http://127.0.0.1:${unavailableApiPort}`;
  const baseUrl = `http://127.0.0.1:${basePort}`; const unavailableBaseUrl = `http://127.0.0.1:${unavailableBasePort}`;
  const token = randomBytes(32).toString('hex'); const databaseName = `pact_web_${randomUUID().replaceAll('-', '')}`;
  const cleanEnvironment = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^(RegistryAuth(?::|__)|Mongo(?::|__)|Comparison(?::|__)|ASPNETCORE_|DOTNET_ENVIRONMENT)/i.test(key)));
  const apiEnvironment = { ...cleanEnvironment, ASPNETCORE_ENVIRONMENT: 'Production', DOTNET_ENVIRONMENT: 'Production', Mongo__ConnectionString: mongoUrl, Mongo__DatabaseName: databaseName, Mongo__TimeoutSeconds: '1',
    'RegistryAuth__Publishers__browser-ci__TokenSha256': createHash('sha256').update(token).digest('hex'), 'RegistryAuth__Publishers__browser-ci__ApplicationIds__0': '*' };
  const assembly = join(apiDirectory, 'ECommerceStore.Pact.Api.dll');
  launch('api', dotnet, [assembly], { cwd: apiDirectory, env: { ...apiEnvironment, ASPNETCORE_URLS: apiUrl } });
  launch('unavailable-api', dotnet, [assembly], { cwd: apiDirectory, env: { ...cleanEnvironment, ASPNETCORE_ENVIRONMENT: 'Production', DOTNET_ENVIRONMENT: 'Production', ASPNETCORE_URLS: unavailableApiUrl, Mongo__ConnectionString: `mongodb://127.0.0.1:${closedMongoPort}`, Mongo__DatabaseName: `${databaseName}_down`, Mongo__TimeoutSeconds: '1' } });
  await waitFor('Healthy registry API', () => ready(`${apiUrl}/health/ready`)); await waitFor('Unavailable registry API process', () => ready(`${unavailableApiUrl}/health/live`));
  const pinnedOpenApi = readFileSync(join(root, manifest.specPath), 'utf8');
  assert.equal(createHash('sha256').update(pinnedOpenApi).digest('hex'), manifest.specSha256, 'Pinned OpenAPI hash mismatch.');
  const runtimeOpenApi = await fetch(`${apiUrl}/openapi/v1.json`).then(r => r.text());
  const openApi = parse(runtimeOpenApi); const expectedOpenApi = parse(pinnedOpenApi);
  // Only the ephemeral server origin differs from the reviewed export; keep every operation/schema unchanged.
  openApi.servers = expectedOpenApi.servers;
  writeFileSync(join(output, 'runtime.openapi.json'), runtimeOpenApi);
  assert.deepEqual(openApi, expectedOpenApi, 'Running API OpenAPI must match the pinned browser contract after server-origin normalization.');
  const seeded = await seedRegistry(apiUrl, token);
  const fixturePath = join(output, 'seed.json');
  writeFileSync(fixturePath, JSON.stringify({ ...seeded, baseUrl, unavailableBaseUrl, apiUrl, unavailableApiUrl, databaseName, apiCommit: manifest.sourceCommit, apiTree: manifest.sourceTree, sdk, mongoVersion }, null, 2) + '\n');
  console.log(`Registry acceptance: pinned API ${manifest.sourceCommit}, ${mongoVersion}, isolated database ${databaseName}.`);
  const config = process.env['PACT_ACCEPTANCE_CONFIG'] ?? join(root, 'playwright.registry.config.ts');
  const browser = spawn(process.execPath, [join(root, 'node_modules/@playwright/test/cli.js'), 'test', '--config', config, ...process.argv.slice(2)], { cwd: root, detached: true, stdio: 'inherit', env: { ...cleanEnvironment, PACT_REGISTRY_ACCEPTANCE_FIXTURE: fixturePath } });
  children.push(browser); await complete(browser, 'playwright');
  writeFileSync(join(output, 'receipt.json'), JSON.stringify({ suite: 'WEB/09', result: 'passed', synthetic: true, apiCommit: manifest.sourceCommit, apiTree: manifest.sourceTree,
    pinnedOpenApiSha256: manifest.specSha256, runtimeOpenApiSha256: createHash('sha256').update(runtimeOpenApi).digest('hex'), contractCheck: 'lossless structural equality after normalizing only the ephemeral server origin', sdk, mongoVersion, databaseName }, null, 2) + '\n');
} catch (error) {
  const message = error instanceof Error ? error.message : 'Registry acceptance failed.';
  writeFileSync(join(output, 'failure.log'), message + '\n'); console.error(message); process.exitCode = 1;
} finally {
  signalChildren(); await delay(300);
  for (const child of children) if (child.exitCode === null && child.pid) { try { process.kill(-child.pid, 'SIGKILL'); } catch { /* Already exited. */ } }
  if (container) { try { await execute('docker', ['rm', '--force', container]); } catch { /* Docker also removes --rm containers. */ } }
  for (const fd of descriptors) closeSync(fd);
  if (mongoData) await rm(mongoData, { recursive: true, force: true });
}
