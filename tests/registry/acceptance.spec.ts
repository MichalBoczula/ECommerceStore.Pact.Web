import { readFile, readFileSync } from 'node:fs';
import { promisify } from 'node:util';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const fixturePath = process.env['PACT_REGISTRY_ACCEPTANCE_FIXTURE'];
if (!fixturePath) throw new Error('The isolated registry harness must supply fixture metadata.');
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const read = promisify(readFile);
const scope = { consumerApplicationId: 'payments', providerApplicationId: 'invoice', contractSha256: fixture.consumer.artifactSha256, ciCheckId: 'pact/orders' };
const historyUrl = (after: string) => `/issue-history?${new URLSearchParams({ beforeRunId: fixture.runs.failed.id, afterRunId: after, baselineRef: fixture.baselineRef })}`;

test.beforeEach(async ({ page }) => {
  await page.context().addCookies([{ name: 'registry-browser-test', value: 'synthetic', url: fixture.baseUrl, httpOnly: true, sameSite: 'Strict' }]);
  page.on('request', request => {
    if (!new URL(request.url()).pathname.startsWith('/backend/api/')) return;
    expect(request.method(), 'Browser registry access must remain read-only').toBe('GET');
    expect(request.headers()['authorization'], 'Publisher tokens must never enter browser requests').toBeUndefined();
    expect(request.headers()['cookie']).toBeUndefined();
  });
});

