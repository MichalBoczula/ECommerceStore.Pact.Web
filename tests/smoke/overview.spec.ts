import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { declarations, graphCursor, graphResponse, overviewFixture, overviewResponse } from '../fixtures/overview';
import { consumerCommit, contractHash, providerCommit } from '../fixtures/registry';
import { ciRunId, failedRunId } from '../fixtures/verifications';

test('global inventory stays separate from filtered report counts and full URL selections survive reload', async ({ page }) => {
  const requests = await overviewFixture(page); await page.goto('/overview');
  await expect(page.locator('.metric').filter({ has: page.getByRole('heading', { name: 'Applications', exact: true }) }).locator('strong')).toHaveText('6');
  await expect(page.locator('.metric').filter({ has: page.getByRole('heading', { name: 'Failed reports', exact: true }) }).locator('strong')).toHaveText('1');
  const query = { applicationId: 'payments', consumerCommitSha: consumerCommit, providerCommitSha: providerCommit, contractSha256: contractHash, ciRunId, ciAttempt: '2', sourceRef: 'refs/heads/feature/provider + fix', status: 'Failed' };
  await page.goto(`/overview?${new URLSearchParams(query)}`); await page.reload(); await expect(page.getByLabel('Exact provider commit', { exact: true })).toHaveValue(providerCommit);
  await expect(page.locator('.metric').first().locator('strong')).toHaveText('6'); await expect(page.getByText('1 matching report(s).', { exact: false })).toBeVisible();
  const api = new URL(requests.filter(url => new URL(url).pathname === '/backend/api/reports/overview').at(-1)!); expect(Object.fromEntries(api.searchParams)).toEqual(query);
  await expect(page.getByText(/Reads are not a transactional snapshot/)).toBeVisible();
});

