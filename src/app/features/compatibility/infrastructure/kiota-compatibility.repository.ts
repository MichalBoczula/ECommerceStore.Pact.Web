import { inject, Injectable } from '@angular/core';
import { PactTransport } from '../../../shared/infrastructure/pact-transport';
import { page, pageQuery } from '../../../shared/infrastructure/read-mapping';
import { DecisionFilter, ProfileFilter } from '../domain/compatibility.models';
import { CompatibilityRepository } from '../domain/compatibility.repository';
import * as map from './compatibility.mapper';

@Injectable()
export class KiotaCompatibilityRepository extends CompatibilityRepository {
  private readonly transport = inject(PactTransport);
  override decisions(filter: DecisionFilter = {}) { return this.transport.read(api => api.api.compatibilityDecisions.get({ queryParameters: { ...filter, ...pageQuery(filter) } }), dto => page(dto, map.decisionSummary)); }
  override decision(id: string) { return this.transport.read(api => api.api.compatibilityDecisions.byId(id).get(), map.decision, true); }
  override profiles(filter: ProfileFilter = {}) { return this.transport.read(api => api.api.verificationProfiles.get({ queryParameters: { ...filter, ...pageQuery(filter) } }), dto => page(dto, map.profile)); }
  override profile(id: string) { return this.transport.read(api => api.api.verificationProfiles.byId(id).get(), map.profile); }
}
