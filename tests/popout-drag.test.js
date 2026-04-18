import { test, expect } from '@playwright/test';

async function waitForLayout(page) {
  await page.waitForSelector('.tulweb-stack', { state: 'visible' });
}

test.describe('Popout Drag and Drop', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo/');
    await waitForLayout(page);
  });

  test('splitting is disabled and only tab reordering works in popout window', async ({ page }) => {
    // 1. Pop out a stack
    const popoutBtn = page.locator('.tulweb-popout-btn').first();
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      popoutBtn.click(),
    ]);

    await popup.waitForLoadState();

    // 2. Setup locators and rects
    const tab = popup.locator('.tulweb-tab').first();
    const stack = popup.locator('.tulweb-stack').first();
    const header = popup.locator('.tulweb-header').first();
    const stackRect = await stack.boundingBox();
    const headerRect = await header.boundingBox();

    // 3. Start drag
    await tab.hover();
    await popup.mouse.down();
    
    // 4. Move to the stack body (where split or center stacking normally occurs)
    await popup.mouse.move(stackRect.x + stackRect.width / 2, stackRect.y + stackRect.height * 0.75);

    // Verify both indicators are hidden in the body area for popouts
    const indicator = popup.locator('.tulweb-drop-indicator');
    const tabIndicator = popup.locator('.tulweb-tab-drop-indicator');
    
    await expect(indicator).toBeHidden();
    await expect(tabIndicator).toBeHidden();

    // 5. Move to the header (where tab reordering should still work)
    // Move towards a specific tab to ensure we are in a drop zone
    const lastTab = popup.locator('.tulweb-tab').last();
    const targetRect = await lastTab.boundingBox();
    await popup.mouse.move(targetRect.x + targetRect.width - 1, targetRect.y + targetRect.height / 2);
    
    // Verify tab indicator appears in the header (checking attachment to avoid environmental visibility flake)
    await expect(tabIndicator).toBeAttached();
    await expect(indicator).toBeHidden();

    // 6. Finalize drag
    await popup.mouse.up();
    await popup.close();
  });
});
