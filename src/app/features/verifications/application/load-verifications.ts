import { catchError, defer, forkJoin, map, Observable, of } from 'rxjs';
import { RegistryError, registryFailure } from '../../../shared/domain/registry-error';
import { RegistryRepository } from '../../registry/domain/registry.repository';
import { EvidenceFilter, VerificationRun, VerificationStatus } from '../domain/verification.models';
import { VerificationRepository } from '../domain/verification.repository';
import { RunSources, VerificationData, VerificationSelection, VersionReference } from './verification-view.models';

export const verificationStatuses: readonly VerificationStatus[] = ['Passed', 'Failed', 'Error', 'Unverified'];
const textFilters = ['applicationId', 'consumerApplicationId', 'providerApplicationId', 'consumerCommitSha', 'providerCommitSha', 'contractSha256', 'sourceRef', 'issueCode', 'jsonPath', 'ciRunId', 'ciCheckId', 'verifierName', 'verifierVersion', 'configurationSha256'] as const;
const supported = new Set<string>([...textFilters, 'status', 'limit', 'after', 'ciAttempt']);

export function evidenceFilter(query: Readonly<Record<string, string>>): EvidenceFilter {
  const unknown = Object.keys(query).find(key => !supported.has(key));
  if (unknown) throw new RegistryError('validation', `Unsupported verification filter: ${unknown}.`);
  const integer = (key: string, fallback?: number): number | undefined => {
    const value = query[key];
    if (value === undefined) return fallback;
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < 1) throw new RegistryError('validation', `${key} must be a positive integer.`);
    return Number(value);
  };
  const limit = integer('limit', 25);
  if ((limit ?? 0) > 100) throw new RegistryError('validation', 'Page size must be an integer from 1 to 100.');
  const status = query['status'];
  if (status !== undefined && !verificationStatuses.includes(status as VerificationStatus)) throw new RegistryError('validation', 'Choose Passed, Failed, Error or Unverified, or clear the status filter.');
  return {
    ...Object.fromEntries(textFilters.filter(key => query[key] !== undefined).map(key => [key, query[key]])),
    status: status as VerificationStatus | undefined, limit, after: query['after'], ciAttempt: integer('ciAttempt'),
  };
}

export function loadVerifications(repository: VerificationRepository, selection: VerificationSelection): Observable<VerificationData> {
  return defer(() => {
    if (selection.ambiguous) throw new RegistryError('validation', 'Use one value for each URL filter.');
    // On a run route the query retains the history bookmark; it never selects another report.
    if (selection.id) return repository.run(selection.id).pipe(map(run => {
      if (run.id.toLowerCase() !== selection.id?.toLowerCase()) throw new RegistryError('invalid-response', 'The registry returned a different verification run.');
      return { kind: 'run' as const, run };
    }));
    return repository.runs(evidenceFilter(selection.query)).pipe(map(page => ({ kind: 'history' as const, page })));
  });
}

/** Supplementary repository links cannot hide a recorded verification report. */
export function loadRunSources(repository: RegistryRepository, run: VerificationRun): Observable<RunSources> {
  const source = (applicationId: string, commitSha: string, id: string): Observable<VersionReference> =>
    defer(() => repository.version(applicationId, commitSha)).pipe(map(version => {
      if (version.id !== id || version.applicationId !== applicationId || version.commitSha !== commitSha) {
        throw new RegistryError('invalid-response', 'The registered source version does not match the report.');
      }
      return { version, error: null };
    }), catchError((error: unknown) => of({ version: null, error: registryFailure(error) })));
  return forkJoin({ consumer: source(run.consumerApplicationId, run.consumerCommitSha, run.consumerVersionId), provider: source(run.providerApplicationId, run.providerCommitSha, run.providerVersionId) });
}
