import { Observable } from 'rxjs';
import { Page } from '../../registry/domain/registry.models';
import { EvidenceFilter, VerificationRun, VerificationSummary } from './verification.models';

export abstract class VerificationRepository {
  abstract runs(filter?: EvidenceFilter): Observable<Page<VerificationSummary>>;
  abstract run(id: string): Observable<VerificationRun>;
}
