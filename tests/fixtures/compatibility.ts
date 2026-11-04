import { Page } from '@playwright/test';
import { consumerCommit, contractHash, consumerPublication, providerCommit, providerVersion, sourceVersion } from './registry';
import { ciRunId, configurationHash, failedRun, failedRunId, passedRunId, reportBody, runs, verificationFixture } from './verifications';

export const profileId = '933a3d67-9f85-4bdb-8adc-d67553f96e76';
export const decisionId = 'e9a19a32-e5ab-4aa2-b4dd-832481bdb501';
export const nextDecisionId = '2e0c7c4b-379f-4b77-9760-4c4fb916f13c';
export const decisionCursor = 'decisions+/=&?cursor';
export const profileCursor = 'profiles+/=&?cursor';
const date = '2026-11-04T10:00:00.000Z';
export const required = { checkId: 'pact-provider', verifierName: 'pact-http', verifierVersion: '1.2.3', configurationSha256: configurationHash };
export const extraRequired = { ...required, checkId: 'pact-extra', configurationSha256: '76'.repeat(32) };
export const profile = { id: profileId, consumerApplicationId: 'payments', providerApplicationId: 'invoice', name: 'release', version: 'v1/2 + candidate', contentSha256: '54'.repeat(32), checks: [extraRequired, required], publisherId: 'payments-ci', registeredAt: date };
const appliedCheck = { required, status: 'Passed', reason: 'Reported', evidenceId: passedRunId, evidencePayloadSha256: '32'.repeat(32), reportedStatus: 'Passed', observedVerifier: required, observedPublicationId: consumerPublication.id, buildUrl: failedRun.buildUrl, publisherId: 'provider-ci', issueCount: 0 };
const extraRunId = '3a6165a7-0ab1-4379-ad14-fbb20b3ad504';
type CheckFixture = Omit<typeof appliedCheck, 'evidenceId' | 'evidencePayloadSha256' | 'reportedStatus' | 'observedVerifier' | 'observedPublicationId' | 'buildUrl' | 'publisherId'> & {
  evidenceId: string | null; evidencePayloadSha256: string | null; reportedStatus: string | null; observedVerifier: typeof required | null;
  observedPublicationId: string | null; buildUrl: string | null; publisherId: string | null;
};
export type MatrixStatus = 'Passed' | 'Failed' | 'Error' | 'Unverified';
export type GapReason = 'ContractNotPublished' | 'MissingExecution' | 'VerifierMismatch' | 'SourceRefMismatch';
export function decisionFixture(status: MatrixStatus = 'Passed', gap?: GapReason) {
  const checks: CheckFixture[] = profile.checks.map(check => ({ ...appliedCheck, required: check, observedVerifier: check, evidenceId: check.checkId === required.checkId ? passedRunId : extraRunId }));
  if (status !== 'Passed') checks[1] = { ...checks[1], status, reportedStatus: status, evidenceId: failedRunId, issueCount: status === 'Failed' ? 4 : 0 };
  if (gap) {
    const observed = gap === 'VerifierMismatch' || gap === 'SourceRefMismatch';
    checks[1] = { ...checks[1], status: 'Unverified', reason: gap, evidenceId: observed ? passedRunId : null, evidencePayloadSha256: observed ? appliedCheck.evidencePayloadSha256 : null,
      reportedStatus: observed ? 'Passed' : null, observedVerifier: observed ? { ...required, verifierVersion: gap === 'VerifierMismatch' ? '<img src=x onerror=alert(1)>' : required.verifierVersion } : null,
      observedPublicationId: observed ? consumerPublication.id : null, buildUrl: observed ? 'javascript:alert(1)' : null, publisherId: observed ? 'provider-ci' : null, issueCount: 0 };
    if (gap === 'ContractNotPublished') checks[0] = { ...checks[1], required: extraRequired };
    status = 'Unverified';
  }
  const row = { consumerApplicationId: 'payments', consumerCommitSha: consumerCommit, providerApplicationId: 'invoice', providerCommitSha: providerCommit, consumerVersionId: sourceVersion.id,
    providerVersionId: providerVersion.id, bindingId: gap === 'ContractNotPublished' ? null : failedRun.bindingId, contractSha256: contractHash, ciRunId, ciAttempt: 2, providerSourceRef: failedRun.sourceRef,
    status, checks, missingChecks: checks.filter(c => c.status === 'Unverified').map(c => c.required.checkId), unresolvedChecks: checks.filter(c => c.status !== 'Passed').map(c => c.required.checkId) };
  return { id: decisionId, policy: 'explicit-ci-execution-v1', profile, status, compatible: status === 'Passed', rows: [row], sourceApplicationId: 'payments', publisherId: 'payments-ci', evaluatedAt: date };
}
export async function compatibilityFixture(page: Page, status: MatrixStatus = 'Passed', gap?: GapReason): Promise<string[]> {
  await verificationFixture(page); const requests: string[] = []; const stored = decisionFixture(status, gap);
  for (const check of stored.rows[0].checks) {
    if (check.evidenceId && check.observedVerifier) {
      const observed = check.observedVerifier;
      const recorded = runs.find(run => run.status === check.reportedStatus)!;
      await page.route(`**/backend/api/verification-runs/${check.evidenceId}`, route => route.fulfill({ contentType: 'application/json', body: reportBody({ ...recorded, id: check.evidenceId, ciCheckId: observed.checkId,
        verifierName: observed.verifierName, verifierVersion: observed.verifierVersion, configurationSha256: observed.configurationSha256 }) }));
    }
  }
  page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/backend/api/')) { if (request.method() !== 'GET' || request.headers()['authorization']) throw new Error('Compatibility browsing must be an anonymous read.'); requests.push(request.url()); } });
  await page.route(url => url.pathname.startsWith('/backend/api/compatibility-decisions'), route => {
    const { pathname, searchParams: q } = new URL(route.request().url());
    if (pathname.endsWith(`/${decisionId}`)) return route.fulfill({ json: stored });
    if (pathname.endsWith(`/${nextDecisionId}`)) return route.fulfill({ json: { ...stored, id: nextDecisionId } });
    if (pathname !== '/backend/api/compatibility-decisions') return route.fulfill({ status: 404, json: { traceId: 'decision-404' } });
    const row = stored.rows[0]; const selection = { ...row, profileId, status: stored.status };
    const matches = ['consumerApplicationId', 'providerApplicationId', 'consumerCommitSha', 'providerCommitSha', 'contractSha256', 'profileId', 'status'].every(key => !q.has(key) || selection[key as keyof typeof selection] === q.get(key));
    const summary = { ...stored, id: q.has('after') ? nextDecisionId : decisionId, consumerApplicationId: 'payments', providerApplicationId: 'invoice', profileId, profileName: profile.name, profileVersion: profile.version, rowCount: stored.rows.length };
    return route.fulfill({ json: { items: matches ? [summary] : [], nextCursor: matches && !q.has('after') ? decisionCursor : null } });
  });
  await page.route(url => url.pathname.startsWith('/backend/api/verification-profiles'), route => {
    const { pathname, searchParams: q } = new URL(route.request().url()); if (pathname.endsWith(`/${profileId}`)) return route.fulfill({ json: profile });
    const matches = ['consumerApplicationId', 'providerApplicationId', 'name', 'version'].every(key => !q.has(key) || profile[key as keyof typeof profile] === q.get(key));
    return route.fulfill({ json: { items: matches ? [profile] : [], nextCursor: matches && !q.has('after') ? profileCursor : null } });
  });
  return requests;
}
