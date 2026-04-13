import { test, expect } from '@playwright/test';

async function waitForLayout(page) {
  await page.waitForSelector('.tulweb-stack', { state: 'visible' });
}

test.describe('Tab Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo/');
    await waitForLayout(page);
  });

  test('clicking a second tab makes it active', async ({ page }) => {
    // Find a stack with at least 2 tabs
    const stacks = page.locator('.tulweb-stack');
    const count = await stacks.count();
    let targetStack = null;

    for (let i = 0; i < count; i++) {
      const stack = stacks.nth(i);
      const tabCount = await stack.locator('.tulweb-tab').count();
      if (tabCount >= 2) { targetStack = stack; break; }
    }

    if (!targetStack) test.skip();

    const tabs = targetStack.locator('.tulweb-tab');
    const first = tabs.nth(0);
    const second = tabs.nth(1);

    // Ensure first is initially active
    await first.click();
    await expect(first).toHaveClass(/active/);

    // Click second
    await second.click();
    await expect(second).toHaveClass(/active/);
    await expect(first).not.toHaveClass(/active/);
  });

  test('closing a tab removes it from the DOM', async ({ page }) => {
    const initialCount = await page.locator('.tulweb-tab').count();
    await page.locator('.tulweb-tab-close').first().click();
    await expect(page.locator('.tulweb-tab')).toHaveCount(initialCount - 1);
  });

  test('closing all tabs in a stack destroys the stack', async ({ page }) => {
    // Find the stack with the fewest closeable tabs
    const stacks = page.locator('.tulweb-stack');
    const stackCount = await stacks.count();
    const initialStackCount = stackCount;

    let targetStack = null;
    let minCloseableTabs = Infinity;

    for (let i = 0; i < stackCount; i++) {
      const s = stacks.nth(i);
      const closeButtons = await s.locator('.tulweb-tab-close').count();
      // Skip persistent stacks (sidebar)
      const isPersistent = await s.getAttribute('data-persistent');
      if (!isPersistent && closeButtons > 0 && closeButtons < minCloseableTabs) {
        minCloseableTabs = closeButtons;
        targetStack = s;
      }
    }

    if (!targetStack || minCloseableTabs === 0) test.skip();

    // Close all closeable tabs in that stack
    for (let i = 0; i < minCloseableTabs; i++) {
      // Always get the first remaining close button
      const btn = targetStack.locator('.tulweb-tab-close').first();
      if (await btn.isVisible()) await btn.click();
    }

    // Stack should be removed if not persistent
    await expect(page.locator('.tulweb-stack')).toHaveCount(initialStackCount - 1, { timeout: 3000 });
  });

  test('context menu appears on right-click', async ({ page }) => {
    const tab = page.locator('.tulweb-tab').first();
    await tab.click({ button: 'right', force: true });
    await expect(page.locator('.tulweb-context-menu')).toBeVisible();
  });

  test('context menu closes when clicking outside', async ({ page }) => {
    const tab = page.locator('.tulweb-tab').first();
    await tab.click({ button: 'right', force: true });
    await expect(page.locator('.tulweb-context-menu')).toBeVisible();

    // Click somewhere else
    await page.mouse.click(0, 0);
    await expect(page.locator('.tulweb-context-menu')).toBeHidden({ timeout: 3000 });
  });

  test('context menu has expected items', async ({ page }) => {
    const closeableTab = page.locator('.tulweb-tab').filter({ has: page.locator('.tulweb-tab-close') }).first();
    await closeableTab.click({ button: 'right', force: true });

    const menu = page.locator('.tulweb-context-menu');
    await expect(menu).toBeVisible();
    await expect(menu.locator('.tulweb-context-item')).toHaveCount(3); // Close, Close Others, Close All
  });

  test('double-clicking tab toggles maximize', async ({ page }) => {
    const tab = page.locator('.tulweb-tab').first();
    // Use dispatchEvent if dblclick is flaky
    await tab.dispatchEvent('dblclick');
    await expect(page.locator('.tulweb-stack.maximized')).toBeVisible();

    // Restore
    await tab.dispatchEvent('dblclick');
    await expect(page.locator('.tulweb-stack.maximized')).toBeHidden();
  });
});
