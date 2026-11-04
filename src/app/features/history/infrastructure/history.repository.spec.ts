import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { PACT_FETCH } from '../../../shared/infrastructure/pact-transport';
import { HistoryRepository } from '../domain/history.repository';
import { KiotaHistoryRepository } from './kiota-history.repository';

const beforeId = 'f8200a17-f83c-46be-8f2e-427e14e6c665';
const afterId = 'dba64554-75b9-49a5-a87f-88892d2b9dc9';
const publication = 'd6f2a36b-f87d-4e51-810b-b58368fa08e7';
const version = '86cae4b2-3cfb-45e6-bb73-5c464c6fa5b3';
const hash = 'ab'.repeat(32);
const commit = 'cd'.repeat(20);
const date = '2026-11-04T10:00:00.000Z';
const baselineRef = 'refs/heads/provider + fix';
const issue = { kind: 'Mismatch', code: 'AmountMismatch', message: '<script>diagnostic text</script>', interaction: 'get invoice', method: 'GET', path: '/invoices', jsonPath: '$.amount', expected: '__PRECISE__', actualPresent: false, evidenceUrl: null };
const before = { id: beforeId, consumerPublicationId: publication, bindingId: publication, consumerVersionId: version, providerVersionId: version,
  consumerApplicationId: 'payments', consumerCommitSha: commit, providerApplicationId: 'invoice', providerCommitSha: 'ef'.repeat(20), contractSha256: hash,
  status: 'Failed', summary: 'A field differs.', ciRunId: '9223372036854775808', ciAttempt: 2, ciCheckId: 'pact-provider', verifierName: 'pact-http', verifierVersion: '1.2.3', configurationSha256: hash,
  sourceRef: baselineRef, buildUrl: 'https://ci.example.test/run', publisherId: 'ci', expectedInteractions: 2, verifiedInteractions: 1, failedInteractions: 1,
  issues: [issue], evidenceUrls: [], startedAt: date, finishedAt: date, recordedAt: date };
const after = { ...before, id: afterId, status: 'Passed', verifiedInteractions: 2, failedInteractions: 0, issues: [] };
const history = { policy: 'exact-pact-requirements-v1', baselineRef, comparable: true, reason: 'Exact Pact content and verifier/check configuration match.', before, after,
  issues: [{ key: '12'.repeat(32), transition: 'Resolved', before: issue, after: null }] };
const request = { beforeRunId: beforeId, afterRunId: afterId, baselineRef };
const source = { publicationId: publication, bindingId: publication, sourceVersionId: version, applicationId: 'invoice', commitSha: commit, kind: 'ProviderOpenApi', artifactSha256: hash, sourceRef: baselineRef };
const comparison = { id: beforeId, profile: 'registry-comparison-v1/oasdiff-1.35.0', consumerApplicationId: 'payments', providerApplicationId: 'invoice', before: source, after: { ...source, publicationId: afterId, commitSha: 'ef'.repeat(20), artifactSha256: '34'.repeat(32) },
  baselineRef, publisherId: 'ci', contentChanged: true, jsonChanged: true, schemaAssessment: 'PotentiallyBreaking', tool: 'oasdiff', toolVersion: '1.35.0',
  findings: [{ code: 'response-property-removed', level: 'Error', message: '<img src=x onerror=alert(1)>', method: 'GET', path: '/invoices' }], limitations: ['Consumer behavior is not evaluated.'], consumerImpact: 'NotEvaluated', comparedAt: date };

