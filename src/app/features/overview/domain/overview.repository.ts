import { Observable } from 'rxjs';
import { EvidenceFilter } from '../../verifications/domain/verification.models';
import { DependencyGraph, EvidenceSelection, RegistryOverview } from './overview.models';

export abstract class OverviewRepository {
  abstract overview(selection: EvidenceSelection): Observable<RegistryOverview>;
  abstract dependencies(filter: EvidenceFilter): Observable<DependencyGraph>;
}
