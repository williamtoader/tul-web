import { test, expect } from '@playwright/test';

async function waitForLayout(page) {
  await page.waitForSelector('.tulweb-stack', { state: 'visible' });
}

test.describe('Stack Controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo/');
    await waitForLayout(page);
  });

  test('maximize button expands the stack', async ({ page }) => {
    // Find a stack with a maximize button more reliably using the explicit class
    const stack = page.locator('.tulweb-stack').filter({ has: page.locator('.tulweb-max-btn') }).first();
    const maxBtn = stack.locator('.tulweb-max-btn');
    
    await maxBtn.click();
    await expect(stack).toHaveClass(/maximized/);
  });

  test('double-clicking tab header maximizes the stack', async ({ page }) => {
    const tab = page.locator('.tulweb-tab').first();
    await tab.dispatchEvent('dblclick');
    await expect(page.locator('.tulweb-stack.maximized')).toBeVisible();
  });

  test('maximize then restore returns to normal layout', async ({ page }) => {
    const initialStackCount = await page.locator('.tulweb-stack').count();

    const tab = page.locator('.tulweb-tab').first();
    await tab.dispatchEvent('dblclick');
    await expect(page.locator('.tulweb-stack.maximized')).toBeVisible();

    // Restore
    await tab.dispatchEvent('dblclick');
    await expect(page.locator('.tulweb-stack.maximized')).toBeHidden();

    // All stacks should be back
    await expect(page.locator('.tulweb-stack')).toHaveCount(initialStackCount);
  });

  test('minimize button collapses the stack', async ({ page }) => {
    const stack = page.locator('.tulweb-stack').filter({ has: page.locator('.tulweb-min-btn') }).first();

    const minBtn = stack.locator('.tulweb-min-btn');
    await minBtn.click();

    await expect(stack).toHaveClass(/minimized/);
  });

  test('clicking minimized stack header restores it', async ({ page }) => {
    const stack = page.locator('.tulweb-stack').filter({ has: page.locator('.tulweb-min-btn') }).first();
    const minBtn = stack.locator('.tulweb-min-btn');

    // Minimize
    await minBtn.click();
    await expect(stack).toHaveClass(/minimized/);

    // Click minimize button again to toggle
    await minBtn.click();
    await expect(stack).not.toHaveClass(/minimized/);
  });
});
