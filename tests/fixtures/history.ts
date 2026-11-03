import { Page } from '@playwright/test';
import { originalContent, providerCommit, providerHash, providerPublication, providerVersion } from './registry';
import { failedRun, failedRunId, passedRunId, reportBody, verificationFixture } from './verifications';

export const comparisonId = '6a3d5b42-60ba-4855-b208-098aa7ba76ef';
export const secondComparisonId = '47a2c65d-5b64-43cc-b71b-d98492f8ecfa';
export const nextPublicationId = '6a3c9ddd-d2fe-44b1-8175-602f943277f4';
export const nextVersionId = '1792f769-9ba7-4c37-a5cb-3958a93004ca';
export const nextCommit = '56'.repeat(20);
export const nextHash = '78'.repeat(32);
export const comparisonCursor = 'comparisons+/=&?cursor';
export const policy = 'exact-pact-requirements-v1';
export const comparisonBaseline = providerPublication.sourceRef;
const beforeSource = { publicationId: providerPublication.id, bindingId: providerPublication.bindingId, sourceVersionId: providerVersion.id, applicationId: 'invoice', commitSha: providerCommit, kind: 'ProviderOpenApi', artifactSha256: providerHash, sourceRef: comparisonBaseline };
const afterSource = { ...beforeSource, publicationId: nextPublicationId, sourceVersionId: nextVersionId, commitSha: nextCommit, artifactSha256: nextHash, sourceRef: 'refs/heads/provider/fix' };
export const storedComparison = { id: comparisonId, profile: 'registry-comparison-v1/oasdiff-1.35.0', consumerApplicationId: 'payments', providerApplicationId: 'invoice', before: beforeSource, after: afterSource,
  baselineRef: comparisonBaseline, publisherId: 'invoice-ci', contentChanged: true, jsonChanged: true, schemaAssessment: 'PotentiallyBreaking', tool: 'oasdiff', toolVersion: '1.35.0',
  findings: [{ code: 'response-property-removed', level: 'Error', message: '<img src=x onerror=alert(1)> removed a response property.', method: 'GET', path: '/invoices' }],
  limitations: ['Schema analysis does not execute consumer requirements.'], consumerImpact: 'NotEvaluated', comparedAt: '2026-11-04T10:00:00.000Z' };
export const nextProviderVersion = { ...providerVersion, id: nextVersionId, commitSha: nextCommit };
export const nextProviderPublication = { ...providerPublication, id: nextPublicationId, sourceVersionId: nextVersionId, commitSha: nextCommit, artifactSha256: nextHash, sourceRef: afterSource.sourceRef };
export type HistoryScenario = 'resolved' | 'requirements' | 'verifier' | 'unconfirmed' | 'persisting' | 'appeared' | 'observed' | 'empty';

export function issueHistoryFixture(scenario: HistoryScenario) {
  const previousIssue = scenario === 'resolved' ? failedRun.issues[3] : failedRun.issues[0];
  let before = { ...failedRun, issues: [previousIssue] };
  let after = { ...failedRun, id: passedRunId, providerCommitSha: nextCommit, providerVersionId: nextVersionId, ciAttempt: 3,
    status: 'Passed', summary: 'Consumer requirements were verified.', verifiedInteractions: 2, failedInteractions: 0, issues: [] as typeof failedRun.issues, recordedAt: '2026-11-04T10:00:00.000Z' };
  let comparable = true; let reason = 'Exact Pact content and verifier/check configuration match.'; let transition = 'Resolved';
  let oldIssue: unknown = previousIssue; let newIssue: unknown = null;
  if (scenario === 'requirements') { comparable = false; reason = 'Consumer requirements changed; absence is not a provider fix.'; transition = 'RequirementsChanged'; after = { ...after, contractSha256: '90'.repeat(32), consumerPublicationId: 'ba0d1dde-aaf6-483f-93df-1b2d8e3bce9d' }; }
  if (scenario === 'verifier') { comparable = false; reason = 'Verifier version, configuration or check changed.'; transition = 'VerifierChanged'; after = { ...after, verifierVersion: '2.0.0' }; }
  if (scenario === 'unconfirmed') {
    transition = 'Unconfirmed'; after = { ...after, status: 'Error', summary: 'The verifier could not execute.', verifiedInteractions: 0, failedInteractions: 0,
      issues: [{ kind: 'ExecutionError', code: 'VerifierUnavailable', message: 'The provider could not be reached.', interaction: null, method: null, path: null, jsonPath: null, actualPresent: null, evidenceUrl: null }] as unknown as typeof failedRun.issues };
  }
  if (scenario === 'persisting') {
    const current = { ...failedRun.issues[0], actualPresent: true, actual: null, message: 'A supplied null still differs.' };
    transition = 'Persisting'; newIssue = current; after = { ...after, status: 'Failed', summary: 'A mismatch remains in the candidate.', verifiedInteractions: 1, failedInteractions: 1, issues: [current] };
  }
  if (scenario === 'appeared' || scenario === 'observed') {
    transition = scenario === 'appeared' ? 'Appeared' : 'Observed'; oldIssue = null; newIssue = failedRun.issues[0];
    before = { ...before, status: scenario === 'appeared' ? 'Passed' : 'Unverified', summary: scenario === 'appeared' ? 'Baseline requirements were verified.' : 'Baseline interactions were not verified.', verifiedInteractions: scenario === 'appeared' ? 2 : 0, failedInteractions: 0, issues: [] };
    after = { ...after, status: 'Failed', summary: 'A mismatch remains in the candidate.', verifiedInteractions: 1, failedInteractions: 1, issues: [failedRun.issues[0]] };
  }
  if (scenario === 'empty') { before = { ...before, status: 'Passed', summary: 'Baseline requirements were verified.', verifiedInteractions: 2, failedInteractions: 0, issues: [] }; }
  return { policy, baselineRef: before.sourceRef, comparable, reason, before, after, issues: scenario === 'empty' ? [] : [{ key: '32'.repeat(32), transition, before: oldIssue, after: newIssue }] };
}

