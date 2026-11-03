import { defer, forkJoin, map, Observable, switchMap } from 'rxjs';
import { RegistryError } from '../../../shared/domain/registry-error';
import { PageRequest } from '../domain/registry.models';
import { RegistryRepository } from '../domain/registry.repository';
import { ExplorerData, ExplorerSelection } from './explorer.models';

export function loadExplorer(repository: RegistryRepository, selection: ExplorerSelection): Observable<ExplorerData> {
  return defer(() => {
    if (selection.ambiguous) throw new RegistryError('validation', 'Use one value for each URL filter.');
    const p = selection.params;
    const q = selection.query;
    const pagination: PageRequest = { limit: q['limit'] === undefined ? 25 : Number(q['limit']), after: q['after'] };
    if ((q['limit'] !== undefined && !/^\d+$/.test(q['limit'])) || !Number.isInteger(pagination.limit) || (pagination.limit ?? 0) < 1 || (pagination.limit ?? 0) > 100) {
      throw new RegistryError('validation', 'Page size must be an integer from 1 to 100.');
    }
    switch (selection.kind) {
      case 'applications': return repository.applications({ ...pagination, search: q['search'] }).pipe(map(page => ({ kind: 'applications' as const, page })));
      case 'versions': return repository.versions(p['applicationId'], pagination).pipe(map(page => ({ kind: 'versions' as const, page })));
      case 'version': return repository.version(p['applicationId'], p['commitSha']).pipe(map(version => ({ kind: 'version' as const, version })));
      case 'integrations': return repository.integrations({ ...pagination, applicationId: q['applicationId'], consumerApplicationId: q['consumerApplicationId'], providerApplicationId: q['providerApplicationId'] }).pipe(map(page => ({ kind: 'integrations' as const, page })));
      case 'integration': return repository.integration(p['consumerApplicationId'], p['providerApplicationId']).pipe(map(integration => ({ kind: 'integration' as const, integration })));
      case 'publications': return repository.publications({ ...pagination, sourceApplicationId: q['sourceApplicationId'], commitSha: q['commitSha'], kind: q['kind'], consumerApplicationId: q['consumerApplicationId'], providerApplicationId: q['providerApplicationId'], sourceRef: q['sourceRef'], contractSha256: q['contractSha256'] }).pipe(map(page => ({ kind: 'publications' as const, page })));
      case 'publication': return repository.publication(p['id']).pipe(switchMap(publication => forkJoin({
        artifact: repository.artifact(publication.artifactSha256),
        version: repository.version(publication.sourceApplicationId, publication.commitSha),
      }).pipe(map(({ artifact, version }) => {
        if (artifact.sha256 !== publication.artifactSha256 || version.applicationId !== publication.sourceApplicationId || version.commitSha !== publication.commitSha) {
          throw new RegistryError('invalid-response', 'The publication provenance does not match its referenced records.');
        }
        return { kind: 'publication' as const, publication, artifact, version };
      }))));
    }
  });
}
