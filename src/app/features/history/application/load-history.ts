import { defer, map, Observable, of } from 'rxjs';
import { RegistryError } from '../../../shared/domain/registry-error';
import { ComparisonFilter } from '../domain/history.models';
import { HistoryRepository } from '../domain/history.repository';
import { HistoryData, HistorySelection } from './history-view.models';

const comparisonFields = ['consumerApplicationId', 'providerApplicationId', 'sourceApplicationId', 'kind', 'baselineRef', 'limit', 'after'];
const issueFields = ['beforeRunId', 'afterRunId', 'baselineRef'];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function comparisonFilter(query: Readonly<Record<string, string>>): ComparisonFilter {
  const limit = query['limit'] === undefined ? 25 : Number(query['limit']);
  if ((query['limit'] !== undefined && !/^\d+$/.test(query['limit'])) || !Number.isInteger(limit) || limit < 1 || limit > 100) throw new RegistryError('validation', 'Page size must be an integer from 1 to 100.');
  if (query['kind'] !== undefined && query['kind'] !== 'ConsumerPact' && query['kind'] !== 'ProviderOpenApi') throw new RegistryError('validation', 'Choose ConsumerPact or ProviderOpenApi, or clear the kind filter.');
  return { consumerApplicationId: query['consumerApplicationId'], providerApplicationId: query['providerApplicationId'], sourceApplicationId: query['sourceApplicationId'], kind: query['kind'], baselineRef: query['baselineRef'], limit, after: query['after'] };
}
export function loadHistory(repository: HistoryRepository, selection: HistorySelection): Observable<HistoryData> {
  return defer(() => {
    if (selection.ambiguous) throw new RegistryError('validation', 'Use one value for each URL filter.');
    if (selection.kind === 'comparison' && selection.id) return repository.comparison(selection.id).pipe(map(comparison => {
      if (comparison.id.toLowerCase() !== selection.id?.toLowerCase()) throw new RegistryError('invalid-response', 'The registry returned a different comparison snapshot.');
      return { kind: 'comparison' as const, comparison };
    }));
    const q = selection.query;
    const allowed = selection.kind === 'issues' ? issueFields : comparisonFields;
    const unknown = Object.keys(q).find(key => !allowed.includes(key));
    if (unknown) throw new RegistryError('validation', `Unsupported history filter: ${unknown}.`);
    if (selection.kind === 'comparisons') return repository.comparisons(comparisonFilter(q)).pipe(map(page => ({ kind: 'comparisons' as const, page })));
    const beforeRunId = q['beforeRunId']; const afterRunId = q['afterRunId']; const baselineRef = q['baselineRef'];
    for (const value of [beforeRunId, afterRunId]) if (value && (!uuid.test(value) || value === '00000000-0000-0000-0000-000000000000')) throw new RegistryError('validation', 'Select nonempty verification run UUIDs.');
    if (!beforeRunId || !afterRunId || !baselineRef?.trim()) return of({ kind: 'selection' as const });
    return repository.issueHistory({ beforeRunId, afterRunId, baselineRef }).pipe(map(history => {
      if (history.before.id.toLowerCase() !== beforeRunId.toLowerCase() || history.after.id.toLowerCase() !== afterRunId.toLowerCase() || history.baselineRef !== baselineRef) throw new RegistryError('invalid-response', 'The history response does not match the selected runs and baseline.');
      return { kind: 'issues' as const, history };
    }));
  });
}