export async function historyFixture(page: Page, scenario: HistoryScenario = 'resolved'): Promise<string[]> {
  await verificationFixture(page);
  const selected = issueHistoryFixture(scenario);
  const requests: string[] = [];
  page.on('request', request => {
    const path = new URL(request.url()).pathname;
    if (path.startsWith('/backend/api/')) { if (request.method() !== 'GET') throw new Error('History browsing must not publish or recompute evidence.'); requests.push(request.url()); }
  });
  await page.route(url => url.pathname.startsWith('/backend/api/contract-comparisons'), route => {
    const { pathname, searchParams: q } = new URL(route.request().url());
    if (pathname.endsWith(`/${comparisonId}`)) return route.fulfill({ json: storedComparison });
    if (pathname.endsWith(`/${secondComparisonId}`)) return route.fulfill({ json: { ...storedComparison, id: secondComparisonId, jsonChanged: false, schemaAssessment: 'NoBreakingChangesDetected', findings: [], limitations: [] } });
    if (pathname !== '/backend/api/contract-comparisons') return route.fulfill({ status: 404, json: { traceId: 'comparison-not-found' } });
    const summary = { id: comparisonId, consumerApplicationId: 'payments', providerApplicationId: 'invoice', beforePublicationId: beforeSource.publicationId, afterPublicationId: afterSource.publicationId,
      sourceApplicationId: 'invoice', beforeCommitSha: providerCommit, afterCommitSha: nextCommit, kind: 'ProviderOpenApi', baselineRef: comparisonBaseline, contentChanged: true, jsonChanged: true,
      schemaAssessment: 'PotentiallyBreaking', findingCount: 1, tool: storedComparison.tool, toolVersion: storedComparison.toolVersion, comparedAt: storedComparison.comparedAt };
    const matches = ['consumerApplicationId', 'providerApplicationId', 'sourceApplicationId', 'kind', 'baselineRef'].every(key => !q.get(key) || summary[key as keyof typeof summary] === q.get(key));
    return route.fulfill({ json: { items: matches ? [{ ...summary, id: q.has('after') ? secondComparisonId : comparisonId }] : [], nextCursor: matches && !q.has('after') ? comparisonCursor : null } });
  });
  await page.route('**/backend/api/issue-history?*', route => route.fulfill({ contentType: 'application/json', body: reportBody(selected) }));
  for (const run of [selected.before, selected.after]) await page.route(`**/backend/api/verification-runs/${run.id}`, route => route.fulfill({ contentType: 'application/json', body: reportBody(run) }));
  await page.route(`**/backend/api/contract-publications/${nextPublicationId}`, route => route.fulfill({ json: nextProviderPublication }));
  await page.route(`**/backend/api/applications/invoice/versions/${nextCommit}`, route => route.fulfill({ json: nextProviderVersion }));
  await page.route(`**/backend/api/artifacts/${nextHash}`, route => route.fulfill({ json: { sha256: nextHash, kind: 'ProviderOpenApi', specificationVersion: '3.1.1', length: Buffer.byteLength(originalContent), storedAt: storedComparison.comparedAt } }));
  return requests;
}
