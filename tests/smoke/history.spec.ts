import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { comparisonBaseline, comparisonCursor, comparisonId, historyFixture, issueHistoryFixture, nextCommit, nextPublicationId, secondComparisonId, storedComparison } from '../fixtures/history';
import { providerPublicationId } from '../fixtures/registry';
import { failedRunId, passedRunId, reportBody } from '../fixtures/verifications';

function selectionUrl() { return `/issue-history?${new URLSearchParams({ beforeRunId: failedRunId, afterRunId: passedRunId, baselineRef: issueHistoryFixture('resolved').baselineRef })}`; }

test('stored comparison browsing preserves cursor/filter scope and opens exact publication provenance', async ({ page }) => {
  const requests = await historyFixture(page);
  await page.goto('/contracts'); await page.getByRole('link', { name: 'Stored contract comparisons', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Contract comparisons', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Next page', exact: true }).click(); expect(new URL(page.url()).searchParams.get('after')).toBe(comparisonCursor);
  await page.getByLabel('Source application', { exact: true }).fill('invoice'); await page.getByLabel('Source baseline ref', { exact: true }).fill(comparisonBaseline);
  await page.getByRole('button', { name: 'Apply filters', exact: true }).click(); await expect(page.getByRole('link', { name: 'Open stored comparison', exact: true })).toBeVisible();
  expect(new URL(page.url()).searchParams.has('after')).toBe(false); await page.reload(); await expect(page.getByLabel('Source application', { exact: true })).toHaveValue('invoice');
  await page.getByRole('link', { name: 'Open stored comparison', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Stored contract comparison', exact: true })).toBeVisible();
  await expect(page.getByText(storedComparison.profile, { exact: true })).toBeVisible(); await expect(page.getByText('NotEvaluated', { exact: true })).toBeVisible();
  await expect(page.getByText(storedComparison.findings[0].message, { exact: true })).toBeVisible(); await expect(page.locator('app-history-page img')).toHaveCount(0);
  await expect(page.getByText(storedComparison.limitations[0], { exact: true })).toBeVisible(); await expect(page.locator('app-evidence-status')).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Contracts', exact: true })).toHaveAttribute('aria-current', 'page');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: 'TestResults/contract-comparison-desktop.png', fullPage: true });
  await page.getByRole('link', { name: 'Open before publication', exact: true }).click(); await expect(page).toHaveURL(new RegExp(`/contracts/${providerPublicationId}$`));
  await page.goBack(); await page.getByRole('link', { name: 'Open after publication', exact: true }).click(); await expect(page).toHaveURL(new RegExp(`/contracts/${nextPublicationId}$`));
  await expect(page.getByText(nextCommit, { exact: true })).toBeVisible(); await page.goBack();
  await page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'Stored comparisons', exact: true }).click(); await expect(page.getByLabel('Source application', { exact: true })).toHaveValue('invoice');
  expect(requests.some(url => new URL(url).searchParams.get('after') === comparisonCursor)).toBe(true);
});

test('schema classifications and empty snapshots do not become verification or compatibility results', async ({ page }) => {
  await historyFixture(page); await page.goto(`/contracts/comparisons/${secondComparisonId}`);
  await expect(page.getByText('Schema: NoBreakingChangesDetected', { exact: true })).toBeVisible(); await expect(page.getByText('NotEvaluated', { exact: true })).toBeVisible();
  await expect(page.getByText('No findings were recorded by this stored analysis.', { exact: true })).toBeVisible(); await expect(page.locator('app-evidence-status')).toHaveCount(0);
  await page.goto('/contracts/comparisons?sourceApplicationId=missing'); await expect(page.getByRole('heading', { name: 'No stored comparisons found' })).toBeVisible();
  await page.route(`**/backend/api/contract-comparisons/${comparisonId}`, route => route.fulfill({ json: { ...storedComparison, schemaAssessment: 'Compatible' } }));
  await page.goto(`/contracts/comparisons/${comparisonId}`); await expect(page.getByRole('heading', { name: 'Registry response could not be read' })).toBeVisible();
});