test('real application/version/integration/publication browsing retains provenance and original bytes', async ({ page }, testInfo) => {
  await page.goto('/applications?search=payments'); await page.getByRole('link', { name: 'payments', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Application versions', exact: true })).toBeVisible();
  await page.getByRole('link', { name: fixture.consumerCommit, exact: true }).click(); await expect(page).toHaveURL(new RegExp(`/applications/payments/versions/${fixture.consumerCommit}$`));
  await page.getByRole('link', { name: 'Explore declared integrations', exact: true }).click(); await page.getByRole('link', { name: 'Open integration', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Consumer → provider', exact: true })).toBeVisible(); await page.getByRole('link', { name: 'Consumer publications', exact: true }).click();
  await page.getByRole('link', { name: 'Open publication', exact: true }).click(); await expect(page.getByText('browser-ci', { exact: true })).toBeVisible();
  await expect(page.getByText(fixture.consumer.artifactSha256, { exact: true })).toHaveCount(2);
  const pending = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download original artifact', exact: true }).click(); const download = await pending;
  const path = testInfo.outputPath('original-pact.json'); await download.saveAs(path); expect(await read(path, 'utf8')).toBe(fixture.originalPact);
});

test('real filtered history preserves paging/bookmarks and all four recorded statuses', async ({ page }) => {
  await page.goto(`/verifications?${new URLSearchParams({ ...scope, limit: '2' })}`); await expect(page.locator('.history-card')).toHaveCount(2);
  await page.getByRole('button', { name: 'Next page', exact: true }).click(); await expect.poll(() => new URL(page.url()).searchParams.get('after')).not.toBeNull();
  const bookmark = page.url(); await page.reload(); await expect(page).toHaveURL(bookmark); await expect(page.getByRole('button', { name: 'First page', exact: true })).toBeEnabled();
  for (const status of ['Passed', 'Failed', 'Error', 'Unverified']) {
    await page.goto(`/verifications?${new URLSearchParams({ ...scope, status })}`); await expect(page.locator('.history-card app-evidence-status').first()).toHaveText(status);
    const badges = await page.locator('.history-card app-evidence-status').allTextContents(); expect(badges.every(value => value.trim() === status)).toBe(true);
  }
  await page.goto(`/verifications?${new URLSearchParams({ ...scope, issueCode: 'missing_field', jsonPath: '$.body.totalAmount' })}`); await expect(page.locator('.history-card')).toHaveCount(2);
  await page.goto('/verifications?providerApplicationId=not-registered'); await expect(page.getByRole('heading', { name: 'No verification runs found', exact: true })).toBeVisible();
});

test('real failure diagnostics preserve numeric precision, missing/null and safe text', async ({ page }) => {
  await page.goto(`/verifications/${fixture.runs.failed.id}`); await expect(page.getByRole('region', { name: 'Recorded verification result' })).toContainText('Failed');
  await expect(page.getByText('<img src=x onerror=alert(1)> missing totalAmount', { exact: true })).toBeVisible(); await expect(page.locator('app-verification-page img')).toHaveCount(0);
  await expect(page.getByLabel('Expected JSON value', { exact: true })).toHaveText('9007199254740993'); await expect(page.getByText('<missing>', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: `Run ${fixture.ciRunId}`, exact: true })).toBeVisible(); await expect(page.getByText('$.body.totalAmount', { exact: true })).toBeVisible();
  await page.goto(`/verifications/${fixture.runs.persisting.id}`); await expect(page.getByLabel('Actual JSON value', { exact: true })).toHaveText('null');
});

test('API comparable-history policy confirms a fix while preserving failures and changed requirements', async ({ page }) => {
  await page.goto(historyUrl(fixture.runs.passed.id)); await expect(page.getByRole('heading', { name: 'Comparable evidence', exact: true })).toBeVisible();
  await expect(page.locator('.transition-Resolved')).toHaveText('Resolved — comparable passing evidence'); await expect(page.getByLabel('Before expected JSON value', { exact: true })).toHaveText('9007199254740993');
  await expect(page.locator('.run-row app-evidence-status')).toHaveText(['Failed', 'Passed']);
  await page.goto(historyUrl(fixture.runs.persisting.id)); await expect(page.locator('.transition-Persisting')).toBeVisible(); await expect(page.getByLabel('After actual JSON value', { exact: true })).toHaveText('null');
  await page.goto(historyUrl(fixture.runs.requirementsChanged.id)); await expect(page.getByRole('heading', { name: 'Evidence is not comparable', exact: true })).toBeVisible(); await expect(page.locator('.transition-RequirementsChanged')).toBeVisible(); await expect(page.locator('.transition-Resolved')).toHaveCount(0);
  await page.goto(`/verifications/${fixture.runs.failed.id}`); await expect(page.getByRole('region', { name: 'Recorded verification result' })).toContainText('Failed');
});

test('real saved matrices retain exact rows and missing-check snapshots after later evidence', async ({ page }) => {
  await page.goto(`/compatibility/decisions/${fixture.decisions.mixed.id}`); await expect(page.locator('.decision-summary app-evidence-status')).toHaveText('Failed'); await expect(page.locator('table tbody app-evidence-status')).toHaveText(fixture.decisions.mixed.rows.map((row: { status: string }) => row.status));
  await page.goto(`/compatibility/decisions/${fixture.decisions.missing.id}`); await expect(page.locator('.decision-summary app-evidence-status')).toHaveText('Unverified');
  const missing = page.locator('.check').filter({ has: page.getByRole('heading', { name: 'pact/serializer', exact: true }) }); await expect(missing.getByText('MissingExecution', { exact: true })).toBeVisible(); await expect(missing.getByText('No selected report', { exact: true })).toBeVisible();
  await page.goto(`/compatibility/decisions/${fixture.decisions.complete.id}`); await expect(page.locator('.compatibility-result')).toHaveText('Compatible for this exact stored matrix.');
  await page.getByRole('link', { name: 'Open pinned profile', exact: true }).click(); await expect(page).toHaveURL(new RegExp(`/compatibility/profiles/${fixture.profiles.twoChecks.id}$`)); await expect(page.getByRole('heading', { name: 'Required checks', exact: true })).toBeVisible(); await expect(page.locator('.check')).toHaveCount(2);
  await page.goto(`/compatibility/decisions/${fixture.decisions.missing.id}`); await expect(page.locator('.decision-summary app-evidence-status')).toHaveText('Unverified');
});

test('real comparisons and overview graph preserve distinct declarations and evidence scopes', async ({ page }) => {
  await page.goto(`/contracts/comparisons/${fixture.comparison.id}`); await expect(page.getByText('NotAssessed', { exact: false })).toBeVisible(); await expect(page.getByText('NotEvaluated', { exact: true })).toBeVisible(); await expect(page.locator('app-history-page app-evidence-status')).toHaveCount(0);
  await page.goto('/overview'); await expect(page.locator('.metric').first().locator('strong')).toHaveText('4');
  await page.locator('.dependency-list').getByRole('button', { name: 'web → bff', exact: true }).click(); const selected = page.getByRole('complementary', { name: 'Selected dependency' }); await expect(selected).toContainText('No matching reports.');
  await page.locator('.dependency-list').getByRole('button', { name: 'payments → invoice', exact: true }).click(); await selected.getByRole('link', { name: 'View matching verifications', exact: true }).click();
  await expect(page).toHaveURL(/\/verifications\?/); expect(new URL(page.url()).searchParams.get('consumerApplicationId')).toBe('payments'); expect(new URL(page.url()).searchParams.get('providerApplicationId')).toBe('invoice');
});

test('real registry data remains accessible on mobile and keyboard navigation reaches evidence', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto(historyUrl(fixture.runs.passed.id)); await expect(page.locator('.transition-Resolved')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true); expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.goto('/overview'); const menu = page.getByRole('button', { name: 'Open navigation menu' }); await menu.focus(); await page.keyboard.press('Enter'); await expect(menu).toHaveAttribute('aria-expanded', 'true'); await page.keyboard.press('Escape');
  await page.locator('.dependency-list').getByRole('button', { name: 'payments → invoice', exact: true }).focus(); await page.keyboard.press('Enter'); await expect(page.getByRole('complementary', { name: 'Selected dependency' })).toContainText('matching recorded report(s).');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true); expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('an actual unavailable MongoDB produces safe API 503 errors without fabricated metrics', async ({ page }) => {
  const statuses: number[] = []; page.on('response', response => { if (new URL(response.url()).pathname.startsWith('/backend/api/')) statuses.push(response.status()); });
  await page.goto(`${fixture.unavailableBaseUrl}/overview`); await expect(page.getByRole('heading', { name: 'Registry unavailable', exact: true })).toHaveCount(3);
  await expect(page.locator('.metrics')).toHaveCount(0); await expect(page.locator('app-dependency-topology')).toHaveCount(0); expect(statuses).toEqual([503, 503, 503]);
});
