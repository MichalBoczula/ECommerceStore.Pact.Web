import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

// Synthetic acceptance data, published through the real API. This is not source-CI Pact verification.
export async function seedRegistry(baseUrl, token) {
  const repositories = { payments: 'https://github.com/MichalBoczula/ECommerceStorePayments', invoice: 'https://github.com/MichalBoczula/ECommerceStoreInvoice', web: 'https://github.com/MichalBoczula/ECommerceStore.Pact.Web', bff: 'https://github.com/MichalBoczula/ECommerceStore.BFF' };
  const consumerCommit = 'a'.repeat(40); const changedConsumerCommit = 'b'.repeat(40); const providerCommit = 'c'.repeat(40); const fixedProviderCommit = 'd'.repeat(40);
  const baselineRef = 'refs/heads/feature/provider+fix'; const configurationSha256 = 'e'.repeat(64); const ciRunId = '9223372036854775808';
  const sha = value => createHash('sha256').update(value).digest('hex');
  const precise = body => JSON.stringify(body).replaceAll('"__PRECISE__"', '9007199254740993');
  const read = async path => { const r = await fetch(`${baseUrl}${path}`); assert.equal(r.status, 200, `Read ${path}: ${r.status}`); return r.json(); };
  const post = async (path, body, authenticated = true) => {
    const response = await fetch(`${baseUrl}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', ...(authenticated ? { authorization: `Bearer ${token}` } : {}) }, body: precise(body) });
    if (!response.ok) throw new Error(`Seed ${path} failed (${response.status}): ${await response.text()}`);
    return response.json();
  };
  const denied = await fetch(`${baseUrl}/api/integrations`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ consumerApplicationId: 'payments', providerApplicationId: 'invoice' }) });
  assert.equal(denied.status, 401, 'Anonymous publication must remain closed');
  for (const [app, commits] of [['payments', [consumerCommit, changedConsumerCommit]], ['invoice', [providerCommit, fixedProviderCommit]], ['web', ['f'.repeat(40)]], ['bff', ['1'.repeat(40)]]]) {
    for (const commitSha of commits) await post(`/api/applications/${app}/versions`, { commitSha, repositoryUrl: repositories[app] });
  }
  const integration = await post('/api/integrations', { consumerApplicationId: 'payments', providerApplicationId: 'invoice' });
  const untested = await post('/api/integrations', { consumerApplicationId: 'web', providerApplicationId: 'bff' });
  const originalPact = '{\n  "consumer":{"name":"payments"},"provider":{"name":"invoice"},"interactions":[{"description":"read an order","request":{"method":"GET","path":"/orders/123"},"response":{"status":200,"body":{"totalAmount":9007199254740993,"nullable":null}}}],"metadata":{"pactSpecification":{"version":"3.0.0"}}\n}\n';
  const changedPact = originalPact.replace('"totalAmount":9007199254740993,', '');
  const openApi = '{"openapi":"3.0.3","info":{"title":"WEB/09 synthetic orders","version":"1"},"paths":{"/orders/{id}":{"get":{"parameters":[{"in":"path","name":"id","required":true,"schema":{"type":"string"}}],"responses":{"200":{"description":"Order"}}}}}}';
  const publish = (app, commitSha, content, consumer = true) => post('/api/contract-publications', { sourceApplicationId: app, commitSha, kind: consumer ? 'ConsumerPact' : 'ProviderOpenApi',
    ...(consumer ? { consumerApplicationId: 'payments', providerApplicationId: 'invoice' } : {}), sourceRef: consumer ? 'refs/heads/main' : baselineRef, buildUrl: `${repositories[app]}/actions/runs/1`, contentBase64: Buffer.from(content).toString('base64') });
  const consumer = await publish('payments', consumerCommit, originalPact); const changed = await publish('payments', changedConsumerCommit, changedPact);
  const provider = await publish('invoice', providerCommit, openApi, false);
  assert.equal(consumer.artifactSha256, sha(originalPact));
  const bytes = await fetch(`${baseUrl}/api/artifacts/${consumer.artifactSha256}/content`).then(r => r.text()); assert.equal(bytes, originalPact);
  const issue = { kind: 'Mismatch', code: 'missing_field', message: '<img src=x onerror=alert(1)> missing totalAmount', interaction: 'read an order', method: 'GET', path: '/orders/123', jsonPath: '$.body.totalAmount', expected: '__PRECISE__', actualPresent: false };
  const run = (status, { providerSha = providerCommit, attempt = 1, publication = consumer, check = 'pact/orders', suppliedNull = false } = {}) => post('/api/verification-runs', {
    consumerPublicationId: publication.id, consumerApplicationId: 'payments', consumerCommitSha: publication.commitSha, providerApplicationId: 'invoice', providerCommitSha: providerSha, contractSha256: publication.artifactSha256,
    verifierName: 'pact-core', verifierVersion: '1', configurationSha256, ciRunId, ciAttempt: attempt, ciCheckId: check, sourceRef: baselineRef, buildUrl: `${repositories.invoice}/actions/runs/${ciRunId}`, status,
    verifiedInteractions: status === 'Passed' ? 1 : 0, failedInteractions: status === 'Failed' ? 1 : 0, summary: `WEB/09 synthetic ${status} report`,
    issues: status === 'Failed' ? [{ ...issue, ...(suppliedNull ? { actualPresent: true, actual: null } : {}) }] : status === 'Error' ? [{ kind: 'ExecutionError', code: 'provider_unavailable', message: 'Synthetic acceptance execution error' }] : [],
    evidenceUrls: [], startedAt: '2026-11-04T00:00:00Z', finishedAt: '2026-11-04T00:00:01Z',
  });
  const failed = await run('Failed'); const persisting = await run('Failed', { attempt: 2, suppliedNull: true });
  const passed = await run('Passed', { providerSha: fixedProviderCommit }); const error = await run('Error', { attempt: 3 });
  const unverified = await run('Unverified', { providerSha: fixedProviderCommit, attempt: 2 }); const requirementsChanged = await run('Passed', { providerSha: fixedProviderCommit, publication: changed });
  const history = async after => read(`/api/issue-history?${new URLSearchParams({ beforeRunId: failed.id, afterRunId: after.id, baselineRef })}`);
  assert.equal((await history(passed)).issues[0].transition, 'Resolved'); assert.equal((await history(persisting)).issues[0].transition, 'Persisting'); assert.equal((await history(requirementsChanged)).issues[0].transition, 'RequirementsChanged');
  const required = checkId => ({ checkId, verifierName: 'pact-core', verifierVersion: '1', configurationSha256 });
  const profile = await post('/api/verification-profiles', { consumerApplicationId: 'payments', providerApplicationId: 'invoice', name: 'web-acceptance', version: '1', checks: [required('pact/orders')] });
  const twoChecks = await post('/api/verification-profiles', { consumerApplicationId: 'payments', providerApplicationId: 'invoice', name: 'web-acceptance', version: '2', checks: [required('pact/orders'), required('pact/serializer')] });
  const row = providerSha => ({ consumerCommitSha: consumerCommit, providerCommitSha: providerSha, contractSha256: consumer.artifactSha256, ciRunId, ciAttempt: 1, providerSourceRef: baselineRef });
  const evaluate = (selectedProfile, rows) => post('/api/compatibility-decisions', { sourceApplicationId: 'invoice', profileId: selectedProfile.id, rows });
  const mixed = await evaluate(profile, [row(providerCommit), row(fixedProviderCommit)]); assert.equal(mixed.status, 'Failed'); assert.equal(mixed.compatible, false);
  const missing = await evaluate(twoChecks, [row(fixedProviderCommit)]); assert.deepEqual(missing.rows[0].missingChecks, ['pact/serializer']);
  const serializer = await run('Passed', { providerSha: fixedProviderCommit, check: 'pact/serializer' });
  const complete = await evaluate(twoChecks, [row(fixedProviderCommit)]); assert.equal(complete.compatible, true);
  assert.equal((await read(`/api/compatibility-decisions/${missing.id}`)).status, 'Unverified');
  const comparison = await post('/api/contract-comparisons', { sourceApplicationId: 'payments', consumerApplicationId: 'payments', providerApplicationId: 'invoice', beforePublicationId: consumer.id, afterPublicationId: changed.id, baselineRef: 'refs/heads/main' });
  assert.equal(comparison.consumerImpact, 'NotEvaluated'); assert.equal(comparison.schemaAssessment, 'NotAssessed');
  assert.equal((await read(`/api/verification-runs/${failed.id}`)).status, 'Failed');
  return { synthetic: true, purpose: 'WEB/09 isolated real registry browser acceptance, not source-CI verification', consumerCommit, changedConsumerCommit, providerCommit, fixedProviderCommit, baselineRef, configurationSha256, ciRunId,
    originalPact, openApi, consumer, changed, provider, integration, untested,
    runs: Object.fromEntries(Object.entries({ failed, persisting, passed, error, unverified, requirementsChanged, serializer }).map(([key, value]) => [key, { id: value.id, status: value.status, providerCommitSha: value.providerCommitSha, ciAttempt: value.ciAttempt }])),
    profiles: { profile, twoChecks }, decisions: { mixed, missing, complete }, comparison };
}
