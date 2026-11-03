import { inject, Injectable } from '@angular/core';
import { RegistryError } from '../../../shared/domain/registry-error';
import { PactTransport } from '../../../shared/infrastructure/pact-transport';
import { page, pageQuery } from '../../../shared/infrastructure/read-mapping';
import { EvidenceFilter } from '../domain/verification.models';
import { VerificationRepository } from '../domain/verification.repository';
import { verificationRun, verificationSummary } from './verification.mapper';

@Injectable()
export class KiotaVerificationRepository extends VerificationRepository {
  private readonly transport = inject(PactTransport);

  override runs(filter: EvidenceFilter = {}) {
    return this.transport.read(api => {
      if (filter.ciAttempt !== undefined && (!Number.isSafeInteger(filter.ciAttempt) || filter.ciAttempt < 1)) {
        throw new RegistryError('validation', 'CI attempt must be a positive integer.');
      }
      return api.api.reports.verificationRuns.get({ queryParameters: { ...filter, ...pageQuery(filter), ciAttempt: filter.ciAttempt?.toString() } });
    }, dto => page(dto, verificationSummary));
  }

  override run(id: string) {
    return this.transport.read(api => api.api.verificationRuns.byId(id).get(), verificationRun, true);
  }
}
