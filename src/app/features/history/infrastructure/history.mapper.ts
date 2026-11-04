import { ComparisonSourceResultDto, ComparisonSummaryResultDto, ContractComparisonResultDto, IssueHistoryResultDto, SchemaFindingResultDto } from '../../../shared/infrastructure/api-clients/pact/models';
import { object } from '../../../shared/infrastructure/problem-details';
import { boolean, count, invalidResponse, optionalText, text, timestamp } from '../../../shared/infrastructure/read-mapping';
import { historicalVerificationIssue, verificationRun } from '../../verifications/infrastructure/verification.mapper';
import { ComparisonSource, ComparisonSummary, ContractComparison, HistoricalIssue, IssueHistory, IssueTransition, SchemaAssessment, SchemaFinding } from '../domain/history.models';

function assessment(value: unknown): SchemaAssessment {
  return value === 'NoBreakingChangesDetected' || value === 'PotentiallyBreaking' || value === 'NotAssessed' ? value : invalidResponse();
}
function transition(value: unknown): IssueTransition {
  return value === 'Appeared' || value === 'Observed' || value === 'Persisting' || value === 'Resolved' || value === 'Unconfirmed' || value === 'RequirementsChanged' || value === 'VerifierChanged' ? value : invalidResponse();
}
export function comparisonSummary(dto: ComparisonSummaryResultDto): ComparisonSummary {
  return { id: text(dto.id), consumerApplicationId: text(dto.consumerApplicationId), providerApplicationId: text(dto.providerApplicationId),
    beforePublicationId: text(dto.beforePublicationId), afterPublicationId: text(dto.afterPublicationId), sourceApplicationId: text(dto.sourceApplicationId),
    beforeCommitSha: text(dto.beforeCommitSha), afterCommitSha: text(dto.afterCommitSha), kind: text(dto.kind), baselineRef: text(dto.baselineRef),
    contentChanged: boolean(dto.contentChanged), jsonChanged: boolean(dto.jsonChanged), schemaAssessment: assessment(dto.schemaAssessment), findingCount: count(dto.findingCount),
    tool: text(dto.tool), toolVersion: text(dto.toolVersion), comparedAt: timestamp(dto.comparedAt) };
}
function source(dto: ComparisonSourceResultDto | null | undefined): ComparisonSource {
  if (!dto) return invalidResponse();
  return { publicationId: text(dto.publicationId), bindingId: text(dto.bindingId), sourceVersionId: text(dto.sourceVersionId), applicationId: text(dto.applicationId),
    commitSha: text(dto.commitSha), kind: text(dto.kind), artifactSha256: text(dto.artifactSha256), sourceRef: text(dto.sourceRef) };
}
function finding(dto: SchemaFindingResultDto): SchemaFinding {
  const level = dto.level;
  if (level !== 'Info' && level !== 'Warning' && level !== 'Error') return invalidResponse();
  return { code: text(dto.code), level, message: text(dto.message), method: optionalText(dto.method), path: optionalText(dto.path) };
}
export function comparison(dto: ContractComparisonResultDto): ContractComparison {
  if (!Array.isArray(dto.findings) || !Array.isArray(dto.limitations)) return invalidResponse();
  return { id: text(dto.id), profile: text(dto.profile), consumerApplicationId: text(dto.consumerApplicationId), providerApplicationId: text(dto.providerApplicationId),
    before: source(dto.before), after: source(dto.after), baselineRef: text(dto.baselineRef), publisherId: text(dto.publisherId), contentChanged: boolean(dto.contentChanged),
    jsonChanged: boolean(dto.jsonChanged), schemaAssessment: assessment(dto.schemaAssessment), tool: text(dto.tool), toolVersion: text(dto.toolVersion),
    findings: dto.findings.map(finding), limitations: dto.limitations.map(text), consumerImpact: text(dto.consumerImpact), comparedAt: timestamp(dto.comparedAt) };
}
export function issueHistory(dto: IssueHistoryResultDto, raw: unknown): IssueHistory {
  const captured = object(raw);
  if (!captured || !dto.before || !dto.after || !Array.isArray(dto.issues) || !Array.isArray(captured['issues']) || dto.issues.length !== captured['issues'].length) return invalidResponse();
  const before = verificationRun(dto.before, captured['before']);
  const after = verificationRun(dto.after, captured['after']);
  const policy = text(dto.policy);
  const baselineRef = text(dto.baselineRef);
  const comparable = boolean(dto.comparable);
  if (policy !== 'exact-pact-requirements-v1' || before.consumerApplicationId !== after.consumerApplicationId || before.providerApplicationId !== after.providerApplicationId || before.sourceRef !== baselineRef) return invalidResponse();
  // A positive comparison/resolution label requires evidence supported by this pinned policy.
  // Negative decisions are displayed as returned; the browser never upgrades them to comparable.
  if (comparable && (before.contractSha256 !== after.contractSha256 || before.verifierName !== after.verifierName || before.verifierVersion !== after.verifierVersion || before.configurationSha256 !== after.configurationSha256 || before.ciCheckId !== after.ciCheckId)) return invalidResponse();
  const rawIssues = captured['issues'];
  const issues: HistoricalIssue[] = dto.issues.map((entry, index) => {
    const item = object(rawIssues[index]);
    if (!item) return invalidResponse();
    const previous = historicalVerificationIssue(item['before']);
    const current = historicalVerificationIssue(item['after']);
    const value = transition(entry.transition);
    if ((!previous && !current) || (previous && previous.kind !== 'Mismatch') || (current && current.kind !== 'Mismatch')) return invalidResponse();
    if (value === 'Resolved' && (!comparable || after.status !== 'Passed' || !previous || current)) return invalidResponse();
    return { key: text(entry.key), transition: value, before: previous, after: current };
  });
  if (new Set(issues.map(issue => issue.key)).size !== issues.length) return invalidResponse();
  return { policy, baselineRef, comparable, reason: text(dto.reason), before, after, issues };
}
