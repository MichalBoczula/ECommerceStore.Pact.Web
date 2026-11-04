import { catchError, defer, forkJoin, map, Observable, of } from 'rxjs';
import { RegistryError, registryFailure } from '../../../shared/domain/registry-error';
import { evidenceFilter } from '../../verifications/application/load-verifications';
import { EvidenceFilter } from '../../verifications/domain/verification.models';
import { VerificationRepository } from '../../verifications/domain/verification.repository';
import { DependencyEdge, EvidenceSelection } from '../domain/overview.models';
import { OverviewRepository } from '../domain/overview.repository';
import { OverviewData, OverviewSelection, ReadSection } from './overview-view.models';

export function overviewFilter(query: Readonly<Record<string, string>>): EvidenceFilter {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(query)) {
    if (['applicationId', 'consumerApplicationId', 'providerApplicationId'].includes(key)) {
      if (!/^[a-z0-9][a-z0-9-]{0,99}$/i.test(value.trim())) throw new RegistryError('validation', 'Use an application ID with letters, digits and hyphens.');
      normalized[key] = value.trim().toLowerCase();
    } else if (['consumerCommitSha', 'providerCommitSha', 'contractSha256', 'configurationSha256'].includes(key)) {
      if (!(key.endsWith('CommitSha') ? /^[a-f0-9]{40}$/i : /^[a-f0-9]{64}$/i).test(value.trim())) throw new RegistryError('validation', 'Use full commit SHAs and SHA256 hashes.');
      normalized[key] = value.trim().toLowerCase();
    } else normalized[key] = value.trim();
  }
  const result = evidenceFilter(normalized);
  if (result.ciAttempt !== undefined && result.ciAttempt > 10000) throw new RegistryError('validation', 'CI attempt must be from 1 to 10000.');
  return result;
}
export function reportSelection(filter: EvidenceFilter): EvidenceSelection {
  return Object.fromEntries(Object.entries(filter).filter(([key, value]) => key !== 'limit' && key !== 'after' && value !== undefined));
}
export function evidenceQuery(selection: EvidenceSelection): Record<string, string> {
  return Object.fromEntries(Object.entries(selection).filter(([, value]) => value !== undefined).map(([key, value]) => [key, String(value)]));
}
export function edgeQuery(selection: EvidenceSelection, edge: DependencyEdge): Record<string, string> {
  return { ...evidenceQuery({ ...selection, applicationId: undefined }), consumerApplicationId: edge.integration.consumerApplicationId, providerApplicationId: edge.integration.providerApplicationId };
}
function sameSelection(a: EvidenceSelection, b: EvidenceSelection): boolean {
  const left = evidenceQuery(a); const right = evidenceQuery(b);
  return Object.keys(left).length === Object.keys(right).length && Object.entries(left).every(([key, value]) => right[key] === value);
}
function section<T>(request: Observable<T>): Observable<ReadSection<T>> { return request.pipe(map(data => ({ data, error: null })), catchError((error: unknown) => of({ data: null, error: registryFailure(error) }))); }
export function loadOverview(repository: OverviewRepository, verifications: VerificationRepository, selection: OverviewSelection): Observable<OverviewData> {
  return defer(() => {
    if (selection.ambiguous) throw new RegistryError('validation', 'Use one value for each URL filter.');
    const filter = overviewFilter(selection.query); const scope = reportSelection(filter);
    return forkJoin({
      overview: section(repository.overview(scope).pipe(map(value => { if (!sameSelection(value.selection, scope)) throw new RegistryError('invalid-response', 'The overview does not match the selected evidence.'); return value; }))),
      graph: section(repository.dependencies(filter).pipe(map(value => { if (!sameSelection(value.selection, scope) || (filter.after && value.isComplete)) throw new RegistryError('invalid-response', 'The graph does not match the selected evidence page.'); return value; }))),
      reports: section(verifications.runs({ ...scope, limit: 5 })),
    });
  });
}
