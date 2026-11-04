import { CompatibilityCheckResultDto, CompatibilityDecisionResultDto, CompatibilityRowResultDto, DecisionSummaryResultDto, RequiredCheckResultDto, VerificationProfileResultDto } from '../../../shared/infrastructure/api-clients/pact/models';
import { boolean, count, invalidResponse, optionalText, text, timestamp } from '../../../shared/infrastructure/read-mapping';
import { object } from '../../../shared/infrastructure/problem-details';
import { VerificationStatus } from '../../verifications/domain/verification.models';
import { CompatibilityCheck, CompatibilityDecision, CompatibilityReason, CompatibilityRow, DecisionSummary, RequiredCheck, VerificationProfile } from '../domain/compatibility.models';

function status(value: unknown): VerificationStatus {
  return value === 'Passed' || value === 'Failed' || value === 'Error' || value === 'Unverified' ? value : invalidResponse();
}
function policy(value: unknown): string { return value === 'explicit-ci-execution-v1' ? value : invalidResponse(); }
function bounded<T>(values: T[] | null | undefined): T[] { return Array.isArray(values) && values.length >= 1 && values.length <= 10 ? values : invalidResponse(); }
function unique(values: readonly string[]): void { if (new Set(values).size !== values.length) invalidResponse(); }
function strings(values: string[] | null | undefined): string[] { if (!Array.isArray(values)) return invalidResponse(); const result = values.map(text); unique(result); return result; }
function sameCheck(a: RequiredCheck, b: RequiredCheck): boolean { return a.checkId === b.checkId && a.verifierName === b.verifierName && a.verifierVersion === b.verifierVersion && a.configurationSha256 === b.configurationSha256; }
function sameSet(a: readonly string[], b: readonly string[]): boolean { return a.length === b.length && a.every(v => b.includes(v)); }

