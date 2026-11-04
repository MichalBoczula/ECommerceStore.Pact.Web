import { Page } from '@playwright/test';
import { runs, verificationFixture } from './verifications';

export const evidencePolicy = 'RecordedReportsOnly-v1; not a compatibility decision; not a transactional snapshot';
export const graphCursor = 'graph+/=&?cursor';
export const lastGraphCursor = 'graph+/=&?last';
export const observedAt = '2026-11-04T08:00:00.000Z';
const pairs = [['web', 'bff'], ['bff', 'users'], ['bff', 'invoice'], ['payments', 'invoice'], ['invoice', 'products']];
export const declarations = pairs.map(([consumerApplicationId, providerApplicationId], index) => ({ id: `e9a19a32-e5ab-4aa2-b4dd-832481bdb50${index}`, consumerApplicationId, providerApplicationId, registeredAt: observedAt }));
export const globalInventory = { registeredApplications: 6, applicationVersions: 9, declaredIntegrations: 5, contractPublications: 8, verificationProfiles: 2, contractComparisons: 1, compatibilityDecisions: 3 };
const emptyCounts = { passed: 0, failed: 0, error: 0, unverified: 0, total: 0 };
const evidenceFields = ['applicationId', 'consumerApplicationId', 'providerApplicationId', 'consumerCommitSha', 'providerCommitSha', 'contractSha256', 'sourceRef', 'status', 'issueCode', 'jsonPath', 'ciRunId', 'ciAttempt', 'ciCheckId', 'verifierName', 'verifierVersion', 'configurationSha256'];
export function selectedEvidence(q: URLSearchParams) { return Object.fromEntries(evidenceFields.filter(key => q.has(key)).map(key => [key, key === 'ciAttempt' ? Number(q.get(key)) : q.get(key)])); }
export function matchingRuns(q: URLSearchParams) {
  return runs.filter(run => {
    if (q.get('applicationId') && ![run.consumerApplicationId, run.providerApplicationId].includes(q.get('applicationId')!)) return false;
    if ((q.has('issueCode') || q.has('jsonPath')) && !run.issues.some(issue => (!q.has('issueCode') || issue.code === q.get('issueCode')) && (!q.has('jsonPath') || issue.jsonPath === q.get('jsonPath')))) return false;
    return evidenceFields.filter(key => !['applicationId', 'issueCode', 'jsonPath'].includes(key)).every(key => !q.has(key) || String(run[key as keyof typeof run]) === q.get(key));
  });
}
export function overviewResponse(q = new URLSearchParams(), empty = false) {
  const selected = empty ? [] : matchingRuns(q);
  return { inventory: empty ? Object.fromEntries(Object.keys(globalInventory).map(key => [key, 0])) : globalInventory,
    matchingReports: { passed: selected.filter(r => r.status === 'Passed').length, failed: selected.filter(r => r.status === 'Failed').length, error: selected.filter(r => r.status === 'Error').length, unverified: selected.filter(r => r.status === 'Unverified').length, total: selected.length },
    selection: selectedEvidence(q), evidencePolicy, observedAt };
}
export function graphResponse(q = new URLSearchParams(), empty = false) {
  const filtered = empty ? [] : declarations.filter(d => (!q.has('applicationId') || [d.consumerApplicationId, d.providerApplicationId].includes(q.get('applicationId')!)) &&
    (!q.has('consumerApplicationId') || d.consumerApplicationId === q.get('consumerApplicationId')) && (!q.has('providerApplicationId') || d.providerApplicationId === q.get('providerApplicationId')));
  const limit = Number(q.get('limit') ?? 25); const offset = q.get('after') === graphCursor ? limit : q.has('after') ? limit * 2 : 0;
  const edges = filtered.slice(offset, offset + limit).map(integration => {
    const selected = new URLSearchParams(q); selected.delete('applicationId'); selected.set('consumerApplicationId', integration.consumerApplicationId); selected.set('providerApplicationId', integration.providerApplicationId);
    return { integration, relationship: 'Declared', matchingReports: empty ? emptyCounts : overviewResponse(selected).matchingReports };
  });
  const nextCursor = offset + limit < filtered.length ? offset === 0 ? graphCursor : lastGraphCursor : null;
  return { nodes: [...new Set(edges.flatMap(e => [e.integration.consumerApplicationId, e.integration.providerApplicationId]))].sort().map(applicationId => ({ applicationId })), edges,
    nextCursor, isComplete: !q.has('after') && nextCursor === null, selection: selectedEvidence(q), evidencePolicy };
}
export async function overviewFixture(page: Page, empty = false): Promise<string[]> {
  if (!empty) await verificationFixture(page);
  const requests: string[] = [];
  page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/backend/api/')) { if (request.method() !== 'GET' || request.headers()['authorization']) throw new Error('Overview must use anonymous reads.'); requests.push(request.url()); } });
  await page.route('**/backend/api/reports/overview*', route => route.fulfill({ json: overviewResponse(new URL(route.request().url()).searchParams, empty) }));
  await page.route('**/backend/api/reports/dependencies*', route => route.fulfill({ json: graphResponse(new URL(route.request().url()).searchParams, empty) }));
  await page.route('**/backend/api/reports/verification-runs*', route => {
    const q = new URL(route.request().url()).searchParams; const selected = empty ? [] : matchingRuns(q);
    return route.fulfill({ json: { items: selected.slice(0, Number(q.get('limit') ?? 25)).map(({ issues, evidenceUrls: _evidence, ...run }) => ({ ...run, issueCount: issues.length })), nextCursor: null } });
  });
  return requests;
}
