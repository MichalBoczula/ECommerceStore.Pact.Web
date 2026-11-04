import { Observable } from 'rxjs';
import { Page } from '../../registry/domain/registry.models';
import { CompatibilityDecision, DecisionFilter, DecisionSummary, ProfileFilter, VerificationProfile } from './compatibility.models';

export abstract class CompatibilityRepository {
  abstract decisions(filter?: DecisionFilter): Observable<Page<DecisionSummary>>;
  abstract decision(id: string): Observable<CompatibilityDecision>;
  abstract profiles(filter?: ProfileFilter): Observable<Page<VerificationProfile>>;
  abstract profile(id: string): Observable<VerificationProfile>;
}
