import { PageRequest } from '../../registry/domain/registry.models';
import { VerificationStatus } from '../../verifications/domain/verification.models';

export interface RequiredCheck {
  readonly checkId: string;
  readonly verifierName: string;
  readonly verifierVersion: string;
  readonly configurationSha256: string;
}
export interface VerificationProfile {
  readonly id: string;
  readonly consumerApplicationId: string;
  readonly providerApplicationId: string;
  readonly name: string;
  readonly version: string;
  readonly contentSha256: string;
  readonly checks: readonly RequiredCheck[];
  readonly publisherId: string;
  readonly registeredAt: string;
}
export interface ProfileFilter extends PageRequest {
  readonly consumerApplicationId?: string;
  readonly providerApplicationId?: string;
  readonly name?: string;
  readonly version?: string;
}
export interface DecisionFilter extends PageRequest {
  readonly consumerApplicationId?: string;
  readonly providerApplicationId?: string;
  readonly consumerCommitSha?: string;
  readonly providerCommitSha?: string;
  readonly contractSha256?: string;
  readonly profileId?: string;
  readonly status?: VerificationStatus;
}
export interface DecisionSummary {
  readonly id: string;
  readonly profileId: string;
  readonly profileName: string;
  readonly profileVersion: string;
  readonly policy: string;
  readonly consumerApplicationId: string;
  readonly providerApplicationId: string;
  readonly status: VerificationStatus;
  readonly rowCount: number;
  readonly sourceApplicationId: string;
  readonly publisherId: string;
  readonly evaluatedAt: string;
}
export type CompatibilityReason = 'ContractNotPublished' | 'MissingExecution' | 'VerifierMismatch' | 'SourceRefMismatch' | 'Reported';
export interface CompatibilityCheck {
  readonly required: RequiredCheck;
  readonly status: VerificationStatus;
  readonly reason: CompatibilityReason;
  readonly evidenceId: string | null;
  readonly evidencePayloadSha256: string | null;
  readonly reportedStatus: VerificationStatus | null;
  readonly observedVerifier: RequiredCheck | null;
  readonly observedPublicationId: string | null;
  readonly buildUrl: string | null;
  readonly publisherId: string | null;
  readonly issueCount: number;
}
export interface CompatibilityRow {
  readonly consumerApplicationId: string;
  readonly consumerCommitSha: string;
  readonly providerApplicationId: string;
  readonly providerCommitSha: string;
  readonly consumerVersionId: string;
  readonly providerVersionId: string;
  readonly bindingId: string | null;
  readonly contractSha256: string;
  readonly ciRunId: string;
  readonly ciAttempt: number;
  readonly providerSourceRef: string;
  readonly status: VerificationStatus;
  readonly checks: readonly CompatibilityCheck[];
  readonly missingChecks: readonly string[];
  readonly unresolvedChecks: readonly string[];
}
export interface CompatibilityDecision {
  readonly id: string;
  readonly policy: string;
  readonly profile: VerificationProfile;
  readonly status: VerificationStatus;
  readonly compatible: boolean;
  readonly rows: readonly CompatibilityRow[];
  readonly sourceApplicationId: string;
  readonly publisherId: string;
  readonly evaluatedAt: string;
}
