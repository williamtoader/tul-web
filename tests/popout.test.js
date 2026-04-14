import { test, expect } from '@playwright/test';

async function waitForLayout(page) {
  await page.waitForSelector('.tulweb-stack', { state: 'visible' });
}

test.describe('Popout Feature E2E', () => {
  test.beforeEach(async ({ page }) => {
    page.on('pageerror', err => console.log('PAGE ERROR: ' + err.message));
    page.on('console', msg => console.log('PAGE CONSOLE: ' + msg.text()));
    await page.goto('/demo/');
    await waitForLayout(page);
  });

  test('popout button is visible and opens a window', async ({ page, context }) => {
    const popoutBtn = page.locator('.tulweb-popout-btn').first();
    await expect(popoutBtn).toBeVisible();

    const initialStacks = await page.locator('.tulweb-stack').count();

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

    // Close the popup and verify it returns
    await popup.close();
    await expect(page.locator('.tulweb-stack')).toHaveCount(initialStacks);
  });

  test('header controls are hidden in popout window', async ({ page, context }) => {
    const popoutBtn = page.locator('.tulweb-popout-btn').first();

    const [popup] = await Promise.all([
      context.waitForEvent('popup'),
      popoutBtn.click(),
    ]);

    await popup.waitForLoadState();

    // The controls element must not be visible in the popout window
    const controls = popup.locator('.tulweb-header-controls');
    // They are hidden via CSS (display: none !important) injected into the popout shell
    await expect(controls.first()).toBeHidden();

    await popup.close();
  });

  test('popped-out stack fills the full window (maximized)', async ({ page, context }) => {
    const popoutBtn = page.locator('.tulweb-popout-btn').first();

    const [popup] = await Promise.all([
      context.waitForEvent('popup'),
      popoutBtn.click(),
    ]);

    await popup.waitForLoadState();

    // The stack element should span the full viewport width
    const stack = popup.locator('.tulweb-stack').first();
    const box = await stack.boundingBox();
    const viewportSize = popup.viewportSize();

    // Stack should be essentially the full width of the window
    expect(box.width).toBeGreaterThan(viewportSize.width * 0.9);

    await popup.close();
  });

  test('context menu contains popout option and works', async ({ page, context }) => {
    const firstTab = page.locator('.tulweb-tab').first();
    await firstTab.click({ button: 'right' });

    const popoutOption = page.locator('.tulweb-context-item', { hasText: 'Popout Stack' });
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
    await page.locator('input[type="radio"][value="theme-cyber"]').click();

    // Wait for sync
    await page.waitForTimeout(500);

    const newChildTheme = await popup.evaluate(() => document.body.className);
    expect(newChildTheme).toContain('theme-cyber');

    await popup.close();
  });

  test('stack popout button works again after closing popout', async ({ page, context }) => {
    const popoutBtn = page.locator('.tulweb-popout-btn').first();

    // First popout — open and close
    const [popup1] = await Promise.all([
      context.waitForEvent('popup'),
      popoutBtn.click(),
    ]);
    await popup1.close();

    // Wait for re-integration
    const initialStacks = await page.locator('.tulweb-stack').count();

    // Second popout — must still work
    const [popup2] = await Promise.all([
      context.waitForEvent('popup'),
      popoutBtn.click(),
    ]);
    await popup2.waitForLoadState();

    const title = await popup2.title();
    expect(title).toContain('TulWEB Popout');

    await popup2.close();
    await expect(page.locator('.tulweb-stack')).toHaveCount(initialStacks);
  });
});