test('the diagram and list select the same directed relationship and preserve exact evidence drill-down', async ({ page }) => {
  const query = { consumerCommitSha: consumerCommit, providerCommitSha: providerCommit, contractSha256: contractHash, sourceRef: 'refs/heads/feature/provider + fix', ciRunId, ciAttempt: '2' };
  await overviewFixture(page); await page.goto(`/overview?${new URLSearchParams(query)}`);
  const arrow = page.getByRole('button', { name: 'Select payments → invoice', exact: true }); await arrow.focus(); await page.keyboard.press('Enter');
  const selected = page.getByRole('complementary', { name: 'Selected dependency' }); await expect(selected.getByRole('heading', { name: 'payments → invoice', exact: true })).toBeVisible();
  await expect(page.locator('.dependency-list').getByRole('button', { name: 'payments → invoice', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await selected.getByRole('link', { name: 'View matching verifications', exact: true }).click(); await expect(page).toHaveURL(/\/verifications\?/);
  expect(Object.fromEntries(new URL(page.url()).searchParams)).toEqual({ ...query, consumerApplicationId: 'payments', providerApplicationId: 'invoice' });
  await page.goBack(); await expect(arrow).toBeVisible(); await page.locator('.dependency-list').getByRole('button', { name: 'web → bff', exact: true }).click();
  await expect(selected).toContainText('No matching reports.'); await expect(selected.locator('app-evidence-status')).toHaveCount(0); await expect(page.locator('app-dependency-topology path.empty')).toHaveCount(4);
});

test('graph pagination is explicit and does not page overview counts or recent reports', async ({ page }) => {
  const requests = await overviewFixture(page); await page.goto('/overview?limit=2'); await expect(page.getByText(/Partial graph page/)).toBeVisible();
  await page.getByRole('button', { name: 'Next graph page', exact: true }).click(); await expect.poll(() => new URL(page.url()).searchParams.get('after')).toBe(graphCursor);
  await page.reload(); await expect(page.getByRole('button', { name: 'First graph page', exact: true })).toBeEnabled();
  await page.getByLabel('Consumer application', { exact: true }).fill('payments'); await page.getByRole('button', { name: 'Apply filters', exact: true }).click();
  await expect(page.getByText(/Complete graph for these application filters/)).toBeVisible(); expect(new URL(page.url()).searchParams.has('after')).toBe(false);
  const reports = requests.filter(url => new URL(url).pathname === '/backend/api/reports/verification-runs').map(url => new URL(url)); expect(reports.every(url => url.searchParams.get('limit') === '5' && !url.searchParams.has('after'))).toBe(true);
  const overview = requests.filter(url => new URL(url).pathname === '/backend/api/reports/overview').map(url => new URL(url)); expect(overview.every(url => !url.searchParams.has('limit') && !url.searchParams.has('after'))).toBe(true);
});

test('recent evidence keeps four statuses and opens the exact recorded report', async ({ page }) => {
  await overviewFixture(page); await page.goto('/overview'); const recent = page.getByRole('region', { name: 'Recent matching verification evidence' });
  await expect(recent.locator('app-evidence-status')).toHaveText(['Failed', 'Passed', 'Error', 'Unverified', 'Unverified']);
  const link = recent.getByRole('link', { name: 'payments → invoice', exact: true }).first(); await expect(link).toHaveAttribute('href', `/verifications/${failedRunId}`); await link.click();
  await expect(page).toHaveURL(new RegExp(`/verifications/${failedRunId}$`)); await expect(page.getByRole('region', { name: 'Recorded verification result' })).toContainText('Failed');
});

test('a failed projection can recover while the other sections remain available', async ({ page }) => {
  await overviewFixture(page); let unavailable = true;
  await page.route('**/backend/api/reports/dependencies*', route => route.fulfill(unavailable ? { status: 503, json: { traceId: 'graph-503', detail: 'secret internal exception' } } : { json: graphResponse() }));
  await page.goto('/overview'); await expect(page.getByRole('heading', { name: 'Registry unavailable', exact: true })).toBeVisible(); await expect(page.getByText('Trace ID: graph-503')).toBeVisible();
  await expect(page.locator('.metrics')).toBeVisible(); await expect(page.getByRole('heading', { name: 'Recent matching verification evidence', exact: true })).toBeVisible(); await expect(page.getByText('secret internal exception')).toHaveCount(0);
  unavailable = false; await page.getByRole('button', { name: 'Retry', exact: true }).click(); await expect(page.getByRole('button', { name: 'Select payments → invoice', exact: true })).toBeVisible();
  await page.route('**/backend/api/reports/overview*', route => route.fulfill({ json: { ...overviewResponse(), matchingReports: { passed: 1, failed: 1, error: 1, unverified: 2, total: 0 } } })); await page.reload();
  await expect(page.getByRole('heading', { name: 'Registry response could not be read', exact: true })).toBeVisible(); await expect(page.locator('.metrics')).toHaveCount(0); await expect(page.locator('app-dependency-topology')).toBeVisible();
});

test('empty and invalid selections do not create passing results or issue unqualified reads', async ({ page }) => {
  const requests = await overviewFixture(page); await page.goto('/overview?providerCommitSha=latest'); await expect(page.getByRole('heading', { name: 'Check the filters', exact: true })).toBeVisible(); expect(requests).toEqual([]);
  await page.goto('/overview?status=Passed&status=Failed'); await expect(page.getByRole('heading', { name: 'Check the filters', exact: true })).toBeVisible(); expect(requests).toEqual([]);
  await page.goto('/overview?providerApplicationId=missing'); await expect(page.getByRole('heading', { name: 'No declared dependencies found', exact: true })).toBeVisible(); await expect(page.getByRole('heading', { name: 'No matching verification reports', exact: true })).toBeVisible();
  await expect(page.locator('app-evidence-status')).toHaveCount(0); await expect(page.locator('.metric').first().locator('strong')).toHaveText('6');
});

test('cycles, disconnected edges and long full IDs render as data without inventing a workflow', async ({ page }) => {
  await overviewFixture(page); const graph = graphResponse(); const longId = 'application-' + 'x'.repeat(80);
  const extra = [{ integration: { ...declarations[0], id: '31f43b76-1a47-411f-8205-24942c658e95', consumerApplicationId: 'products', providerApplicationId: 'web' }, relationship: 'Declared', matchingReports: { passed: 0, failed: 0, error: 0, unverified: 0, total: 0 } },
    { integration: { ...declarations[0], id: '4d72b88c-82aa-440e-a8f1-840a947bc02d', consumerApplicationId: longId, providerApplicationId: 'isolated-provider' }, relationship: 'Declared', matchingReports: { passed: 0, failed: 0, error: 0, unverified: 0, total: 0 } }];
  await page.route('**/backend/api/reports/dependencies*', route => route.fulfill({ json: { ...graph, nodes: [...graph.nodes, { applicationId: longId }, { applicationId: 'isolated-provider' }], edges: [...graph.edges, ...extra] } }));
  await page.goto('/overview'); await expect(page.locator('app-dependency-topology .node')).toHaveCount(8); await expect(page.locator('app-dependency-topology g[role=button]')).toHaveCount(7);
  await expect(page.locator('.dependency-list').getByRole('button', { name: `${longId} → isolated-provider`, exact: true })).toBeVisible(); expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('overview supports mobile, keyboard selection, local fonts and accessible list/diagram alternatives', async ({ page }) => {
  await overviewFixture(page); await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/overview');
  await page.locator('.dependency-list').getByRole('button', { name: 'payments → invoice', exact: true }).click(); await expect(page.getByRole('complementary', { name: 'Selected dependency' })).toContainText('5 matching recorded report(s).');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true); expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]); await page.getByRole('heading', { name: 'Contract overview', exact: true }).click(); await page.screenshot({ path: 'TestResults/overview-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 }); await expect.poll(async () => Math.round((await page.locator('mat-sidenav-content').boundingBox())?.x ?? 0)).toBe(240);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]); await page.getByRole('heading', { name: 'Contract overview', exact: true }).click(); await page.screenshot({ path: 'TestResults/overview-desktop.png', fullPage: true });
});
