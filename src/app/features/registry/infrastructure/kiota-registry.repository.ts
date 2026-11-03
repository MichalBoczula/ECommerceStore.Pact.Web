import { inject, Injectable } from '@angular/core';
import { PactTransport } from '../../../shared/infrastructure/pact-transport';
import { page, pageQuery } from '../../../shared/infrastructure/read-mapping';
import { IntegrationFilter, PageRequest, PublicationFilter } from '../domain/registry.models';
import { RegistryRepository } from '../domain/registry.repository';
import * as map from './registry.mapper';

@Injectable()
export class KiotaRegistryRepository extends RegistryRepository {
  private readonly transport = inject(PactTransport);

  override applications(request: PageRequest & { search?: string } = {}) {
    return this.transport.read(api => api.api.applications.get({ queryParameters: { search: request.search, ...pageQuery(request) } }), dto => page(dto, map.application));
  }
  override versions(applicationId: string, request: PageRequest = {}) {
    return this.transport.read(api => api.api.applications.byApplicationId(applicationId).versions.get({ queryParameters: pageQuery(request) }), dto => page(dto, map.version));
  }
  override version(applicationId: string, commitSha: string) {
    return this.transport.read(api => api.api.applications.byApplicationId(applicationId).versions.byCommitSha(commitSha).get(), map.version);
  }
  override integrations(filter: IntegrationFilter = {}) {
    return this.transport.read(api => api.api.integrations.get({ queryParameters: { ...filter, ...pageQuery(filter) } }), dto => page(dto, map.integration));
  }
  override integration(consumerApplicationId: string, providerApplicationId: string) {
    return this.transport.read(api => api.api.integrations.byConsumerApplicationId(consumerApplicationId).byProviderApplicationId(providerApplicationId).get(), map.integration);
  }
  override publications(filter: PublicationFilter = {}) {
    return this.transport.read(api => api.api.contractPublications.get({ queryParameters: { ...filter, ...pageQuery(filter) } }), dto => page(dto, map.publicationSummary));
  }
  override publication(id: string) {
    return this.transport.read(api => api.api.contractPublications.byId(id).get(), map.publicationDetail);
  }
  override artifact(sha256: string) {
    return this.transport.read(api => api.api.artifacts.bySha256(sha256).get(), map.artifact);
  }
  override artifactContent(sha256: string) {
    return this.transport.read(api => api.api.artifacts.bySha256(sha256).content.get({ headers: { Accept: 'application/octet-stream' } }), dto => dto);
  }
}
