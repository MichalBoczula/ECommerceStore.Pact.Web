import { Integration } from '../../registry/domain/registry.models';
import { EvidenceFilter } from '../../verifications/domain/verification.models';

export type EvidenceSelection = Omit<EvidenceFilter, 'limit' | 'after'>;
export interface ReportCounts {
  readonly passed: number;
  readonly failed: number;
  readonly error: number;
  readonly unverified: number;
  readonly total: number;
}
export interface RegistryInventory {
  readonly registeredApplications: number;
  readonly applicationVersions: number;
  readonly declaredIntegrations: number;
  readonly contractPublications: number;
  readonly verificationProfiles: number;
  readonly contractComparisons: number;
  readonly compatibilityDecisions: number;
}
export interface RegistryOverview {
  readonly inventory: RegistryInventory;
  readonly matchingReports: ReportCounts;
  readonly selection: EvidenceSelection;
  readonly evidencePolicy: string;
  readonly observedAt: string;
}
export interface DependencyEdge {
  readonly integration: Integration;
  readonly relationship: 'Declared';
  readonly matchingReports: ReportCounts;
}
export interface DependencyGraph {
  readonly nodes: readonly string[];
  readonly edges: readonly DependencyEdge[];
  readonly nextCursor: string | null;
  readonly selection: EvidenceSelection;
  readonly evidencePolicy: string;
  readonly isComplete: boolean;
}
