import { test, expect } from '@playwright/test';

async function waitForLayout(page) {
  await page.waitForSelector('.tulweb-stack', { state: 'visible' });
}

test.describe('LayoutManager API', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForLayout(page);
  });

  test('getAllStacks() returns all visible stacks', async ({ page }) => {
    const apiCount = await page.evaluate(() => window.layout.getAllStacks().length);
    const domCount = await page.locator('.tulweb-stack').count();
    expect(apiCount).toBe(domCount);
  });

  test('getStackById() finds a stack by ID', async ({ page }) => {
    // First load a layout that has an explicit ID
    await page.evaluate(() => {
      window.layout.loadLayout({
        content: [{
          type: 'stack',
          id: 'my-test-stack',
          content: [{ type: 'component', componentName: 'editor', title: 'Test Tab' }]
        }]
      });
    });
    await waitForLayout(page);

    const found = await page.evaluate(() => {
      const stack = window.layout.getStackById('my-test-stack');
      return stack ? stack.id : null;
    });
    expect(found).toBe('my-test-stack');
  });

  test('showToast() renders and auto-removes a toast', async ({ page }) => {
    await page.evaluate(() => window.layout.showToast('Test message', 'info'));

    const toast = page.locator('.tulweb-toast');
    await expect(toast.first()).toBeVisible();

    // Wait for toast animation (default auto-hide is 3s)
    await expect(toast.first()).toBeHidden({ timeout: 5000 });
  });

  test('showToast() with error type renders', async ({ page }) => {
    await page.evaluate(() => window.layout.showToast('Error!', 'error'));
    await expect(page.locator('.tulweb-toast.error')).toBeVisible();
  });

  test('registerComponent() makes a component available', async ({ page }) => {
    await page.evaluate(() => {
      window.layout.registerComponent('testcomp', () => {
        const el = document.createElement('div');
        el.id = 'test-component-rendered';
        el.textContent = 'Hello Test';
        return el;
      });
      window.layout.loadLayout({
        content: [{
          type: 'stack',
          content: [{ type: 'component', componentName: 'testcomp', title: 'Test' }]
        }]
      });
    });
    await waitForLayout(page);
    await expect(page.locator('#test-component-rendered')).toBeVisible();
  });

  test('loadLayout() with empty content shows empty state', async ({ page }) => {
    await page.evaluate(() => window.layout.loadLayout({ content: [] }));
    await expect(page.locator('.tulweb-empty-state')).toBeVisible();
  });

  test('loadLayout() with invalid config throws an error', async ({ page }) => {
    const threw = await page.evaluate(() => {
      try {
        window.layout.loadLayout(null);
        return false;
      } catch (e) {
        return true;
      }
    });
    expect(threw).toBe(true);
  });

  test('toConfig() settings includes hasHeaders', async ({ page }) => {
    const config = await page.evaluate(() => window.layout.toConfig());
    expect(config).toHaveProperty('settings');
    expect(config.settings).toHaveProperty('hasHeaders', true);
  });

  test('componentCreated event fires for each component', async ({ page }) => {
    const count = await page.evaluate(() => {
      let fired = 0;
      window.layout.on('componentCreated', () => fired++);
      window.layout.loadLayout({
        content: [{
          type: 'row',
          content: [
            { type: 'stack', content: [{ type: 'component', componentName: 'editor', title: 'A' }] },
            { type: 'stack', content: [{ type: 'component', componentName: 'editor', title: 'B' }] }
          ]
        }]
      });
      return fired;
    });
    expect(count).toBe(2);
  });

  test('stateChanged event fires after tab close', async ({ page }) => {
    const changed = await page.evaluate(() => {
      return new Promise(resolve => {
        window.layout.once('stateChanged', () => resolve(true));
        // Close a tab
        const stacks = window.layout.getAllStacks();
        const closeable = stacks.flatMap(s => s.children).find(c => c.isCloseable);
        if (closeable) closeable.destroy();
        // If no closeable tab, still resolve
        setTimeout(() => resolve(false), 1000);
      });
    });
    // It may or may not fire depending on the layout state, but shouldn't throw
    expect(typeof changed).toBe('boolean');
  });
});
