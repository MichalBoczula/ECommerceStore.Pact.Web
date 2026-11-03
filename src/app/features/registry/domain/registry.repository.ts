import { Observable } from 'rxjs';
import { ApplicationVersion, ContractArtifact, Integration, IntegrationFilter, Page, PageRequest, PublicationDetail, PublicationFilter, PublicationSummary, RegisteredApplication } from './registry.models';

/** Anonymous registry reads. Cursor strings and exact identities are never interpreted by the browser. */
export abstract class RegistryRepository {
  abstract applications(request?: PageRequest & { readonly search?: string }): Observable<Page<RegisteredApplication>>;
  abstract versions(applicationId: string, request?: PageRequest): Observable<Page<ApplicationVersion>>;
  abstract version(applicationId: string, commitSha: string): Observable<ApplicationVersion>;
  abstract integrations(filter?: IntegrationFilter): Observable<Page<Integration>>;
  abstract integration(consumerApplicationId: string, providerApplicationId: string): Observable<Integration>;
  abstract publications(filter?: PublicationFilter): Observable<Page<PublicationSummary>>;
  abstract publication(id: string): Observable<PublicationDetail>;
  abstract artifact(sha256: string): Observable<ContractArtifact>;
  abstract artifactContent(sha256: string): Observable<ArrayBuffer>;
}
