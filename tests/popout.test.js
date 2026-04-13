import { test, expect } from '@playwright/test';

async function waitForLayout(page) {
  await page.waitForSelector('.tulweb-stack', { state: 'visible' });
}

test.describe('Popout Feature E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo/');
    await waitForLayout(page);
  });

  test('popout button is visible and opens a window', async ({ page, context }) => {
    // Find the first stack and its popout button
    const popoutBtn = page.locator('.tulweb-popout-btn').first();
    await expect(popoutBtn).toBeVisible();

    const initialStacks = await page.locator('.tulweb-stack').count();

    // Wait for the popup to open
    const [popup] = await Promise.all([
      context.waitForEvent('popup'),
      popoutBtn.click(),
    ]);

    await popup.waitForLoadState();
    
    // The window title should contain "TulWEB Popout"
    const title = await popup.title();
    expect(title).toContain('TulWEB Popout');

    // Verify a stack was removed from parent
    await expect(page.locator('.tulweb-stack')).toHaveCount(initialStacks - 1);

    // Verify the child window has a layout manager
    const childHasLayout = await popup.evaluate(() => !!window.__tulweb_layout__);
    expect(childHasLayout).toBe(true);

    // Close the popup and verify it returns
    await popup.close();
    
    // Wait for re-integration logic (it has a setInterval and logic)
    await expect(page.locator('.tulweb-stack')).toHaveCount(initialStacks);
  });

  test('context menu contains popout option and works', async ({ page, context }) => {
    const firstTab = page.locator('.tulweb-tab').first();
    await firstTab.click({ button: 'right' });
    
    const popoutOption = page.locator('.tulweb-context-menu-item', { hasText: 'Popout Stack' });
    await expect(popoutOption).toBeVisible();

    const initialStacks = await page.locator('.tulweb-stack').count();

    const [popup] = await Promise.all([
      context.waitForEvent('popup'),
      popoutOption.click(),
    ]);

    await expect(page.locator('.tulweb-stack')).toHaveCount(initialStacks - 1);
    
    await popup.close();
    await expect(page.locator('.tulweb-stack')).toHaveCount(initialStacks);
  });

  test('theme synchronization between parent and popout', async ({ page, context }) => {
    const [popup] = await Promise.all([
      context.waitForEvent('popup'),
      page.locator('.tulweb-popout-btn').first().click(),
    ]);

    await popup.waitForLoadState();
    
    // Initial theme (nordic)
    const initialParentTheme = await page.evaluate(() => document.body.className);
    const initialChildTheme = await popup.evaluate(() => document.body.className);
    expect(initialChildTheme).toBe(initialParentTheme);

    // Change theme in parent
    await page.selectOption('select[name="theme-app"]', 'theme-cyber');
    
    // Wait for sync
    await page.waitForTimeout(500);
    
    const newChildTheme = await popup.evaluate(() => document.body.className);
    expect(newChildTheme).toContain('theme-cyber');
    
    await popup.close();
  });
});
