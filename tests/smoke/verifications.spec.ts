import { readFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { consumerCommit, contractHash, originalContent, providerCommit, providerHash, providerPublicationId, publicationId } from '../fixtures/registry';
import { ciRunId, configurationHash, errorRunId, failedRun, failedRunId, passedRunId, reportBody, runCursor, unverifiedRunId, verificationFixture } from '../fixtures/verifications';

test('history keeps four statuses distinct, scopes exact evidence, and restores cursor/filter bookmarks', async ({ page }) => {
  const requests = await verificationFixture(page);
  await page.goto('/verifications');
  for (const status of ['Passed', 'Failed', 'Error', 'Unverified']) await expect(page.locator('app-evidence-status').getByText(status, { exact: true })).toHaveCount(1);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: 'Next page', exact: true }).click();
  await expect(page.getByText('A separate recorded execution.', { exact: true })).toBeVisible();
  expect(new URL(page.url()).searchParams.get('after')).toBe(runCursor);
  await page.getByLabel('Recorded status', { exact: true }).click(); await page.getByRole('option', { name: 'Failed', exact: true }).click();
  await page.getByText('Exact evidence and issue filters', { exact: true }).click();
  await page.getByLabel('Exact consumer commit', { exact: true }).fill(consumerCommit);
  await page.getByLabel('Exact provider commit', { exact: true }).fill(providerCommit);
  await page.getByLabel('Consumer contract SHA256', { exact: true }).fill(contractHash);
  await page.getByLabel('CI run ID', { exact: true }).fill(ciRunId); await page.getByLabel('CI attempt', { exact: true }).fill('2');
  await page.getByLabel('CI check ID', { exact: true }).fill('pact-provider');
  await page.getByLabel('Configuration SHA256', { exact: true }).fill(configurationHash);
  await page.getByLabel('Issue code', { exact: true }).fill('MissingField'); await page.getByLabel('JSON path', { exact: true }).fill('$.totalAmount');
  await page.getByRole('button', { name: 'Apply filters', exact: true }).click();
  await expect(page.locator('app-evidence-status')).toHaveCount(1);
  expect(new URL(page.url()).searchParams.has('after')).toBe(false);
  await page.reload(); await expect(page.getByLabel('CI run ID', { exact: true })).toHaveValue(ciRunId);
  await expect(page.getByLabel('Exact consumer commit', { exact: true })).toHaveValue(consumerCommit);
  const query = new URL(requests.filter(url => new URL(url).pathname === '/backend/api/reports/verification-runs').at(-1)!).searchParams;
  expect(query.get('ciRunId')).toBe(ciRunId); expect(query.get('configurationSha256')).toBe(configurationHash); expect(query.get('jsonPath')).toBe('$.totalAmount');
  await page.getByRole('link', { name: 'Open verification run', exact: true }).click();
  await page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'Verifications', exact: true }).click();
  await expect(page.getByLabel('CI run ID', { exact: true })).toHaveValue(ciRunId);
  await page.goBack(); await expect(page.getByRole('heading', { name: 'payments → invoice', exact: true })).toBeVisible();
});

