import { TestBed } from '@angular/core/testing';
import { Actions } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { firstValueFrom, Observable, of, Subject, throwError } from 'rxjs';
import { RegistryError } from '../../../shared/domain/registry-error';
import { VerificationRepository } from '../../verifications/domain/verification.repository';
import { edgeQuery, loadOverview, overviewFilter, reportSelection } from '../application/load-overview';
import { OverviewData, OverviewSelection } from '../application/overview-view.models';
import { DependencyEdge, DependencyGraph, RegistryOverview } from '../domain/overview.models';
import { OverviewRepository } from '../domain/overview.repository';
import { graphLayout } from '../presentation/graph-layout';
import { OverviewActions as Events } from './overview.actions';
import { OverviewEffects } from './overview.effects';
import { overviewFeature } from './overview.feature';

const selection: OverviewSelection = { query: {}, ambiguous: false };
const emptyGraph: DependencyGraph = { nodes: [], edges: [], nextCursor: null, selection: {}, evidencePolicy: 'policy', isComplete: true };
const emptyOverview = { selection: {} } as RegistryOverview;
const emptyReports = { items: [], nextCursor: null };
const data: OverviewData = { overview: { data: emptyOverview, error: null }, graph: { data: emptyGraph, error: null }, reports: { data: emptyReports, error: null } };
const integration = { id: 'edge', consumerApplicationId: 'payments', providerApplicationId: 'invoice', registeredAt: '2026-11-04T08:00:00.000Z' };
const edge: DependencyEdge = { integration, relationship: 'Declared', matchingReports: { passed: 1, failed: 0, error: 0, unverified: 0, total: 1 } };
describe('overview selection, independent sections and lifecycle', () => {
  const overview = vi.fn<OverviewRepository['overview']>(); const dependencies = vi.fn<OverviewRepository['dependencies']>(); const runs = vi.fn<VerificationRepository['runs']>();
  let repository: OverviewRepository; let verifications: VerificationRepository; let actions: Subject<Action>;
  beforeEach(() => {
    overview.mockReset().mockReturnValue(of(emptyOverview)); dependencies.mockReset().mockReturnValue(of(emptyGraph)); runs.mockReset().mockReturnValue(of(emptyReports)); repository = { overview, dependencies }; verifications = { runs, run: vi.fn() }; actions = new Subject();
    TestBed.configureTestingModule({ providers: [OverviewEffects, { provide: OverviewRepository, useValue: repository }, { provide: VerificationRepository, useValue: verifications }, { provide: Actions, useValue: actions }] });
  });
  it('separates graph pagination from report scope and keeps exact source/CI identities', async () => {
    const query = { consumerApplicationId: 'PAYMENTS', providerCommitSha: 'AB'.repeat(20), ciRunId: '9223372036854775808', ciAttempt: '2', sourceRef: 'refs/heads/feature/a + b', limit: '12', after: 'opaque+/=&?' };
    const scope = reportSelection(overviewFilter(query)); overview.mockReturnValue(of({ ...emptyOverview, selection: scope })); dependencies.mockReturnValue(of({ ...emptyGraph, selection: scope, isComplete: false }));
    await firstValueFrom(loadOverview(repository, verifications, { ...selection, query })); expect(overview).toHaveBeenCalledWith(scope); expect(runs).toHaveBeenCalledWith({ ...scope, limit: 5 }); expect(dependencies).toHaveBeenCalledWith({ ...scope, limit: 12, after: query.after });
    expect(scope).toMatchObject({ consumerApplicationId: 'payments', providerCommitSha: 'ab'.repeat(20), ciRunId: query.ciRunId, ciAttempt: 2 }); expect(scope).not.toHaveProperty('after');
  });
  const invalid: Record<string, string>[] = [{ consumerCommitSha: 'latest' }, { contractSha256: 'short' }, { applicationId: 'bad/app' }, { ciAttempt: '0x10' }, { ciAttempt: '10001' }, { limit: '101' }, { status: 'Compatible' }, { latest: 'true' }];
  it.each(invalid)('rejects unsupported or incomplete exact evidence filters case %#', async query => { await expect(firstValueFrom(loadOverview(repository, verifications, { ...selection, query }))).rejects.toMatchObject({ kind: 'validation' }); expect(overview).not.toHaveBeenCalled(); expect(dependencies).not.toHaveBeenCalled(); });
  it('rejects ambiguous URL values before issuing any request', async () => { await expect(firstValueFrom(loadOverview(repository, verifications, { ...selection, ambiguous: true }))).rejects.toMatchObject({ kind: 'validation' }); expect(runs).not.toHaveBeenCalled(); });
  it('keeps good sections available when another projection fails, with safe serializable trace details', async () => {
    dependencies.mockReturnValue(throwError(() => new RegistryError('unavailable', 'The registry is currently unavailable.', 503, 'graph-503')));
    const result = await firstValueFrom(loadOverview(repository, verifications, selection)); expect(result.overview.data).toBe(emptyOverview); expect(result.reports.data).toBe(emptyReports); expect(result.graph).toMatchObject({ data: null, error: { kind: 'unavailable', traceId: 'graph-503' } }); expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });
  it('does not render a different evidence scope or a later page as a complete graph', async () => {
    overview.mockReturnValue(of({ ...emptyOverview, selection: { providerCommitSha: 'ab'.repeat(20) } }));
    expect((await firstValueFrom(loadOverview(repository, verifications, selection))).overview.error?.kind).toBe('invalid-response');
    expect((await firstValueFrom(loadOverview(repository, verifications, { ...selection, query: { after: 'last' } }))).graph.error?.kind).toBe('invalid-response');
  });
  it('narrows a selected edge without losing the exact hash, ref or CI selection', () => {
    expect(edgeQuery({ applicationId: 'payments', providerCommitSha: 'ab'.repeat(20), contractSha256: 'cd'.repeat(32), ciAttempt: 2, sourceRef: 'refs/heads/a + b' }, edge)).toEqual({ consumerApplicationId: 'payments', providerApplicationId: 'invoice', providerCommitSha: 'ab'.repeat(20), contractSha256: 'cd'.repeat(32), ciAttempt: '2', sourceRef: 'refs/heads/a + b' });
  });
  it('cancels all three pending reads when filters change or the page is left', () => {
    const stopped = vi.fn(); const pending = <T>() => new Observable<T>(() => () => stopped());
    overview.mockReturnValue(pending()); dependencies.mockReturnValue(pending()); runs.mockReturnValue(pending()); const subscription = TestBed.inject(OverviewEffects).load.subscribe();
    actions.next(Events.opened({ selection })); actions.next(Events.opened({ selection: { ...selection, query: { sourceRef: 'refs/heads/new' } } })); expect(stopped).toHaveBeenCalledTimes(3); actions.next(Events.left()); expect(stopped).toHaveBeenCalledTimes(6); subscription.unsubscribe();
  });
  it('clears stale metrics/graph/report data on new selections, failures and leaving', () => {
    let state = overviewFeature.reducer(undefined, Events.loaded({ data })); state = overviewFeature.reducer(state, Events.opened({ selection })); expect(state.data).toBeNull();
    state = overviewFeature.reducer(state, Events.failed({ error: { kind: 'network', message: 'Unavailable.', traceId: null, validation: {} } })); expect(state.data).toBeNull(); expect(overviewFeature.reducer(state, Events.left()).selection).toBeNull();
  });
  it('lays out chains, branches and cycles deterministically without dropping or reversing a declaration', () => {
    const graph = { ...emptyGraph, nodes: ['payments', 'invoice', 'users'], edges: [edge, { ...edge, integration: { ...integration, id: 'reverse', consumerApplicationId: 'invoice', providerApplicationId: 'payments' } }, { ...edge, integration: { ...integration, id: 'branch', providerApplicationId: 'users' }, matchingReports: { passed: 0, failed: 0, error: 0, unverified: 0, total: 0 } }] };
    const layout = graphLayout(graph); expect(layout).toEqual(graphLayout(graph)); expect(layout.nodes.map(n => n.applicationId).sort()).toEqual([...graph.nodes].sort()); expect(layout.paths.map(p => p.id)).toEqual(['edge', 'reverse', 'branch']); expect(layout.paths[2].empty).toBe(true);
    expect(layout.nodes.every(n => n.x >= 0 && n.y >= 0 && n.x + 160 <= layout.width && n.y + 76 <= layout.height)).toBe(true); expect(new Set(layout.nodes.map(n => `${n.x}/${n.y}`)).size).toBe(3);
  });
});