test('issue history waits for explicit selections, restores bookmarks, and preserves lossless nullable issue sides', async ({ page }) => {
  const requests = await historyFixture(page); await page.goto('/issue-history');
  await expect(page.getByRole('heading', { name: 'Choose explicit runs' })).toBeVisible(); expect(requests.filter(url => new URL(url).pathname === '/backend/api/issue-history')).toEqual([]);
  await page.goto(`/verifications/${failedRunId}`); await page.getByRole('link', { name: 'Use as baseline for issue history', exact: true }).click();
  await expect(page.getByLabel('Before run ID', { exact: true })).toHaveValue(failedRunId); await expect(page.getByRole('heading', { name: 'Choose explicit runs' })).toBeVisible();
  await page.getByLabel('After run ID', { exact: true }).fill(passedRunId); await page.getByRole('button', { name: 'Compare selected runs', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Comparable evidence', exact: true })).toBeVisible(); await expect(page.locator('.transition-Resolved')).toHaveText('Resolved — comparable passing evidence');
  await expect(page.getByRole('region', { name: 'Before expected', exact: true }).locator('pre')).toHaveText('{"amount":9007199254740993,"fraction":0.123456789012345678901}');
  await expect(page.getByRole('region', { name: 'Before actual', exact: true }).locator('pre')).toHaveText('["<script>text only</script>",9007199254740993]');
  await expect(page.getByRole('region', { name: 'After mismatch', exact: true })).toContainText('No matching mismatch recorded in this run.');
  await expect(page.locator('app-history-page img, app-history-page script')).toHaveCount(0);
  await page.getByText('Full before evidence', { exact: true }).click();
  await expect(page.locator('.run-row').first().getByText(issueHistoryFixture('resolved').before.configurationSha256, { exact: true })).toBeVisible();
  await page.reload(); await expect(page.getByLabel('After run ID', { exact: true })).toHaveValue(passedRunId); await expect(page.locator('.transition-Resolved')).toBeVisible();
  await page.getByRole('link', { name: passedRunId, exact: true }).click(); await expect(page.getByRole('heading', { name: 'payments → invoice', exact: true })).toBeVisible();
  await page.goBack(); await expect(page.locator('.transition-Resolved')).toBeVisible();
  const q = new URL(requests.filter(url => new URL(url).pathname === '/backend/api/issue-history').at(-1)!).searchParams;
  expect(q.get('beforeRunId')).toBe(failedRunId); expect(q.get('afterRunId')).toBe(passedRunId); expect(q.get('baselineRef')).toBe(issueHistoryFixture('resolved').baselineRef);
});

test('changed requirements/verifier and unconfirmed absence never label a provider issue resolved', async ({ page }) => {
  for (const [scenario, label, comparable] of [['requirements', 'Requirements changed — no provider fix established', false], ['verifier', 'Verifier/check changed — not comparable', false], ['unconfirmed', 'Unconfirmed — no passing confirmation', true]] as const) {
    await historyFixture(page, scenario); await page.goto(selectionUrl());
    await expect(page.getByRole('heading', { name: comparable ? 'Comparable evidence' : 'Evidence is not comparable', exact: true })).toBeVisible();
    await expect(page.getByText(label, { exact: true })).toBeVisible(); await expect(page.locator('.transition-Resolved')).toHaveCount(0);
  }
});

test('persistent, observed and newly appeared mismatches retain their API transitions and null diagnostics', async ({ page }) => {
  for (const [scenario, transition] of [['persisting', 'Persisting'], ['observed', 'Observed'], ['appeared', 'Appeared']] as const) {
    await historyFixture(page, scenario); await page.goto(selectionUrl()); await expect(page.locator(`.transition-${transition}`)).toHaveText(transition); await expect(page.locator('.transition-Resolved')).toHaveCount(0);
    if (scenario === 'persisting') { await expect(page.getByRole('region', { name: 'Before actual', exact: true })).toContainText('<missing>'); await expect(page.getByRole('region', { name: 'After actual', exact: true }).locator('pre')).toHaveText('null'); }
  }
  await historyFixture(page, 'empty'); await page.goto(selectionUrl()); await expect(page.getByRole('heading', { name: 'No mismatch transitions returned', exact: true })).toBeVisible(); await expect(page.locator('.transition-Resolved')).toHaveCount(0);
});

test('history validation, unavailable and not-found states remain distinct and unsafe positive projections fail closed', async ({ page }) => {
  const requests = await historyFixture(page); await page.goto('/issue-history?beforeRunId=invalid'); await expect(page.getByRole('heading', { name: 'Check the filters' })).toBeVisible();
  expect(requests.filter(url => new URL(url).pathname === '/backend/api/issue-history')).toEqual([]);
  let unavailable = true;
  await page.route('**/backend/api/issue-history?*', route => route.fulfill(unavailable ? { status: 503, json: { traceId: 'history-503', detail: 'internal secret' } } : { contentType: 'application/json', body: reportBody(issueHistoryFixture('resolved')) }));
  await page.goto(selectionUrl()); await expect(page.getByRole('heading', { name: 'Registry unavailable' })).toBeVisible(); await expect(page.getByText('Trace ID: history-503')).toBeVisible(); await expect(page.getByText('internal secret')).toHaveCount(0);
  unavailable = false; await page.getByRole('button', { name: 'Retry', exact: true }).click(); await expect(page.locator('.transition-Resolved')).toBeVisible();
  await page.route('**/backend/api/issue-history?*', route => route.fulfill({ status: 400, json: { errors: { history: ['Select runs of the same integration and matching baseline ref.'] } } }));
  await page.reload(); await expect(page.getByRole('heading', { name: 'Check the filters' })).toBeVisible();
  await page.route('**/backend/api/issue-history?*', route => route.fulfill({ status: 404, json: { traceId: 'run-not-found' } })); await page.reload(); await expect(page.getByRole('heading', { name: 'Record not found' })).toBeVisible();
  await page.route('**/backend/api/issue-history?*', route => route.fulfill({ contentType: 'application/json', body: reportBody({ ...issueHistoryFixture('resolved'), comparable: false }) }));
  await page.reload(); await expect(page.getByRole('heading', { name: 'Registry response could not be read' })).toBeVisible(); await expect(page.locator('.transition-Resolved')).toHaveCount(0);
});

test('comparable issue history wraps full evidence and stays accessible on mobile and desktop', async ({ page }) => {
  await historyFixture(page); await page.setViewportSize({ width: 390, height: 844 }); await page.goto(selectionUrl());
  await expect(page.locator('.transition-Resolved')).toBeVisible(); expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]); await page.screenshot({ path: 'TestResults/issue-history-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 }); await expect.poll(async () => Math.round((await page.locator('mat-sidenav-content').boundingBox())?.x ?? 0)).toBe(240);
  await expect.poll(async () => Math.round((await page.locator('#workspace-navigation').boundingBox())?.x ?? -1)).toBe(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]); await page.screenshot({ path: 'TestResults/issue-history-desktop.png', fullPage: true });
});
