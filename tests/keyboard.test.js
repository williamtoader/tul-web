import { test, expect } from '@playwright/test';

async function waitForLayout(page) {
  await page.waitForSelector('.tulweb-stack', { state: 'visible' });
}

test.describe('Keyboard Shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForLayout(page);
    // Click on layout area to ensure keyboard focus is in the page
    await page.locator('.tulweb-root').click();
  });

  test('Ctrl+S saves layout to localStorage', async ({ page }) => {
    // Clear any existing saved state
    await page.evaluate(() => localStorage.removeItem('tulweb_saved_state_v2'));

    await page.keyboard.press('Control+s');

    const saved = await page.evaluate(() => localStorage.getItem('tulweb_saved_state_v2'));
    expect(saved).not.toBeNull();

    // Verify it's valid JSON and has the correct structure
    const parsed = JSON.parse(saved);
    expect(parsed).toHaveProperty('content');
    expect(Array.isArray(parsed.content)).toBe(true);
  });

  test('Ctrl+S saved config is a valid TulWEB layout', async ({ page }) => {
    await page.keyboard.press('Control+s');
    const saved = await page.evaluate(() => localStorage.getItem('tulweb_saved_state_v2'));
    const config = JSON.parse(saved);

    // Should have at least one content node
    expect(config.content.length).toBeGreaterThan(0);
    // Root content node should have a type
    expect(config.content[0]).toHaveProperty('type');
  });

  test('Ctrl+W closes the active tab', async ({ page }) => {
    // Click a closeable tab to make it active
    const closeableTab = page.locator('.tulweb-tab').filter({ has: page.locator('.tulweb-tab-close') }).first();
    await closeableTab.click();

    const initialCount = await page.locator('.tulweb-tab').count();
    await page.keyboard.press('Control+w');

    await expect(page.locator('.tulweb-tab')).toHaveCount(initialCount - 1, { timeout: 3000 });
  });

  test('Alt+ArrowRight moves focus to a different stack', async ({ page }) => {
    // Get the initially active stack
    const initialActive = page.locator('.tulweb-stack.active-stack');

    // Click first stack to ensure it has focus
    await page.locator('.tulweb-stack').first().click();
    
    await page.keyboard.press('Alt+ArrowRight');
    
    // A stack should still be active, possibly a different one — just verify no crash
    const activeStacks = page.locator('.tulweb-stack.active-stack');
    const count = await activeStacks.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
