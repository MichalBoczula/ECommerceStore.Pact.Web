import { inject, Injectable } from '@angular/core';
import { PactTransport } from '../../../shared/infrastructure/pact-transport';
import { pageQuery } from '../../../shared/infrastructure/read-mapping';
import { EvidenceFilter } from '../../verifications/domain/verification.models';
import { EvidenceSelection } from '../domain/overview.models';
import { OverviewRepository } from '../domain/overview.repository';
import * as map from './overview.mapper';

@Injectable()
export class KiotaOverviewRepository extends OverviewRepository {
  private readonly transport = inject(PactTransport);
  override overview(selection: EvidenceSelection) { return this.transport.read(api => api.api.reports.overview.get({ queryParameters: { ...selection, ciAttempt: selection.ciAttempt?.toString() } }), map.overview, true); }
  override dependencies(filter: EvidenceFilter) { return this.transport.read(api => api.api.reports.dependencies.get({ queryParameters: { ...filter, ...pageQuery(filter), ciAttempt: filter.ciAttempt?.toString() } }), map.dependencies, true); }
}
