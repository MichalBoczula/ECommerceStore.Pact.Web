import { TestBed } from '@angular/core/testing';
import { Actions } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { firstValueFrom, Observable, of, Subject, throwError } from 'rxjs';
import { RegistryError } from '../../../shared/domain/registry-error';
import { VerificationRun } from '../../verifications/domain/verification.models';
import { comparisonFilter, loadHistory } from '../application/load-history';
import { HistoryData, HistorySelection } from '../application/history-view.models';
import { HistoryRepository } from '../domain/history.repository';
import { ContractComparison, IssueHistory } from '../domain/history.models';
import { HistoryActions as Events } from './history.actions';
import { HistoryEffects } from './history.effects';
import { historyFeature } from './history.feature';

const beforeId = 'f8200a17-f83c-46be-8f2e-427e14e6c665';
const afterId = 'dba64554-75b9-49a5-a87f-88892d2b9dc9';
const baselineRef = 'refs/heads/provider + fix';
const selection: HistorySelection = { kind: 'comparisons', id: null, query: {}, ambiguous: false };
const empty: HistoryData = { kind: 'comparisons', page: { items: [], nextCursor: null } };
const report: VerificationRun = { id: beforeId, consumerApplicationId: 'payments', consumerCommitSha: 'ab'.repeat(20), providerApplicationId: 'invoice', providerCommitSha: 'cd'.repeat(20),
  consumerPublicationId: beforeId, bindingId: beforeId, consumerVersionId: beforeId, providerVersionId: afterId, contractSha256: 'ef'.repeat(32), status: 'Passed', summary: 'Verified.',
  ciRunId: '9223372036854775808', ciAttempt: 2, ciCheckId: 'pact-provider', verifierName: 'pact-http', verifierVersion: '1.2.3', configurationSha256: '12'.repeat(32),
  sourceRef: baselineRef, buildUrl: 'https://ci.example.test/run', publisherId: 'ci', startedAt: '2026-11-04T10:00:00.000Z', finishedAt: '2026-11-04T10:00:00.000Z', recordedAt: '2026-11-04T10:00:00.000Z',
  expectedInteractions: 2, verifiedInteractions: 2, failedInteractions: 0, issues: [], evidenceUrls: [] };
const issueHistory: IssueHistory = { policy: 'exact-pact-requirements-v1', baselineRef, comparable: true, reason: 'Matching requirements.', before: report, after: { ...report, id: afterId }, issues: [] };

