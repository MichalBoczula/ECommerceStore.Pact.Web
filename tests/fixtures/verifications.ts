import { Page } from '@playwright/test';
import { consumerCommit, contractHash, providerCommit, providerVersion, publicationId, registryFixture, sourceVersion } from './registry';

export const failedRunId = 'f8200a17-f83c-46be-8f2e-427e14e6c665';
export const passedRunId = 'dba64554-75b9-49a5-a87f-88892d2b9dc9';
export const errorRunId = '5ede7e39-e140-4007-80b2-a834d59af5da';
export const unverifiedRunId = 'bbdfe325-94fe-48b9-8268-b49bc8119cbb';
export const moreRunId = 'cf40bc7e-2be1-4b5d-8877-36b8aed9d82e';
export const runCursor = 'runs+/=&?opaque';
export const ciRunId = '9223372036854775808';
export const configurationHash = '98'.repeat(32);
const timestamp = '2026-11-03T11:00:00.000Z';
const issue = { kind: 'Mismatch', code: 'MissingField', message: 'Required invoice field is missing.', interaction: 'read invoice', method: 'GET', path: '/invoices/{invoiceId}', jsonPath: '$.totalAmount', actualPresent: false, expected: 'required decimal', evidenceUrl: 'https://ci.example.test/evidence/report' };

export const failedRun = {
  id: failedRunId, bindingId: 'd06592c1-e677-436b-93c3-5817ebc1d47d', consumerVersionId: sourceVersion.id, providerVersionId: providerVersion.id,
  consumerPublicationId: publicationId, consumerApplicationId: 'payments', consumerCommitSha: consumerCommit, providerApplicationId: 'invoice', providerCommitSha: providerCommit,
  contractSha256: contractHash, status: 'Failed', summary: 'Order response does not satisfy the consumer requirement.',
  ciRunId, ciAttempt: 2, ciCheckId: 'pact-provider', verifierName: 'pact-http', verifierVersion: '1.2.3', configurationSha256: configurationHash,
  sourceRef: 'refs/heads/feature/provider + fix', buildUrl: 'https://ci.example.test/runs/184?attempt=2', publisherId: 'provider-ci',
  startedAt: timestamp, finishedAt: timestamp, recordedAt: timestamp, expectedInteractions: 2, verifiedInteractions: 1, failedInteractions: 1,
  issues: [issue,
    { ...issue, code: 'NullValue', message: 'Null is an explicit supplied value.', actualPresent: true, expected: null, actual: null },
    { ...issue, code: 'ScalarMismatch', message: 'Boolean and numeric values are distinct.', actualPresent: true, expected: false, actual: 0 },
    { ...issue, code: 'PreciseValue', message: '<img src=x onerror=alert(1)> is diagnostic text.', actualPresent: true, expected: { amount: '__BIG_INTEGER__', fraction: '__DECIMAL__' }, actual: ['<script>text only</script>', '__BIG_INTEGER__'] },
  ], evidenceUrls: ['https://ci.example.test/evidence/full-report'],
};

export const runs = [failedRun,
  { ...failedRun, id: passedRunId, status: 'Passed', summary: 'Consumer requirements were verified.', issues: [], verifiedInteractions: 2, failedInteractions: 0 },
  { ...failedRun, id: errorRunId, status: 'Error', summary: 'The verifier could not execute.', issues: [{ kind: 'ExecutionError', code: 'VerifierUnavailable', message: 'The provider service could not be reached.', interaction: null, method: null, path: null, jsonPath: null, actualPresent: null, evidenceUrl: 'https://ci.example.test/evidence/error' }], verifiedInteractions: 0, failedInteractions: 0 },
  { ...failedRun, id: unverifiedRunId, status: 'Unverified', summary: 'The selected interactions were not verified.', issues: [], verifiedInteractions: 0, failedInteractions: 0 },
  { ...failedRun, id: moreRunId, status: 'Unverified', summary: 'A separate recorded execution.', ciAttempt: 3, issues: [], verifiedInteractions: 0, failedInteractions: 0 },
];

export function reportBody(value: unknown): string {
  return JSON.stringify(value).replaceAll('"__BIG_INTEGER__"', '9007199254740993').replaceAll('"__DECIMAL__"', '0.123456789012345678901');
}

export async function verificationFixture(page: Page): Promise<string[]> {
  await registryFixture(page);
  const requests: string[] = [];
  page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/backend/api/')) requests.push(request.url()); });
  await page.route('**/backend/api/reports/verification-runs*', async route => {
    const q = new URL(route.request().url()).searchParams;
    const filtered = runs.filter(run => {
      if (q.get('applicationId') && ![run.consumerApplicationId, run.providerApplicationId].includes(q.get('applicationId')!)) return false;
      if (q.get('issueCode') && !run.issues.some(issue => issue.code === q.get('issueCode'))) return false;
      if (q.get('jsonPath') && !run.issues.some(issue => issue.jsonPath === q.get('jsonPath'))) return false;
      return ['consumerApplicationId', 'providerApplicationId', 'consumerCommitSha', 'providerCommitSha', 'contractSha256', 'sourceRef', 'status', 'ciRunId', 'ciAttempt', 'ciCheckId', 'verifierName', 'verifierVersion', 'configurationSha256'].every(key => !q.get(key) || String(run[key as keyof typeof run]) === q.get(key));
    });
    const limit = Number(q.get('limit') ?? 25);
    const selected = q.has('after') ? filtered.slice(4) : filtered.slice(0, Math.min(limit, 4));
    const items = selected.map(({ issues, evidenceUrls: _evidenceUrls, ...run }) => ({ ...run, issueCount: issues.length }));
    return route.fulfill({ json: { items, nextCursor: !q.has('after') && filtered.length > selected.length ? runCursor : null } });
  });
  await page.route('**/backend/api/verification-runs/*', route => {
    const id = new URL(route.request().url()).pathname.split('/').at(-1);
    const run = runs.find(run => run.id === id?.toLowerCase());
    return route.fulfill(run ? { contentType: 'application/json', body: reportBody(run) } : { status: 404, json: { traceId: 'missing-run-trace' } });
  });
  return requests;
}
