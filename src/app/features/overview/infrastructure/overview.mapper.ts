import { DependencyGraphResultDto, EvidenceSelectionResultDto, RegistryOverviewResultDto, VerificationCountsResultDto } from '../../../shared/infrastructure/api-clients/pact/models';
import { boolean, count, invalidResponse, optionalText, text, timestamp } from '../../../shared/infrastructure/read-mapping';
import { object } from '../../../shared/infrastructure/problem-details';
import { integration } from '../../registry/infrastructure/registry.mapper';
import { VerificationStatus } from '../../verifications/domain/verification.models';
import { DependencyGraph, EvidenceSelection, RegistryOverview, ReportCounts } from '../domain/overview.models';

const fields = ['applicationId', 'consumerApplicationId', 'providerApplicationId', 'consumerCommitSha', 'providerCommitSha', 'contractSha256', 'sourceRef', 'issueCode', 'jsonPath', 'ciRunId', 'ciCheckId', 'verifierName', 'verifierVersion', 'configurationSha256'] as const;
export const recordedEvidencePolicy = 'RecordedReportsOnly-v1; not a compatibility decision; not a transactional snapshot';
function policy(value: unknown): string { return value === recordedEvidencePolicy ? value : invalidResponse(); }
function selection(dto: EvidenceSelectionResultDto | null | undefined): EvidenceSelection {
  if (!dto) return invalidResponse();
  const result: Record<string, string | number> = {};
  for (const key of fields) { const value = optionalText(dto[key]); if (value !== null) result[key] = value; }
  if (dto.status != null) {
    if (!['Passed', 'Failed', 'Error', 'Unverified'].includes(dto.status)) return invalidResponse();
    result['status'] = dto.status as VerificationStatus;
  }
  if (dto.ciAttempt?.getValue() != null) { const value = count(dto.ciAttempt); if (value < 1) return invalidResponse(); result['ciAttempt'] = value; }
  return result;
}
function counts(dto: VerificationCountsResultDto | null | undefined): ReportCounts {
  if (!dto) return invalidResponse();
  const result = { passed: count(dto.passed), failed: count(dto.failed), error: count(dto.errorEscaped), unverified: count(dto.unverified), total: count(dto.total) };
  const sum = result.passed + result.failed + result.error + result.unverified;
  if (!Number.isSafeInteger(sum) || result.total !== sum) return invalidResponse();
  return result;
}
export function overview(dto: RegistryOverviewResultDto, raw: unknown): RegistryOverview {
  if (!object(object(raw)?.['selection'])) return invalidResponse();
  if (!dto.inventory) return invalidResponse(); const i = dto.inventory;
  return { inventory: { registeredApplications: count(i.registeredApplications), applicationVersions: count(i.applicationVersions), declaredIntegrations: count(i.declaredIntegrations), contractPublications: count(i.contractPublications),
    verificationProfiles: count(i.verificationProfiles), contractComparisons: count(i.contractComparisons), compatibilityDecisions: count(i.compatibilityDecisions) },
  matchingReports: counts(dto.matchingReports), selection: selection(dto.selection), evidencePolicy: policy(dto.evidencePolicy), observedAt: timestamp(dto.observedAt) };
}
export function dependencies(dto: DependencyGraphResultDto, raw: unknown): DependencyGraph {
  if (!object(object(raw)?.['selection'])) return invalidResponse();
  if (!Array.isArray(dto.nodes) || !Array.isArray(dto.edges) || dto.edges.length > 100 || dto.nodes.length > 200) return invalidResponse();
  const nodes = dto.nodes.map(n => text(n.applicationId));
  if (new Set(nodes).size !== nodes.length) return invalidResponse();
  const edges = dto.edges.map(edge => {
    if (!edge.integration || edge.relationship !== 'Declared') return invalidResponse();
    const declared = integration(edge.integration);
    if (declared.consumerApplicationId === declared.providerApplicationId || !nodes.includes(declared.consumerApplicationId) || !nodes.includes(declared.providerApplicationId)) return invalidResponse();
    return { integration: declared, relationship: 'Declared' as const, matchingReports: counts(edge.matchingReports) };
  });
  if (new Set(edges.map(e => e.integration.id)).size !== edges.length || new Set(edges.map(e => JSON.stringify([e.integration.consumerApplicationId, e.integration.providerApplicationId]))).size !== edges.length) return invalidResponse();
  if (nodes.some(node => !edges.some(e => e.integration.consumerApplicationId === node || e.integration.providerApplicationId === node))) return invalidResponse();
  const nextCursor = optionalText(dto.nextCursor); const isComplete = boolean(dto.isComplete);
  if (isComplete && nextCursor !== null) return invalidResponse();
  return { nodes, edges, nextCursor, isComplete, selection: selection(dto.selection), evidencePolicy: policy(dto.evidencePolicy) };
}