describe('history selection and lifecycle', () => {
  const comparisons = vi.fn<HistoryRepository['comparisons']>(); const comparison = vi.fn<HistoryRepository['comparison']>(); const issues = vi.fn<HistoryRepository['issueHistory']>();
  let repository: HistoryRepository; let actions: Subject<Action>;
  beforeEach(() => {
    comparisons.mockReset(); comparison.mockReset(); issues.mockReset(); repository = { comparisons, comparison, issueHistory: issues }; actions = new Subject();
    TestBed.configureTestingModule({ providers: [HistoryEffects, { provide: HistoryRepository, useValue: repository }, { provide: Actions, useValue: actions }] });
  });
  it('does not elect latest runs or request history for an incomplete selection', async () => {
    const incomplete: Record<string, string>[] = [{}, { beforeRunId: beforeId, baselineRef }, { afterRunId: afterId }];
    for (const query of incomplete) {
      expect(await firstValueFrom(loadHistory(repository, { ...selection, kind: 'issues', query }))).toEqual({ kind: 'selection' });
    }
    expect(issues).not.toHaveBeenCalled();
  });
  it('preserves the explicit IDs, baseline and returned negative policy decision', async () => {
    issues.mockReturnValue(of({ ...issueHistory, comparable: false, reason: 'Not comparable.' }));
    const query = { beforeRunId: beforeId, afterRunId: afterId, baselineRef };
    expect((await firstValueFrom(loadHistory(repository, { ...selection, kind: 'issues', query })))).toMatchObject({ kind: 'issues', history: { comparable: false } });
    expect(issues).toHaveBeenCalledWith(query);
    issues.mockReturnValue(of({ ...issueHistory, before: { ...report, id: afterId } }));
    await expect(firstValueFrom(loadHistory(repository, { ...selection, kind: 'issues', query }))).rejects.toMatchObject({ kind: 'invalid-response' });
  });
  it('passes only supported stored-comparison filters and opaque cursors', async () => {
    comparisons.mockReturnValue(of({ items: [], nextCursor: null }));
    const query = { consumerApplicationId: 'payments', providerApplicationId: 'invoice', sourceApplicationId: 'invoice', kind: 'ProviderOpenApi', baselineRef, limit: '12', after: 'opaque+/=&?' };
    expect(await firstValueFrom(loadHistory(repository, { ...selection, query }))).toEqual(empty);
    expect(comparisons).toHaveBeenCalledWith({ ...query, limit: 12 });
  });
  const invalid: Record<string, string>[] = [{ limit: '0' }, { limit: '101' }, { limit: '0x10' }, { kind: 'Unknown' }];
  it.each(invalid)('rejects invalid comparison selection %j', query => { expect(() => comparisonFilter(query)).toThrow(RegistryError); });
  it('rejects duplicated/unsupported fields and invalid run IDs without issuing reads', async () => {
    await expect(firstValueFrom(loadHistory(repository, { ...selection, ambiguous: true }))).rejects.toMatchObject({ kind: 'validation' });
    await expect(firstValueFrom(loadHistory(repository, { ...selection, query: { status: 'Passed' } }))).rejects.toMatchObject({ kind: 'validation' });
    for (const value of ['invalid', '00000000-0000-0000-0000-000000000000']) await expect(firstValueFrom(loadHistory(repository, { ...selection, kind: 'issues', query: { beforeRunId: value } }))).rejects.toMatchObject({ kind: 'validation' });
    expect(comparisons).not.toHaveBeenCalled(); expect(issues).not.toHaveBeenCalled();
  });
  it('checks exact stored snapshot identity without re-evaluating schema findings', async () => {
    comparison.mockReturnValue(of({ id: afterId } as ContractComparison));
    await expect(firstValueFrom(loadHistory(repository, { ...selection, kind: 'comparison', id: beforeId }))).rejects.toMatchObject({ kind: 'invalid-response' });
    expect(comparison).toHaveBeenCalledWith(beforeId); expect(comparisons).not.toHaveBeenCalled();
  });
  it('cancels old selections and leaving-page work before stale evidence can replace the new selection', () => {
    const pending: Subject<{ items: []; nextCursor: null }>[] = []; const stopped = vi.fn();
    comparisons.mockImplementation(() => new Observable(observer => { const subject = new Subject<{ items: []; nextCursor: null }>(); pending.push(subject); const subscription = subject.subscribe(observer); return () => { stopped(); subscription.unsubscribe(); }; }));
    const emitted: Action[] = []; const subscription = TestBed.inject(HistoryEffects).load.subscribe(value => emitted.push(value));
    actions.next(Events.opened({ selection })); actions.next(Events.opened({ selection: { ...selection, query: { sourceApplicationId: 'invoice' } } }));
    expect(stopped).toHaveBeenCalledTimes(1); pending[0].next({ items: [], nextCursor: null }); expect(emitted).toEqual([]);
    pending[1].next({ items: [], nextCursor: null }); expect(emitted).toEqual([Events.loaded({ data: empty })]); actions.next(Events.left()); expect(stopped).toHaveBeenCalledTimes(2); subscription.unsubscribe();
  });
  it('preserves safe trace errors and remains alive for retry', () => {
    comparisons.mockReturnValueOnce(throwError(() => new RegistryError('unavailable', 'The registry is currently unavailable.', 503, 'trace-history'))).mockReturnValueOnce(of({ items: [], nextCursor: null }));
    const emitted: Action[] = []; const subscription = TestBed.inject(HistoryEffects).load.subscribe(value => emitted.push(value));
    actions.next(Events.opened({ selection })); actions.next(Events.opened({ selection }));
    expect(emitted[0]).toEqual(Events.failed({ error: { kind: 'unavailable', message: 'The registry is currently unavailable.', traceId: 'trace-history', validation: {} } }));
    expect(emitted[1]).toEqual(Events.loaded({ data: empty })); expect(JSON.parse(JSON.stringify(emitted[0]))).toEqual(emitted[0]); subscription.unsubscribe();
  });
  it('clears old positive evidence on selection changes and failures', () => {
    let state = historyFeature.reducer(undefined, Events.loaded({ data: { kind: 'issues', history: issueHistory } }));
    state = historyFeature.reducer(state, Events.opened({ selection })); expect(state).toMatchObject({ status: 'loading', data: null, error: null });
    state = historyFeature.reducer(state, Events.failed({ error: { kind: 'network', message: 'Unavailable.', traceId: null, validation: {} } })); expect(state.data).toBeNull();
    expect(historyFeature.reducer(state, Events.left()).selection).toBeNull();
  });
});
