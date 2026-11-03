import { PageRequest } from '../../registry/domain/registry.models';
import { VerificationIssue, VerificationRun } from '../../verifications/domain/verification.models';

export type SchemaAssessment = 'NoBreakingChangesDetected' | 'PotentiallyBreaking' | 'NotAssessed';
export type IssueTransition = 'Appeared' | 'Observed' | 'Persisting' | 'Resolved' | 'Unconfirmed' | 'RequirementsChanged' | 'VerifierChanged';
export interface ComparisonFilter extends PageRequest {
  readonly consumerApplicationId?: string;
  readonly providerApplicationId?: string;
  readonly sourceApplicationId?: string;
  readonly kind?: string;
  readonly baselineRef?: string;
}
export interface ComparisonSummary {
  readonly id: string;
  readonly consumerApplicationId: string;
  readonly providerApplicationId: string;
  readonly beforePublicationId: string;
  readonly afterPublicationId: string;
  readonly sourceApplicationId: string;
  readonly beforeCommitSha: string;
  readonly afterCommitSha: string;
  readonly kind: string;
  readonly baselineRef: string;
  readonly contentChanged: boolean;
  readonly jsonChanged: boolean;
  readonly schemaAssessment: SchemaAssessment;
  readonly findingCount: number;
  readonly tool: string;
  readonly toolVersion: string;
  readonly comparedAt: string;
}
export interface ComparisonSource {
  readonly publicationId: string;
  readonly bindingId: string;
  readonly sourceVersionId: string;
  readonly applicationId: string;
  readonly commitSha: string;
  readonly kind: string;
  readonly artifactSha256: string;
  readonly sourceRef: string;
}
export interface SchemaFinding {
  readonly code: string;
  readonly level: 'Info' | 'Warning' | 'Error';
  readonly message: string;
  readonly method: string | null;
  readonly path: string | null;
}
export interface ContractComparison {
  readonly id: string;
  readonly profile: string;
  readonly consumerApplicationId: string;
  readonly providerApplicationId: string;
  readonly before: ComparisonSource;
  readonly after: ComparisonSource;
  readonly baselineRef: string;
  readonly publisherId: string;
  readonly contentChanged: boolean;
  readonly jsonChanged: boolean;
  readonly schemaAssessment: SchemaAssessment;
  readonly tool: string;
  readonly toolVersion: string;
  readonly findings: readonly SchemaFinding[];
  readonly limitations: readonly string[];
  readonly consumerImpact: string;
  readonly comparedAt: string;
}
export interface IssueHistoryRequest { readonly beforeRunId: string; readonly afterRunId: string; readonly baselineRef: string; }
export interface HistoricalIssue {
  readonly key: string;
  readonly transition: IssueTransition;
  readonly before: VerificationIssue | null;
  readonly after: VerificationIssue | null;
}
export interface IssueHistory {
  readonly policy: string;
  readonly baselineRef: string;
  readonly comparable: boolean;
  readonly reason: string;
  readonly before: VerificationRun;
  readonly after: VerificationRun;
  readonly issues: readonly HistoricalIssue[];
}
