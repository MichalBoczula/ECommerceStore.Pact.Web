import { stringify } from 'lossless-json';
import { VerificationRunResultDto, VerificationSummaryResultDto, VerificationIssueResultDto } from '../../../shared/infrastructure/api-clients/pact/models';
import { object } from '../../../shared/infrastructure/problem-details';
import { count, invalidResponse, optionalText, text, timestamp } from '../../../shared/infrastructure/read-mapping';
import { DiagnosticValue, VerificationEvidence, VerificationIssue, VerificationRun, VerificationStatus, VerificationSummary } from '../domain/verification.models';

function status(value: unknown): VerificationStatus {
  if (value === 'Passed' || value === 'Failed' || value === 'Error' || value === 'Unverified') return value;
  return invalidResponse();
}

function evidence(dto: VerificationSummaryResultDto | VerificationRunResultDto): VerificationEvidence {
  const ciAttempt = count(dto.ciAttempt);
  if (ciAttempt < 1) return invalidResponse();
  return {
    id: text(dto.id), consumerApplicationId: text(dto.consumerApplicationId), consumerCommitSha: text(dto.consumerCommitSha),
    providerApplicationId: text(dto.providerApplicationId), providerCommitSha: text(dto.providerCommitSha), consumerPublicationId: text(dto.consumerPublicationId),
    contractSha256: text(dto.contractSha256), status: status(dto.status), summary: text(dto.summary), ciRunId: text(dto.ciRunId),
    ciAttempt, ciCheckId: text(dto.ciCheckId), verifierName: text(dto.verifierName), verifierVersion: text(dto.verifierVersion),
    configurationSha256: text(dto.configurationSha256), sourceRef: text(dto.sourceRef), buildUrl: text(dto.buildUrl), publisherId: text(dto.publisherId),
    startedAt: timestamp(dto.startedAt), finishedAt: timestamp(dto.finishedAt), recordedAt: timestamp(dto.recordedAt),
  };
}

export function verificationSummary(dto: VerificationSummaryResultDto): VerificationSummary {
  return { ...evidence(dto), issueCount: count(dto.issueCount) };
}

function diagnostic(raw: Record<string, unknown>, name: string): DiagnosticValue {
  if (!Object.hasOwn(raw, name)) return { present: false };
  const json = stringify(raw[name]);
  return typeof json === 'string' ? { present: true, json } : invalidResponse();
}

function issue(dto: VerificationIssueResultDto, raw: unknown): VerificationIssue {
  const source = object(raw);
  if (!source) return invalidResponse();
  return {
    kind: text(dto.kind), code: text(dto.code), message: text(dto.message), interaction: optionalText(dto.interaction),
    method: optionalText(dto.method), path: optionalText(dto.path), jsonPath: optionalText(dto.jsonPath),
    actualPresent: dto.actualPresent ?? null, evidenceUrl: optionalText(dto.evidenceUrl),
    expected: diagnostic(source, 'expected'), actual: diagnostic(source, 'actual'),
  };
}

export function verificationRun(dto: VerificationRunResultDto, raw: unknown): VerificationRun {
  const source = object(raw);
  const issues = source?.['issues'];
  if (!Array.isArray(issues) || !Array.isArray(dto.issues) || dto.issues.length !== issues.length || !Array.isArray(dto.evidenceUrls)) {
    return invalidResponse();
  }
  return {
    ...evidence(dto), bindingId: text(dto.bindingId), consumerVersionId: text(dto.consumerVersionId), providerVersionId: text(dto.providerVersionId),
    expectedInteractions: count(dto.expectedInteractions), verifiedInteractions: count(dto.verifiedInteractions), failedInteractions: count(dto.failedInteractions),
    issues: dto.issues.map((value, index) => issue(value, issues[index])), evidenceUrls: dto.evidenceUrls.map(text),
  };
}
