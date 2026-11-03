import { RegistryFailure } from '../../../shared/domain/registry-error';
import { ApplicationVersion, Page } from '../../registry/domain/registry.models';
import { VerificationRun, VerificationSummary } from '../domain/verification.models';

export interface VerificationSelection {
  readonly id: string | null;
  readonly query: Readonly<Record<string, string>>;
  readonly ambiguous: boolean;
}
export type VerificationData = { readonly kind: 'history'; readonly page: Page<VerificationSummary> } | { readonly kind: 'run'; readonly run: VerificationRun };
export interface VersionReference { readonly version: ApplicationVersion | null; readonly error: RegistryFailure | null; }
export interface RunSources { readonly consumer: VersionReference; readonly provider: VersionReference; }
