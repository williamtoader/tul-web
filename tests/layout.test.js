import { test, expect } from '@playwright/test';

/**
 * Helpers – wait for the layout to fully settle after loading.
 */
async function waitForLayout(page) {
  await page.waitForSelector('.tulweb-stack', { state: 'visible' });
}

test.describe('Initial Load', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo/');
    await waitForLayout(page);
  });

  test('renders the root element', async ({ page }) => {
    await expect(page.locator('.tulweb-root')).toBeVisible();
  });

  test('renders at least one stack', async ({ page }) => {
    const stacks = page.locator('.tulweb-stack');
    await expect(stacks.first()).toBeVisible();
  });

  test('renders tabs inside stacks', async ({ page }) => {
    const count = await page.locator('.tulweb-tab').count();
    expect(count).toBeGreaterThan(0);
  });

  test('renders splitters between sibling panes', async ({ page }) => {
    const count = await page.locator('.tulweb-splitter').count();
    expect(count).toBeGreaterThan(0);
  });

  test('active tab is visually distinguished', async ({ page }) => {
    const activeTab = page.locator('.tulweb-tab.active').first();
    await expect(activeTab).toBeVisible();
  });
});
