import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { PACT_FETCH } from '../../../shared/infrastructure/pact-transport';
import { OverviewRepository } from '../domain/overview.repository';
import { KiotaOverviewRepository } from './kiota-overview.repository';

const id = 'e9a19a32-e5ab-4aa2-b4dd-832481bdb501';
const policy = 'RecordedReportsOnly-v1; not a compatibility decision; not a transactional snapshot';
const counts = { passed: 1, failed: 2, error: 3, unverified: 4, total: 10 };
const inventory = { registeredApplications: 6, applicationVersions: 15, declaredIntegrations: 5, contractPublications: 12, verificationProfiles: 1, contractComparisons: 2, compatibilityDecisions: 3 };
const selected = { consumerApplicationId: 'payments', providerApplicationId: 'invoice', consumerCommitSha: 'ab'.repeat(20), providerCommitSha: 'cd'.repeat(20), contractSha256: 'ef'.repeat(32), sourceRef: 'refs/heads/feature/a + b', ciRunId: '9223372036854775808', ciAttempt: 2, ciCheckId: 'pact-provider', verifierName: 'pact-http', verifierVersion: '1.2.3', configurationSha256: '12'.repeat(32), issueCode: 'FieldMissing', jsonPath: '$.amount', status: 'Failed' as const };
const declaration = { id, consumerApplicationId: 'payments', providerApplicationId: 'invoice', registeredAt: '2026-11-04T08:00:00.000Z' };
const edge = { integration: declaration, relationship: 'Declared', matchingReports: counts };
const graph = { nodes: [{ applicationId: 'payments' }, { applicationId: 'invoice' }], edges: [edge], nextCursor: null, selection: selected, evidencePolicy: policy, isComplete: true };
const overview = { inventory, matchingReports: counts, selection: selected, evidencePolicy: policy, observedAt: '2026-11-04T08:00:00.000Z' };
const emptyCounts = { passed: 0, failed: 0, error: 0, unverified: 0, total: 0 };
function response(value: unknown, status = 200): Response { return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } }); }

describe('overview reads through the generated Kiota client', () => {
  const fetchMock = vi.fn<typeof fetch>(); let repository: OverviewRepository;
  beforeEach(() => { fetchMock.mockReset(); TestBed.configureTestingModule({ providers: [{ provide: OverviewRepository, useClass: KiotaOverviewRepository }, { provide: PACT_FETCH, useValue: fetchMock }] }); repository = TestBed.inject(OverviewRepository); });
  it('preserves global inventory, four filtered counts, exact execution and observed timestamp', async () => {
    fetchMock.mockResolvedValue(response(overview)); expect(await firstValueFrom(repository.overview(selected))).toEqual(overview);
    const url = new URL(String(fetchMock.mock.calls[0][0])); expect(url.pathname).toBe('/backend/api/reports/overview'); expect(Object.fromEntries(url.searchParams)).toEqual({ ...selected, ciAttempt: '2' });
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'GET', credentials: 'omit', redirect: 'error' });
  });
  it('keeps declarations with no matching reports and preserves a partial last graph page', async () => {
    fetchMock.mockResolvedValue(response({ ...graph, isComplete: false, edges: [{ ...edge, matchingReports: emptyCounts }] }));
    const result = await firstValueFrom(repository.dependencies({ ...selected, limit: 12, after: 'opaque+/=&?' }));
    expect(result).toMatchObject({ nodes: ['payments', 'invoice'], edges: [{ relationship: 'Declared', integration: declaration, matchingReports: emptyCounts }], nextCursor: null, isComplete: false });
    const url = new URL(String(fetchMock.mock.calls[0][0])); expect(url.pathname).toBe('/backend/api/reports/dependencies'); expect(Object.fromEntries(url.searchParams)).toEqual({ ...selected, ciAttempt: '2', limit: '12', after: 'opaque+/=&?' });
  });
  it('maps integer|string counts, the generated errorEscaped member, and a nullable CI attempt', async () => {
    fetchMock.mockResolvedValue(response({ ...overview, inventory: { ...inventory, registeredApplications: '6' }, matchingReports: { passed: '1', failed: '2', error: '3', unverified: '4', total: '10' }, selection: { ciAttempt: null, applicationId: null, status: null } }));
    expect(await firstValueFrom(repository.overview({}))).toMatchObject({ inventory: { registeredApplications: 6 }, matchingReports: counts, selection: {} });
  });
  it('retains honest empty overview and graph projections without fabricating a passing result', async () => {
    fetchMock.mockResolvedValueOnce(response({ ...overview, matchingReports: emptyCounts, selection: {} })).mockResolvedValueOnce(response({ ...graph, nodes: [], edges: [], selection: {} }));
    expect((await firstValueFrom(repository.overview({}))).matchingReports.total).toBe(0); expect((await firstValueFrom(repository.dependencies({}))).edges).toEqual([]);
  });
  const badOverview: Record<string, unknown>[] = [{ matchingReports: { ...counts, total: 9 } }, { matchingReports: { ...counts, error: undefined } }, { matchingReports: { ...counts, passed: -1 } }, { matchingReports: { ...counts, passed: 1.5 } }, { matchingReports: { ...counts, total: '9007199254740993' } }, { inventory: { ...inventory, registeredApplications: undefined } }, { inventory: { ...inventory, applicationVersions: 'not a count' } }, { selection: null }, { selection: { status: 'Compatible' } }, { selection: { ciAttempt: 0 } }, { evidencePolicy: 'UnknownPolicy' }];
  it.each(badOverview)('rejects missing, unsafe or inconsistent overview facts case %#', async change => { fetchMock.mockResolvedValue(response({ ...overview, ...change })); await expect(firstValueFrom(repository.overview({}))).rejects.toMatchObject({ kind: 'invalid-response' }); });
  const badGraph: Record<string, unknown>[] = [{ nodes: undefined }, { edges: undefined }, { edges: Array(101).fill(edge) }, { edges: [edge, edge] }, { nodes: [{ applicationId: 'payments' }] }, { nodes: [...graph.nodes, { applicationId: 'payments' }] }, { nodes: [...graph.nodes, { applicationId: 'unrelated' }] }, { edges: [{ ...edge, relationship: 'RuntimeTrace' }] }, { edges: [{ ...edge, matchingReports: { ...counts, total: 0 } }] }, { edges: [{ ...edge, integration: { ...declaration, providerApplicationId: 'payments' } }] }, { isComplete: undefined }, { nextCursor: 'next-page', isComplete: true }];
  it.each(badGraph)('rejects malformed relationships and unsafe complete-graph claims case %#', async change => { fetchMock.mockResolvedValue(response({ ...graph, ...change })); await expect(firstValueFrom(repository.dependencies({}))).rejects.toMatchObject({ kind: 'invalid-response' }); });
  it('keeps a missing registry distinct from a zero-report graph', async () => {
    fetchMock.mockResolvedValue(response({ traceId: 'overview-503', detail: 'internal exception' }, 503)); await expect(firstValueFrom(repository.overview({}))).rejects.toMatchObject({ kind: 'unavailable', traceId: 'overview-503' });
  });
});