function requiredCheck(dto: RequiredCheckResultDto): RequiredCheck {
  return requiredValues({ ...dto.additionalData, ...dto });
}
function requiredValues(value: Readonly<Record<string, unknown>>): RequiredCheck {
  return { checkId: text(value['checkId']), verifierName: text(value['verifierName']), verifierVersion: text(value['verifierVersion']), configurationSha256: text(value['configurationSha256']) };
}
export function profile(dto: VerificationProfileResultDto): VerificationProfile {
  const checks = bounded(dto.checks).map(requiredCheck); unique(checks.map(c => c.checkId));
  return { id: text(dto.id), consumerApplicationId: text(dto.consumerApplicationId), providerApplicationId: text(dto.providerApplicationId), name: text(dto.name), version: text(dto.version),
    contentSha256: text(dto.contentSha256), checks, publisherId: text(dto.publisherId), registeredAt: timestamp(dto.registeredAt) };
}
export function decisionSummary(dto: DecisionSummaryResultDto): DecisionSummary {
  const rowCount = count(dto.rowCount); if (rowCount < 1 || rowCount > 10) return invalidResponse();
  return { id: text(dto.id), profileId: text(dto.profileId), profileName: text(dto.profileName), profileVersion: text(dto.profileVersion), policy: policy(dto.policy),
    consumerApplicationId: text(dto.consumerApplicationId), providerApplicationId: text(dto.providerApplicationId), status: status(dto.status), rowCount,
    sourceApplicationId: text(dto.sourceApplicationId), publisherId: text(dto.publisherId), evaluatedAt: timestamp(dto.evaluatedAt) };
}
function check(dto: CompatibilityCheckResultDto, raw: unknown): CompatibilityCheck {
  const reason = text(dto.reason) as CompatibilityReason;
  if (!['ContractNotPublished', 'MissingExecution', 'VerifierMismatch', 'SourceRefMismatch', 'Reported'].includes(reason) || !dto.required) return invalidResponse();
  // Kiota's nullable union also turns JSON null into an empty object. Read this one member from the same captured response.
  const captured = object(raw); if (!captured || !('observedVerifier' in captured)) return invalidResponse();
  const observed = captured['observedVerifier'] === null ? null : object(captured['observedVerifier']) ?? invalidResponse();
  const result: CompatibilityCheck = { required: requiredCheck(dto.required), status: status(dto.status), reason, evidenceId: optionalText(dto.evidenceId), evidencePayloadSha256: optionalText(dto.evidencePayloadSha256),
    reportedStatus: dto.reportedStatus == null ? null : status(dto.reportedStatus), observedVerifier: observed === null ? null : requiredValues(observed),
    observedPublicationId: optionalText(dto.observedPublicationId), buildUrl: optionalText(dto.buildUrl), publisherId: optionalText(dto.publisherId), issueCount: count(dto.issueCount) };
  if (result.issueCount > 100 || (result.evidenceId === null ? result.reportedStatus !== null || result.observedVerifier !== null || result.evidencePayloadSha256 !== null :
    result.reportedStatus === null || result.observedVerifier === null || result.evidencePayloadSha256 === null)) return invalidResponse();
  if (reason !== 'Reported' && result.status !== 'Unverified') return invalidResponse();
  if (reason === 'Reported' && (!result.evidenceId || result.status !== result.reportedStatus || !result.observedVerifier || !sameCheck(result.required, result.observedVerifier))) return invalidResponse();
  return result;
}
function row(dto: CompatibilityRowResultDto, raw: unknown): CompatibilityRow {
  const captured = object(raw)?.['checks']; if (!Array.isArray(captured) || captured.length !== dto.checks?.length) return invalidResponse();
  const checks = bounded(dto.checks).map((value, index) => check(value, captured[index])); unique(checks.map(c => c.required.checkId));
  const ciAttempt = count(dto.ciAttempt); if (ciAttempt < 1 || ciAttempt > 10000) return invalidResponse();
  const missingChecks = strings(dto.missingChecks); const unresolvedChecks = strings(dto.unresolvedChecks);
  if (!sameSet(missingChecks, checks.filter(c => c.status === 'Unverified').map(c => c.required.checkId)) || !sameSet(unresolvedChecks, checks.filter(c => c.status !== 'Passed').map(c => c.required.checkId))) return invalidResponse();
  return { consumerApplicationId: text(dto.consumerApplicationId), consumerCommitSha: text(dto.consumerCommitSha), providerApplicationId: text(dto.providerApplicationId), providerCommitSha: text(dto.providerCommitSha),
    consumerVersionId: text(dto.consumerVersionId), providerVersionId: text(dto.providerVersionId), bindingId: optionalText(dto.bindingId), contractSha256: text(dto.contractSha256), ciRunId: text(dto.ciRunId), ciAttempt,
    providerSourceRef: text(dto.providerSourceRef), status: status(dto.status), checks, missingChecks, unresolvedChecks };
}
export function decision(dto: CompatibilityDecisionResultDto, raw: unknown): CompatibilityDecision {
  if (!dto.profile) return invalidResponse();
  const captured = object(raw)?.['rows']; if (!Array.isArray(captured) || captured.length !== dto.rows?.length) return invalidResponse();
  const selectedProfile = profile(dto.profile); const rows = bounded(dto.rows).map((value, index) => row(value, captured[index])); const outcome = status(dto.status); const compatible = boolean(dto.compatible);
  unique(rows.map(r => JSON.stringify([r.consumerApplicationId, r.consumerCommitSha, r.providerApplicationId, r.providerCommitSha, r.contractSha256, r.ciRunId, r.ciAttempt, r.providerSourceRef])));
  for (const r of rows) {
    if (r.consumerApplicationId !== selectedProfile.consumerApplicationId || r.providerApplicationId !== selectedProfile.providerApplicationId || r.checks.length !== selectedProfile.checks.length ||
      !selectedProfile.checks.every(required => r.checks.some(c => sameCheck(required, c.required)))) return invalidResponse();
    // Validate positive snapshots; the API remains responsible for evaluating and aggregating outcomes.
    if (r.status === 'Passed' && (r.bindingId === null || r.checks.some(c => c.status !== 'Passed'))) return invalidResponse();
  }
  if (compatible !== (outcome === 'Passed') || (compatible && rows.some(r => r.status !== 'Passed'))) return invalidResponse();
  return { id: text(dto.id), policy: policy(dto.policy), profile: selectedProfile, status: outcome, compatible, rows,
    sourceApplicationId: text(dto.sourceApplicationId), publisherId: text(dto.publisherId), evaluatedAt: timestamp(dto.evaluatedAt) };
}