function response(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value).replaceAll('"__PRECISE__"', '9007199254740993'), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('history reads through the real generated Kiota client', () => {
  const fetchMock = vi.fn<typeof fetch>();
  let repository: HistoryRepository;
  beforeEach(() => {
    fetchMock.mockReset();
    TestBed.configureTestingModule({ providers: [{ provide: HistoryRepository, useClass: KiotaHistoryRepository }, { provide: PACT_FETCH, useValue: fetchMock }] });
    repository = TestBed.inject(HistoryRepository);
  });
  it('passes all comparison filters and opaque cursors as an anonymous GET without recomputing snapshots', async () => {
    const summary = { ...comparison, beforePublicationId: publication, afterPublicationId: afterId, sourceApplicationId: 'invoice', beforeCommitSha: commit, afterCommitSha: 'ef'.repeat(20), kind: 'ProviderOpenApi', findingCount: '1' };
    fetchMock.mockResolvedValue(response({ items: [summary], nextCursor: 'opaque+/=&?' }));
    const result = await firstValueFrom(repository.comparisons({ consumerApplicationId: 'payments', providerApplicationId: 'invoice', sourceApplicationId: 'invoice', kind: 'ProviderOpenApi', baselineRef, limit: 12, after: 'opaque+/=&?' }));
    expect(result.items[0]).toMatchObject({ id: beforeId, findingCount: 1, contentChanged: true, jsonChanged: true, schemaAssessment: 'PotentiallyBreaking', beforeCommitSha: commit });
    expect(result.nextCursor).toBe('opaque+/=&?');
    const url = new URL(String(fetchMock.mock.calls[0][0])); expect(url.pathname).toBe('/backend/api/contract-comparisons');
    expect(Object.fromEntries(url.searchParams)).toEqual({ consumerApplicationId: 'payments', providerApplicationId: 'invoice', sourceApplicationId: 'invoice', kind: 'ProviderOpenApi', baselineRef, limit: '12', after: 'opaque+/=&?' });
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'GET', credentials: 'omit' });
  });
  it('preserves full snapshot provenance, findings, limitations and explicit false values', async () => {
    fetchMock.mockResolvedValueOnce(response(comparison));
    const result = await firstValueFrom(repository.comparison(beforeId));
    expect(result.findings[0].message).toBe('<img src=x onerror=alert(1)>'); expect(result.consumerImpact).toBe('NotEvaluated');
    const unchanged = { ...comparison, after: source, contentChanged: false, jsonChanged: false, schemaAssessment: 'NoBreakingChangesDetected', findings: [], limitations: [] };
    fetchMock.mockResolvedValueOnce(response(unchanged));
    expect(await firstValueFrom(repository.comparison(beforeId))).toEqual(unchanged);
  });
  it('maps nullable history issue sides despite the generated union branch and preserves numeric precision', async () => {
    fetchMock.mockResolvedValue(response(history));
    const result = await firstValueFrom(repository.issueHistory(request));
    expect(result.issues[0]).toMatchObject({ transition: 'Resolved', after: null, before: { expected: { present: true, json: '9007199254740993' }, actual: { present: false }, actualPresent: false } });
    expect(result.before.issues[0].expected).toEqual({ present: true, json: '9007199254740993' });
    expect(result.before.ciRunId).toBe(before.ciRunId); expect(result.policy).toBe(history.policy);
    const url = new URL(String(fetchMock.mock.calls[0][0])); expect(url.pathname).toBe('/backend/api/issue-history'); expect(Object.fromEntries(url.searchParams)).toEqual(request);
  });
  it('keeps explicit null separate from missing within persistent issue sides', async () => {
    const current = { ...issue, actualPresent: true, actual: null };
    fetchMock.mockResolvedValue(response({ ...history, after: { ...before, id: afterId, issues: [current] }, issues: [{ ...history.issues[0], transition: 'Persisting', after: current }] }));
    const result = await firstValueFrom(repository.issueHistory(request));
    expect(result.issues[0].before?.actual).toEqual({ present: false }); expect(result.issues[0].after?.actual).toEqual({ present: true, json: 'null' });
  });
  it.each(['RequirementsChanged', 'VerifierChanged', 'Unconfirmed', 'Observed', 'Appeared', 'Persisting'])('preserves returned %s transitions without upgrading them to resolution', async transition => {
    let previous = { ...before }; let candidate = { ...after, issues: [issue], status: 'Failed', verifiedInteractions: 1, failedInteractions: 1 };
    let oldIssue: typeof issue | null = issue; let newIssue: typeof issue | null = issue;
    const comparable = transition !== 'RequirementsChanged' && transition !== 'VerifierChanged';
    if (transition === 'RequirementsChanged') { candidate = { ...candidate, contractSha256: '34'.repeat(32), consumerPublicationId: afterId }; }
    if (transition === 'VerifierChanged') { candidate = { ...candidate, verifierVersion: 'changed' }; }
    if (transition === 'Unconfirmed') { candidate = { ...candidate, status: 'Unverified', verifiedInteractions: 0, failedInteractions: 0, issues: [] }; newIssue = null; }
    if (transition === 'Observed' || transition === 'Appeared') { previous = { ...previous, status: transition === 'Appeared' ? 'Passed' : 'Unverified', verifiedInteractions: transition === 'Appeared' ? 2 : 0, failedInteractions: 0, issues: [] }; oldIssue = null; }
    fetchMock.mockResolvedValue(response({ ...history, before: previous, after: candidate, comparable, issues: [{ ...history.issues[0], transition, before: oldIssue, after: newIssue }] }));
    expect((await firstValueFrom(repository.issueHistory(request))).issues[0].transition).toBe(transition);
  });
  const invalidHistory: Record<string, unknown>[] = [{ policy: 'unknown-policy' }, { comparable: undefined }, { comparable: false }, { after: { ...after, status: 'Error' } },
    { after: { ...after, contractSha256: '34'.repeat(32) } }, { after: { ...after, verifierVersion: 'changed' } },
    { issues: [{ ...history.issues[0], transition: 'FutureTransition' }] }, { issues: [{ ...history.issues[0], before: null }] },
    { issues: [{ ...history.issues[0], before: { ...issue, kind: 'ExecutionError' } }] }, { issues: [history.issues[0], history.issues[0]] }];
  it.each(invalidHistory)('rejects unsupported or unsafe positive history %j', async change => {
    fetchMock.mockResolvedValue(response({ ...history, ...change })); await expect(firstValueFrom(repository.issueHistory(request))).rejects.toMatchObject({ kind: 'invalid-response' });
  });
  it.each([{ contentChanged: undefined }, { schemaAssessment: 'Compatible' }, { findings: [{ ...comparison.findings[0], level: 'FutureLevel' }] }])('rejects unknown or missing snapshot facts %j', async change => {
    fetchMock.mockResolvedValue(response({ ...comparison, ...change })); await expect(firstValueFrom(repository.comparison(beforeId))).rejects.toMatchObject({ kind: 'invalid-response' });
  });
  it('keeps HTTP validation and unavailable errors distinct from successful empty snapshots', async () => {
    fetchMock.mockResolvedValueOnce(response({ errors: { history: ['Select runs from the same integration.'] }, traceId: 'trace-history' }, 400));
    await expect(firstValueFrom(repository.issueHistory(request))).rejects.toMatchObject({ kind: 'validation', traceId: 'trace-history' });
    fetchMock.mockResolvedValueOnce(response({}, 503)); await expect(firstValueFrom(repository.comparisons())).rejects.toMatchObject({ kind: 'unavailable' });
    fetchMock.mockResolvedValueOnce(response({ items: [], nextCursor: null })); expect(await firstValueFrom(repository.comparisons())).toEqual({ items: [], nextCursor: null });
  });
});
