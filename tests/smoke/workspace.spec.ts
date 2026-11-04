import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/backend/api/**', route => route.fulfill({ json: { items: [], nextCursor: null } }));
});

test('desktop navigation opens every section and marks the active link', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Contract overview', exact: true })).toBeVisible();
  const navigation = page.getByRole('navigation', { name: 'Main navigation' });
  for (const [label, title] of [
    ['Applications', 'Applications'], ['Dependencies', 'Application dependencies'],
    ['Contracts', 'Contracts'], ['Verifications', 'Verification evidence'],
    ['Compatibility', 'Compatibility'], ['Issue history', 'Issue history'],
  ]) {
    const link = navigation.getByRole('link', { name: label, exact: true });
    await link.click();
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    await expect(link).toHaveAttribute('aria-current', 'page');
    if (['Applications', 'Dependencies', 'Contracts', 'Verifications', 'Compatibility'].includes(label)) await expect(page.getByRole('heading', { name: /^No .* found$/ })).toBeVisible();
    else if (label === 'Issue history') await expect(page.getByRole('heading', { name: 'Choose explicit runs', exact: true })).toBeVisible();
    else await expect(page.getByText('No registry data loaded.', { exact: true })).toBeVisible();
  }
});

test('a direct section address survives reload and unknown addresses offer recovery', async ({ page }) => {
  await page.goto('/verifications?providerApplicationId=invoice');
  await page.reload();
  await expect(page).toHaveURL(/\/verifications\?providerApplicationId=invoice$/);
  await expect(page.getByRole('heading', { name: 'Verification evidence', exact: true })).toBeVisible();
  await page.goto('/unknown/record');
  await expect(page.getByRole('heading', { name: 'Page not found', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Back to overview' }).click();
  await expect(page).toHaveURL(/\/overview$/);
});

test('mobile drawer supports keyboard navigation, closes, and restores the desktop sidebar', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/overview');
  const menu = page.getByRole('button', { name: 'Open navigation menu' });
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await menu.focus();
  await page.keyboard.press('Enter');
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Contracts', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Contracts', exact: true })).toBeVisible();
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await menu.click();
  await expect(page.locator('#workspace-navigation .brand')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
});

test('the overview uses local fonts, no backend evidence, and passes accessibility checks', async ({ page }) => {
  const externalRequests: string[] = [];
  const apiRequests: string[] = [];
  const explorerRequests: string[] = [];
  page.on('request', (request) => {
    if (!request.url().startsWith('http://127.0.0.1:4200/')) externalRequests.push(request.url());
    if (new URL(request.url()).pathname.startsWith('/backend/')) apiRequests.push(request.url());
    if (new URL(request.url()).pathname.includes('/features/registry/')) explorerRequests.push(request.url());
  });
  await page.goto('/overview');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByText('No registry data loaded', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.fonts.check('14px Roboto'))).toBe(true);
  expect(externalRequests).toEqual([]);
  expect(apiRequests).toEqual([]);
  expect(explorerRequests).toEqual([]);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
});
