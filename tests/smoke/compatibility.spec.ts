import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { compatibilityFixture, decisionCursor, decisionFixture, decisionId, GapReason, MatrixStatus, nextDecisionId, profile, profileCursor, profileId, required } from '../fixtures/compatibility';
import { consumerCommit, contractHash, providerCommit, providerHash, providerPublicationId, publicationId } from '../fixtures/registry';
import { ciRunId, passedRunId } from '../fixtures/verifications';

const detail = `/compatibility/decisions/${decisionId}`;

test('decision filters, cursor bookmarks and exact detail selection survive navigation and reload', async ({ page }) => {
  const requests = await compatibilityFixture(page); await page.goto('/compatibility');
  await expect(page.getByRole('heading', { name: 'Stored decision snapshots', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Next page', exact: true }).click(); expect(new URL(page.url()).searchParams.get('after')).toBe(decisionCursor);
  await page.getByRole('link', { name: 'Open stored decision', exact: true }).click(); await expect(page).toHaveURL(new RegExp(`/decisions/${nextDecisionId}`));
  await page.getByRole('link', { name: 'Back to decisions', exact: true }).click(); await expect(page.getByRole('button', { name: 'First page', exact: true })).toBeEnabled();
  for (const [label, value] of [['Consumer commit SHA', consumerCommit], ['Provider commit SHA', providerCommit], ['Pact SHA256', contractHash], ['Profile ID', profileId]]) await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByRole('button', { name: 'Apply filters', exact: true }).click(); await expect(page.getByRole('link', { name: 'Open stored decision', exact: true })).toBeVisible();
  expect(new URL(page.url()).searchParams.has('after')).toBe(false); await page.reload(); await expect(page.getByLabel('Pact SHA256', { exact: true })).toHaveValue(contractHash);
  await page.getByRole('link', { name: 'Open stored decision', exact: true }).click(); await expect(page.getByText('Compatible for this exact stored matrix.', { exact: true })).toBeVisible();
  await expect(page.getByText('explicit-ci-execution-v1', { exact: true })).toBeVisible(); await expect(page.getByText(`${ciRunId} / 2`, { exact: true })).toBeVisible();
  await expect(page.getByText(contractHash, { exact: true })).toBeVisible(); await expect(page.getByRole('link', { name: `payments · ${consumerCommit}`, exact: true })).toHaveAttribute('href', `/applications/payments/versions/${consumerCommit}`);
  await expect(page.getByRole('link', { name: 'Open exact verification', exact: true }).last()).toHaveAttribute('href', `/verifications/${passedRunId}`);
  await page.getByRole('link', { name: 'Open exact verification', exact: true }).last().click(); await expect(page.getByRole('heading', { name: 'Verification details', exact: true })).toBeVisible();
  expect(requests.filter(url => new URL(url).pathname.startsWith('/backend/api/compatibility-decisions/')).length).toBeGreaterThan(0);
});

test('profile discovery pins name, version and content before browsing decisions', async ({ page }) => {
  await compatibilityFixture(page); await page.goto('/compatibility'); await page.getByRole('link', { name: 'Browse pinned profiles', exact: true }).click();
  await page.getByRole('button', { name: 'Next page', exact: true }).click(); expect(new URL(page.url()).searchParams.get('after')).toBe(profileCursor);
  await page.getByLabel('Profile name', { exact: true }).fill(profile.name); await page.getByLabel('Profile version', { exact: true }).fill(profile.version); await page.getByRole('button', { name: 'Apply filters', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Open pinned profile', exact: true })).toBeVisible(); expect(new URL(page.url()).searchParams.has('after')).toBe(false);
  await page.getByRole('link', { name: 'Open pinned profile', exact: true }).click(); await page.reload(); await expect(page.getByText(profile.contentSha256, { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Required checks', exact: true })).toBeVisible(); await expect(page.locator('.check')).toHaveCount(2);
  await page.getByRole('link', { name: 'Decisions using this profile', exact: true }).click(); await expect(page.getByLabel('Profile ID', { exact: true })).toHaveValue(profileId);
});

test('four outcomes and all inapplicable evidence reasons keep reported Passed separate from Unverified', async ({ page }) => {
  await compatibilityFixture(page);
  let stored = decisionFixture(); await page.route(`**/backend/api/compatibility-decisions/${decisionId}`, route => route.fulfill({ json: stored }));
  for (const status of ['Passed', 'Failed', 'Error', 'Unverified'] as MatrixStatus[]) {
    stored = decisionFixture(status); await page.goto(detail); await expect(page.locator('.decision-summary app-evidence-status')).toHaveText(status);
    await expect(page.locator('.compatibility-result')).toHaveText(status === 'Passed' ? 'Compatible for this exact stored matrix.' : 'Compatibility not established for this stored matrix.');
  }
  for (const reason of ['ContractNotPublished', 'MissingExecution', 'VerifierMismatch', 'SourceRefMismatch'] as GapReason[]) {
    stored = decisionFixture('Unverified', reason); await page.reload(); const check = page.locator('.check').filter({ has: page.getByRole('heading', { name: required.checkId, exact: true }) });
    await expect(check.getByText(reason, { exact: true })).toBeVisible(); await expect(check.locator('.result-heading app-evidence-status')).toHaveText('Unverified');
    if (reason === 'VerifierMismatch' || reason === 'SourceRefMismatch') await expect(check.locator('.reported-status app-evidence-status')).toHaveText('Passed');
    else await expect(check.getByText('No selected report', { exact: true })).toBeVisible();
    await expect(check.locator('a[href^="javascript:"]')).toHaveCount(0); await expect(check.locator('img')).toHaveCount(0);
  }
});

test('the entire bounded matrix remains visible when a filtered row belongs to a mixed decision', async ({ page }) => {
  await compatibilityFixture(page); const stored = decisionFixture('Failed'); const passed = decisionFixture().rows[0];
  const otherRef = 'refs/heads/other + ref';
  const inapplicable = { ...passed, providerSourceRef: otherRef, status: 'Unverified', checks: passed.checks.map(check => ({ ...check, status: 'Unverified', reason: 'SourceRefMismatch' })), missingChecks: profile.checks.map(check => check.checkId), unresolvedChecks: profile.checks.map(check => check.checkId) };
  await page.route(`**/backend/api/compatibility-decisions/${decisionId}`, route => route.fulfill({ json: { ...stored, rows: [stored.rows[0], inapplicable] } }));
  await page.goto(`${detail}?providerCommitSha=${providerCommit}`); await expect(page.locator('table').getByRole('row')).toHaveCount(3); await expect(page.locator('.row-details')).toHaveCount(2);
  await expect(page.locator('.decision-summary app-evidence-status')).toHaveText('Failed'); await page.locator('.row-details').last().locator('summary').click();
  await expect(page.locator('.row-details').last().getByText(otherRef, { exact: true })).toBeVisible();
  await expect(page.locator('.row-details').first().getByText('Unresolved checks:')).toContainText(required.checkId);
});

test('empty, unavailable, malformed and invalid selections remain recoverable without stale compatibility', async ({ page }) => {
  const requests = await compatibilityFixture(page); await page.goto('/compatibility?consumerCommitSha=main'); await expect(page.getByRole('heading', { name: 'Check the filters', exact: true })).toBeVisible(); expect(requests).toEqual([]);
  await page.goto('/compatibility?status=Passed&status=Failed'); await expect(page.getByRole('heading', { name: 'Check the filters', exact: true })).toBeVisible(); expect(requests).toEqual([]);
  await page.goto('/compatibility?providerApplicationId=missing'); await expect(page.getByRole('heading', { name: 'No decisions found', exact: true })).toBeVisible();
  let unavailable = true; await page.route(`**/backend/api/compatibility-decisions/${decisionId}`, route => route.fulfill(unavailable ? { status: 503, json: { traceId: 'decision-503', detail: 'internal secret' } } : { json: decisionFixture() }));
  await page.goto(detail); await expect(page.getByRole('heading', { name: 'Registry unavailable', exact: true })).toBeVisible(); await expect(page.getByText('Trace ID: decision-503')).toBeVisible(); await expect(page.getByText('internal secret')).toHaveCount(0);
  unavailable = false; await page.getByRole('button', { name: 'Retry', exact: true }).click(); await expect(page.locator('.compatibility-result')).toContainText('Compatible for');
  await page.route(`**/backend/api/compatibility-decisions/${decisionId}`, route => route.fulfill({ json: { ...decisionFixture(), compatible: false } })); await page.reload(); await expect(page.getByRole('heading', { name: 'Registry response could not be read', exact: true })).toBeVisible(); await expect(page.locator('.compatibility-result')).toHaveCount(0);
  await page.route(`**/backend/api/compatibility-decisions/${decisionId}`, route => route.fulfill({ status: 404, json: { traceId: 'decision-404' } })); await page.reload(); await expect(page.getByRole('heading', { name: 'Record not found', exact: true })).toBeVisible();
});

test('explorer entry links retain consumer Pact versus provider OpenAPI selection roles', async ({ page }) => {
  await compatibilityFixture(page); await page.goto(`/dependencies/payments/invoice?sourceApplicationId=invoice&commitSha=${providerCommit}`);
  await page.getByRole('link', { name: 'Stored compatibility decisions', exact: true }).click(); await expect(page.getByLabel('Provider commit SHA', { exact: true })).toHaveValue(providerCommit); await expect(page.getByLabel('Consumer commit SHA', { exact: true })).toHaveValue('');
  await page.goto(`/contracts/${publicationId}`); await page.getByRole('link', { name: 'Stored decisions for this publication', exact: true }).click(); await expect(page.getByLabel('Pact SHA256', { exact: true })).toHaveValue(contractHash);
  await page.goto(`/contracts/${providerPublicationId}`); await page.getByRole('link', { name: 'Stored decisions for this publication', exact: true }).click(); await expect(page.getByLabel('Pact SHA256', { exact: true })).toHaveValue(''); expect(page.url()).not.toContain(providerHash);
});

test('the matrix and full check evidence remain accessible and contained on mobile and desktop', async ({ page }) => {
  await compatibilityFixture(page, 'Unverified', 'VerifierMismatch'); await page.setViewportSize({ width: 390, height: 844 }); await page.goto(detail);
  await expect(page.getByRole('heading', { name: 'Exact version / CI matrix', exact: true })).toBeVisible(); expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]); await page.screenshot({ path: 'TestResults/compatibility-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 }); await expect.poll(async () => Math.round((await page.locator('mat-sidenav-content').boundingBox())?.x ?? 0)).toBe(240);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]); await page.screenshot({ path: 'TestResults/compatibility-desktop.png', fullPage: true });
});
