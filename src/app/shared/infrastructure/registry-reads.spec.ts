import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { RegistryRepository } from '../../features/registry/domain/registry.repository';
import { VerificationRepository } from '../../features/verifications/domain/verification.repository';
import { PACT_FETCH, PactTransport } from './pact-transport';
import { provideRegistryReads } from './registry.providers';

const id = 'd6f2a36b-f87d-4e51-810b-b58368fa08e7';
const bindingId = 'e8df3223-76db-4963-a0a8-74d21c86c469';
const commit = 'ab'.repeat(20);
const hash = 'cd'.repeat(32);
const date = '2026-11-03T10:30:00.000Z';
const provenance = { sourceRef: 'refs/heads/main', buildUrl: 'https://ci.example.test/runs/123', publisherId: 'source-ci' };
const publication = { id, bindingId, artifactSha256: hash, kind: 'OpenApi', specificationVersion: '3.1.1', sourceApplicationId: 'invoice', commitSha: commit, consumerApplicationId: null, providerApplicationId: 'invoice', ...provenance, publishedAt: date };
const run = {
  id, bindingId, consumerVersionId: id, providerVersionId: bindingId, consumerPublicationId: id,
  consumerApplicationId: 'payments', consumerCommitSha: commit, providerApplicationId: 'invoice', providerCommitSha: 'ef'.repeat(20),
  contractSha256: hash, status: 'Failed', summary: 'An expected field is absent.', ciRunId: '12345678901234567890', ciAttempt: 2,
  ciCheckId: 'contract-http', verifierName: 'pact-http', verifierVersion: '1.2.3', configurationSha256: '01'.repeat(32), ...provenance,
  startedAt: date, finishedAt: date, recordedAt: date, expectedInteractions: 2, verifiedInteractions: 2, failedInteractions: 1,
  issues: [], evidenceUrls: ['https://ci.example.test/evidence/123'],
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('anonymous Pact read boundary through the real generated client', () => {
  const fetchMock = vi.fn<typeof fetch>();
  let registry: RegistryRepository;
  let verifications: VerificationRepository;

  beforeEach(() => {
    fetchMock.mockReset();
    TestBed.configureTestingModule({ providers: [provideRegistryReads(), { provide: PACT_FETCH, useValue: fetchMock }] });
    registry = TestBed.inject(RegistryRepository);
    verifications = TestBed.inject(VerificationRepository);
  });

  function address(index = 0): URL { return new URL(String(fetchMock.mock.calls[index][0])); }

  it('uses a lazy GET, an anonymous same-origin URL, and opaque query/cursor values', async () => {
    const cursor = 'opaque+/=&?%cursor';
    fetchMock.mockResolvedValue(json({ items: [{ applicationId: 'payments', versionCount: 3 }], nextCursor: cursor }));
    const read = registry.applications({ limit: 12, after: cursor, search: 'pay' });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await firstValueFrom(read)).toEqual({ items: [{ applicationId: 'payments', versionCount: 3 }], nextCursor: cursor });
    expect(address().origin).toBe(document.location.origin);
    expect(address().pathname).toBe('/backend/api/applications');
    expect(Object.fromEntries(address().searchParams)).toEqual({ after: cursor, limit: '12', search: 'pay' });
    const init = fetchMock.mock.calls[0][1];
    expect(init).toMatchObject({ method: 'GET', credentials: 'omit', redirect: 'error', cache: 'no-store' });
    expect(new Headers(init?.headers).has('authorization')).toBe(false);
  });

  it('maps empty pages without inventing evidence and handles integer strings from the contract', async () => {
    fetchMock.mockResolvedValueOnce(json({ items: [], nextCursor: null }));
    expect(await firstValueFrom(registry.applications())).toEqual({ items: [], nextCursor: null });
    fetchMock.mockResolvedValueOnce(json({ items: [{ applicationId: 'invoice', versionCount: '42' }], nextCursor: null }));
    expect((await firstValueFrom(registry.applications())).items[0].versionCount).toBe(42);
  });

  it('maps exact versions, nullable image provenance and encoded path segments', async () => {
    const value = { id, applicationId: 'payments', commitSha: commit, repositoryUrl: 'https://github.com/example/payments', imageDigest: null, registeredAt: date };
    fetchMock.mockResolvedValueOnce(json({ items: [value], nextCursor: 'next' })).mockResolvedValueOnce(json(value));
    expect(await firstValueFrom(registry.versions('payments', { limit: 5 }))).toEqual({ items: [value], nextCursor: 'next' });
    expect(await firstValueFrom(registry.version('payments/ @?#', commit))).toEqual(value);
    expect(address(1).pathname).toBe(`/backend/api/applications/payments%2F%20%40%3F%23/versions/${commit}`);
    expect(address(0).searchParams.get('limit')).toBe('5');
  });

  it('keeps directed integrations separate from verification status', async () => {
    const value = { id, consumerApplicationId: 'payments', providerApplicationId: 'invoice', registeredAt: date };
    fetchMock.mockResolvedValueOnce(json({ items: [value], nextCursor: null })).mockResolvedValueOnce(json(value));
    expect((await firstValueFrom(registry.integrations({ applicationId: 'invoice', limit: 20 }))).items).toEqual([value]);
    expect(await firstValueFrom(registry.integration('payments', 'invoice'))).toEqual(value);
    expect(address(0).searchParams.get('applicationId')).toBe('invoice');
    expect(address(1).pathname).toBe('/backend/api/integrations/payments/invoice');
  });

  it('maps publications and artifacts without abbreviating immutable identities', async () => {
    const summary = { ...publication, sourceVersionId: id, repositoryUrl: 'https://github.com/example/invoice' };
    const artifact = { sha256: hash, kind: 'OpenApi', specificationVersion: '3.1.1', length: 8, storedAt: date };
    fetchMock.mockResolvedValueOnce(json({ items: [summary], nextCursor: null })).mockResolvedValueOnce(json(publication)).mockResolvedValueOnce(json(artifact));
    const item = (await firstValueFrom(registry.publications({ commitSha: commit, contractSha256: hash, sourceRef: 'refs/heads/feature/a + b' }))).items[0];
    expect(item).toMatchObject({ id, artifactSha256: hash, commitSha: commit, sourceVersionId: id, repositoryUrl: summary.repositoryUrl });
    expect(item).not.toHaveProperty('additionalData');
    expect(address(0).searchParams.get('sourceRef')).toBe('refs/heads/feature/a + b');
    expect(await firstValueFrom(registry.publication(id))).toEqual(publication);
    expect(await firstValueFrom(registry.artifact(hash))).toEqual(artifact);
    expect(address(1).pathname).toBe(`/backend/api/contract-publications/${id}`);
    expect(address(2).pathname).toBe(`/backend/api/artifacts/${hash}`);
  });

  it('returns original artifact bytes without parsing or reserializing JSON', async () => {
    const bytes = new TextEncoder().encode('{\n "n":9007199254740993, "x": null\n}\n');
    fetchMock.mockResolvedValue(new Response(bytes, { headers: { 'Content-Type': 'application/json' } }));
    expect(Array.from(new Uint8Array(await firstValueFrom(registry.artifactContent(hash))))).toEqual(Array.from(bytes));
    expect(address().pathname).toBe(`/backend/api/artifacts/${hash}/content`);
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get('accept')).toBe('application/octet-stream');
  });

  it.each(['Passed', 'Failed', 'Error', 'Unverified'])('preserves the %s status and the exact evidence selection', async status => {
    fetchMock.mockResolvedValue(json({ items: [{ ...run, status, issueCount: 1 }], nextCursor: 'cursor' }));
    const value = await firstValueFrom(verifications.runs({ consumerCommitSha: commit, providerCommitSha: run.providerCommitSha, contractSha256: hash, ciRunId: run.ciRunId, ciAttempt: 2, ciCheckId: run.ciCheckId, configurationSha256: run.configurationSha256, status: 'Failed', jsonPath: '$.invoice[0].id', issueCode: 'missing-field', limit: 10 }));
    expect(value.items[0]).toMatchObject({ status, ciRunId: run.ciRunId, ciAttempt: 2, ciCheckId: run.ciCheckId, contractSha256: hash, consumerCommitSha: commit, providerCommitSha: run.providerCommitSha, configurationSha256: run.configurationSha256 });
    expect(value.nextCursor).toBe('cursor');
    expect(address().pathname).toBe('/backend/api/reports/verification-runs');
    expect(address().searchParams.get('jsonPath')).toBe('$.invoice[0].id');
    expect(address().searchParams.get('ciRunId')).toBe(run.ciRunId);
    expect(address().searchParams.get('ciAttempt')).toBe('2');
  });

  it('preserves missing, null, false, zero, nested JSON and precise numeric diagnostic text', async () => {
    const issue = { kind: 'Response', code: 'Mismatch', message: '<script>external text</script>', interaction: 'get invoice', method: 'GET', path: '/invoice', jsonPath: '$.amount', actualPresent: false, evidenceUrl: 'https://ci.example.test/evidence' };
    const body = JSON.stringify({ ...run, issues: [issue, { ...issue, actualPresent: true, expected: null, actual: null }, { ...issue, actualPresent: true, expected: false, actual: 0 }, { ...issue, expected: 'EXACT_NUMBER', actual: { deep: ['EXACT_DECIMAL', 'text'] } }] }).replace('"EXACT_NUMBER"', '9007199254740993').replace('"EXACT_DECIMAL"', '0.123456789012345678901');
    fetchMock.mockResolvedValue(new Response(body, { headers: { 'Content-Type': 'application/json' } }));
    const value = await firstValueFrom(verifications.run(id));
    expect(value).toMatchObject({ bindingId, consumerVersionId: id, providerVersionId: bindingId, expectedInteractions: 2, verifiedInteractions: 2, failedInteractions: 1, evidenceUrls: run.evidenceUrls });
    expect(value.issues[0]).toMatchObject({ expected: { present: false }, actual: { present: false }, actualPresent: false, message: issue.message });
    expect(value.issues[1]).toMatchObject({ expected: { present: true, json: 'null' }, actual: { present: true, json: 'null' } });
    expect(value.issues[2]).toMatchObject({ expected: { present: true, json: 'false' }, actual: { present: true, json: '0' } });
    expect(value.issues[3]).toMatchObject({ expected: { present: true, json: '9007199254740993' }, actual: { present: true, json: '{"deep":[0.123456789012345678901,"text"]}' } });
  });

  it.each(['Unknown', undefined, null])('rejects unknown or absent status %s instead of showing success', async status => {
    fetchMock.mockResolvedValue(json({ items: [{ ...run, status, issueCount: 0 }], nextCursor: null }));
    await expect(firstValueFrom(verifications.runs())).rejects.toMatchObject({ kind: 'invalid-response' });
  });

  it.each([undefined, -1, 1.5, '9007199254740993'])('rejects missing, invalid or unsafe count %s', async versionCount => {
    fetchMock.mockResolvedValue(json({ items: [{ applicationId: 'payments', versionCount }], nextCursor: null }));
    await expect(firstValueFrom(registry.applications())).rejects.toMatchObject({ kind: 'invalid-response' });
  });

  it('returns asynchronous validation errors before issuing invalid numeric queries', async () => {
    await expect(firstValueFrom(registry.applications({ limit: 0 }))).rejects.toMatchObject({ kind: 'validation' });
    await expect(firstValueFrom(verifications.runs({ ciAttempt: 1.5 }))).rejects.toMatchObject({ kind: 'validation' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([[400, 'validation'], [422, 'validation'], [404, 'not-found'], [502, 'unavailable'], [503, 'unavailable'], [504, 'unavailable'], [500, 'service'], [403, 'service']])('maps HTTP %i without leaking internal details', async (status, kind) => {
    fetchMock.mockResolvedValue(json({ title: 'Internal exception', detail: 'database password secret', status: 200, traceId: 'trace-123', errors: { after: ['Cursor does not match filters.'], invalid: 'not an array' } }, Number(status)));
    const error = await firstValueFrom(registry.applications()).catch((value: unknown) => value);
    expect(error).toMatchObject({ kind, status, traceId: 'trace-123' });
    expect(JSON.stringify(error)).not.toContain('password');
    if (status === 400 || status === 422) expect(error).toMatchObject({ validation: { after: ['Cursor does not match filters.'] } });
  });

  it('maps HTML, broken ProblemDetails, malformed success, empty success and network failure safely', async () => {
    fetchMock.mockResolvedValueOnce(new Response('<h1>proxy secret</h1>', { status: 502, headers: { 'Content-Type': 'text/html' } }));
    await expect(firstValueFrom(registry.applications())).rejects.toMatchObject({ kind: 'unavailable', traceId: null });
    fetchMock.mockResolvedValueOnce(new Response('{broken', { status: 503, headers: { 'Content-Type': 'application/problem+json' } }));
    await expect(firstValueFrom(registry.applications())).rejects.toMatchObject({ kind: 'unavailable' });
    fetchMock.mockResolvedValueOnce(new Response('{broken', { headers: { 'Content-Type': 'application/json' } }));
    await expect(firstValueFrom(registry.applications())).rejects.toMatchObject({ kind: 'invalid-response' });
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(firstValueFrom(registry.applications())).rejects.toMatchObject({ kind: 'invalid-response' });
    fetchMock.mockRejectedValueOnce(new TypeError('sensitive transport exception'));
    await expect(firstValueFrom(registry.applications())).rejects.toMatchObject({ kind: 'network', message: 'The registry could not be reached.' });
  });

  it('rejects cross-origin, out-of-boundary and credential-bearing requests', async () => {
    const transport = TestBed.inject(PactTransport);
    for (const url of ['https://external.example/api/applications', `${document.location.origin}/api/applications`]) {
      await expect(firstValueFrom(transport.read(api => api.api.applications.withUrl(url).get(), dto => dto))).rejects.toMatchObject({ kind: 'invalid-response' });
    }
    for (const name of ['Authorization', 'Proxy-Authorization', 'Cookie']) {
      await expect(firstValueFrom(transport.read(api => api.api.applications.get({ headers: { [name]: 'credential' } }), dto => dto))).rejects.toMatchObject({ kind: 'invalid-response' });
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('aborts in-flight work on unsubscribe and never emits a stale response', async () => {
    let resolve!: (response: Response) => void;
    fetchMock.mockImplementation(() => new Promise<Response>(done => { resolve = done; }));
    const next = vi.fn();
    const subscription = registry.applications().subscribe(next);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const signal = fetchMock.mock.calls[0][1]?.signal;
    expect(signal?.aborted).toBe(false);
    subscription.unsubscribe();
    expect(signal?.aborted).toBe(true);
    resolve(json({ items: [], nextCursor: null }));
    await Promise.resolve();
    expect(next).not.toHaveBeenCalled();
  });

  it('isolates concurrent diagnostic responses even when they finish in reverse order', async () => {
    const pending: ((response: Response) => void)[] = [];
    fetchMock.mockImplementation(() => new Promise<Response>(done => pending.push(done)));
    const before = firstValueFrom(verifications.run(id));
    const after = firstValueFrom(verifications.run(bindingId));
    await vi.waitFor(() => expect(pending).toHaveLength(2));
    const issue = { kind: 'Response', code: 'Mismatch', message: 'field differs' };
    pending[1](json({ ...run, id: bindingId, issues: [{ ...issue, actual: null }] }));
    expect((await after).issues[0].actual).toEqual({ present: true, json: 'null' });
    pending[0](json({ ...run, issues: [issue] }));
    expect((await before).issues[0].actual).toEqual({ present: false });
  });
});
