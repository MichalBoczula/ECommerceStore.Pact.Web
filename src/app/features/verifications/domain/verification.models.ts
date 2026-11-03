import { PageRequest } from '../../registry/domain/registry.models';

export type VerificationStatus = 'Passed' | 'Failed' | 'Error' | 'Unverified';

export interface EvidenceFilter extends PageRequest {
  readonly applicationId?: string;
  readonly consumerApplicationId?: string;
  readonly providerApplicationId?: string;
  readonly consumerCommitSha?: string;
  readonly providerCommitSha?: string;
  readonly contractSha256?: string;
  readonly sourceRef?: string;
  readonly status?: VerificationStatus;
  readonly issueCode?: string;
  readonly jsonPath?: string;
  readonly ciRunId?: string;
  readonly ciAttempt?: number;
  readonly ciCheckId?: string;
  readonly verifierName?: string;
  readonly verifierVersion?: string;
  readonly configurationSha256?: string;
}

export interface VerificationEvidence {
  readonly id: string;
  readonly consumerApplicationId: string;
  readonly consumerCommitSha: string;
  readonly providerApplicationId: string;
  readonly providerCommitSha: string;
  readonly consumerPublicationId: string;
  readonly contractSha256: string;
  readonly status: VerificationStatus;
  readonly summary: string;
  readonly ciRunId: string;
  readonly ciAttempt: number;
  readonly ciCheckId: string;
  readonly verifierName: string;
  readonly verifierVersion: string;
  readonly configurationSha256: string;
  readonly sourceRef: string;
  readonly buildUrl: string;
  readonly publisherId: string;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly recordedAt: string;
}

export interface VerificationSummary extends VerificationEvidence { readonly issueCount: number; }

/** JSON text preserves numbers exactly and must be rendered as text, never HTML. */
export type DiagnosticValue = { readonly present: false } | { readonly present: true; readonly json: string };

export interface VerificationIssue {
  readonly kind: string;
  readonly code: string;
  readonly message: string;
  readonly interaction: string | null;
  readonly method: string | null;
  readonly path: string | null;
  readonly jsonPath: string | null;
  readonly actualPresent: boolean | null;
  readonly evidenceUrl: string | null;
  readonly expected: DiagnosticValue;
  readonly actual: DiagnosticValue;
}

export interface VerificationRun extends VerificationEvidence {
  readonly bindingId: string;
  readonly consumerVersionId: string;
  readonly providerVersionId: string;
  readonly expectedInteractions: number;
  readonly verifiedInteractions: number;
  readonly failedInteractions: number;
  readonly issues: readonly VerificationIssue[];
  readonly evidenceUrls: readonly string[];
}
