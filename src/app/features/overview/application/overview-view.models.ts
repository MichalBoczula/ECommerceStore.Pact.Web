import { RegistryFailure } from '../../../shared/domain/registry-error';
import { Page } from '../../registry/domain/registry.models';
import { VerificationSummary } from '../../verifications/domain/verification.models';
import { DependencyGraph, RegistryOverview } from '../domain/overview.models';

export interface OverviewSelection { readonly query: Readonly<Record<string, string>>; readonly ambiguous: boolean; }
export type ReadSection<T> = { readonly data: T; readonly error: null } | { readonly data: null; readonly error: RegistryFailure };
export interface OverviewData {
  readonly overview: ReadSection<RegistryOverview>;
  readonly graph: ReadSection<DependencyGraph>;
  readonly reports: ReadSection<Page<VerificationSummary>>;
}