test('run details preserve diagnostics, exact CI/configuration provenance, commit links and original Pact bytes', async ({ page }, testInfo) => {
  const requests = await verificationFixture(page);
  await page.route(`**/backend/api/verification-runs/${failedRunId}`, route => route.fulfill({ contentType: 'application/json', body: reportBody({ ...failedRun, evidenceUrls: [...failedRun.evidenceUrls, 'javascript:alert(1)'] }) }));
  await page.goto(`/verifications/${failedRunId}`);
  await expect(page.getByRole('heading', { name: 'payments → invoice', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open CI run', exact: true })).toHaveAttribute('href', failedRun.buildUrl);
  await expect(page.getByText(`Run ${ciRunId}`, { exact: true })).toBeVisible(); await expect(page.getByText('Attempt 2', { exact: true })).toBeVisible();
  await expect(page.getByText('Check: pact-provider', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Consumer commit on GitHub', exact: true })).toHaveAttribute('href', `https://github.com/example/payments/commit/${consumerCommit}`);
  await expect(page.getByRole('link', { name: 'Provider commit on GitHub', exact: true })).toHaveAttribute('href', `https://github.com/example/invoice/commit/${providerCommit}`);
  await expect(page.getByRole('region', { name: 'Actual value for issue 1', exact: true })).toContainText('<missing>');
  await expect(page.getByRole('region', { name: 'Expected value for issue 2', exact: true }).locator('pre')).toHaveText('null');
  await expect(page.getByRole('region', { name: 'Actual value for issue 2', exact: true }).locator('pre')).toHaveText('null');
  await expect(page.getByRole('region', { name: 'Expected value for issue 3', exact: true }).locator('pre')).toHaveText('false');
  await expect(page.getByRole('region', { name: 'Actual value for issue 3', exact: true }).locator('pre')).toHaveText('0');
  await expect(page.getByRole('region', { name: 'Expected value for issue 4', exact: true }).locator('pre')).toHaveText('{"amount":9007199254740993,"fraction":0.123456789012345678901}');
  await expect(page.getByRole('region', { name: 'Actual value for issue 4', exact: true }).locator('pre')).toHaveText('["<script>text only</script>",9007199254740993]');
  await expect(page.getByText('actualPresent: false', { exact: false })).toBeVisible();
  await expect(page.getByText('actualPresent: true', { exact: false })).toHaveCount(3);
  await expect(page.locator('app-verification-page img, app-verification-page script, a[href^="javascript:"]')).toHaveCount(0);
  await page.getByText('Full report provenance', { exact: true }).click();
  await expect(page.getByText(configurationHash, { exact: true })).toBeVisible(); await expect(page.getByText(failedRun.publisherId, { exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Verifications', exact: true })).toHaveAttribute('aria-current', 'page');
  const downloadEvent = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download consumer Pact', exact: true }).click();
  const download = await downloadEvent; expect(download.suggestedFilename()).toBe(`contract-${contractHash}.json`);
  const output = testInfo.outputPath('consumer-pact.json'); await download.saveAs(output); expect(await readFile(output, 'utf8')).toBe(originalContent);
  expect(requests.filter(url => new URL(url).pathname === `/backend/api/verification-runs/${failedRunId}`)).toHaveLength(1);
});

test('statuses retain mismatch, execution-error and missing-coverage semantics', async ({ page }) => {
  await verificationFixture(page);
  for (const [id, status] of [[failedRunId, 'Failed'], [passedRunId, 'Passed'], [errorRunId, 'Error'], [unverifiedRunId, 'Unverified']]) {
    await page.goto(`/verifications/${id}`);
    await expect(page.locator('app-evidence-status')).toHaveText(status);
    await expect(page.locator('.result-summary')).toHaveClass(new RegExp(`result-${status}`));
    if (status === 'Passed' || status === 'Unverified') { await expect(page.getByRole('heading', { name: 'No issues recorded', exact: true })).toBeVisible(); await expect(page.getByRole('region', { name: 'Actual value for issue 1', exact: true })).toHaveCount(0); }
    if (status === 'Error') { await expect(page.getByRole('heading', { name: 'VerifierUnavailable · ExecutionError', exact: true })).toBeVisible(); await expect(page.getByText('actualPresent: not reported', { exact: false })).toBeVisible(); await expect(page.getByRole('region', { name: 'Expected value for issue 1', exact: true })).toContainText('<missing>'); }
  }
});

test('empty, unavailable, not-found and invalid report states never become passing evidence', async ({ page }) => {
  await verificationFixture(page);
  await page.goto('/verifications?consumerApplicationId=missing');
  await expect(page.getByRole('heading', { name: 'No verification runs found' })).toBeVisible(); await expect(page.locator('app-evidence-status')).toHaveCount(0);
  let unavailable = true;
  await page.route('**/backend/api/reports/verification-runs*', route => route.fulfill(unavailable ? { status: 503, json: { traceId: 'trace-report-503', detail: 'internal secret exception' } } : { json: { items: [], nextCursor: null } }));
  await page.goto('/verifications'); await expect(page.getByRole('heading', { name: 'Registry unavailable' })).toBeVisible();
  await expect(page.getByText('Trace ID: trace-report-503')).toBeVisible(); await expect(page.getByText('internal secret exception')).toHaveCount(0);
  unavailable = false; await page.getByRole('button', { name: 'Retry', exact: true }).click(); await expect(page.getByRole('heading', { name: 'No verification runs found' })).toBeVisible();
  await page.goto('/verifications/00000000-0000-0000-0000-000000000000'); await expect(page.getByRole('heading', { name: 'Record not found' })).toBeVisible();
  await page.route(`**/backend/api/verification-runs/${failedRunId}`, route => route.fulfill({ contentType: 'application/json', body: reportBody({ ...failedRun, status: 'Unknown' }) }));
  await page.goto(`/verifications/${failedRunId}`); await expect(page.getByRole('heading', { name: 'Registry response could not be read' })).toBeVisible();
  await expect(page.locator('app-evidence-status')).toHaveCount(0); await expect(page.getByRole('button', { name: 'Download consumer Pact' })).toHaveCount(0);
});

test('supplementary repository lookup and artifact failures do not hide the recorded report', async ({ page }) => {
  await verificationFixture(page);
  await page.route('**/backend/api/applications/*/versions/*', route => route.fulfill({ status: 503, json: { traceId: 'source-unavailable' } }));
  await page.route(`**/backend/api/artifacts/${contractHash}/content`, route => route.fulfill({ status: 503, json: { traceId: 'artifact-unavailable' } }));
  await page.goto(`/verifications/${failedRunId}`); await expect(page.getByText('Consumer repository link unavailable.', { exact: false })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Actual value for issue 1', exact: true })).toContainText('<missing>');
  await expect(page.getByRole('link', { name: consumerCommit, exact: true })).toHaveAttribute('href', `/applications/payments/versions/${consumerCommit}`);
  await page.getByRole('button', { name: 'Download consumer Pact', exact: true }).click(); await expect(page.getByText('Trace ID: artifact-unavailable')).toBeVisible();
  await expect(page.getByRole('status')).toHaveCount(0); await expect(page.locator('app-evidence-status')).toHaveText('Failed');
});

test('invalid status, duplicate selections and numeric URL values are visible validation errors without requests', async ({ page }) => {
  const requests = await verificationFixture(page);
  for (const query of ['status=Unknown', 'status=Failed&status=Passed', 'ciAttempt=1.5', 'limit=0', 'provider=invoice']) {
    await page.goto(`/verifications?${query}`); await expect(page.getByRole('heading', { name: 'Check the filters' })).toBeVisible();
  }
  expect(requests).toEqual([]);
});

test('publication links scope consumer evidence by Pact hash and provider evidence by provider commit', async ({ page }) => {
  await verificationFixture(page);
  await page.goto(`/contracts/${publicationId}`); await page.getByRole('link', { name: 'Verification history for this publication' }).click();
  await expect(page.locator('app-evidence-status')).toHaveCount(4);
  expect(new URL(page.url()).searchParams.get('contractSha256')).toBe(contractHash); expect(new URL(page.url()).searchParams.get('consumerCommitSha')).toBe(consumerCommit);
  await page.goto(`/contracts/${providerPublicationId}`); await page.getByRole('link', { name: 'Verification history for this publication' }).click();
  await expect(page.locator('app-evidence-status')).toHaveCount(4);
  const q = new URL(page.url()).searchParams; expect(q.get('providerCommitSha')).toBe(providerCommit); expect(q.has('contractSha256')).toBe(false); expect(page.url()).not.toContain(providerHash);
});

test('mobile and desktop diagnostics wrap exact identities and remain accessible', async ({ page }) => {
  await verificationFixture(page);
  await page.route(`**/backend/api/verification-runs/${failedRunId}`, route => route.fulfill({ contentType: 'application/json', body: reportBody({ ...failedRun, issues: [failedRun.issues[0]] }) }));
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto(`/verifications/${failedRunId}`); await page.reload();
  await expect(page.getByRole('region', { name: 'Actual value for issue 1', exact: true })).toContainText('<missing>');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: 'TestResults/verification-detail-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect.poll(async () => Math.round((await page.locator('mat-sidenav-content').boundingBox())?.x ?? 0)).toBe(240);
  await expect.poll(async () => Math.round((await page.locator('#workspace-navigation').boundingBox())?.x ?? -1)).toBe(0);
  await page.screenshot({ path: 'TestResults/verification-detail-desktop.png', fullPage: true });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
