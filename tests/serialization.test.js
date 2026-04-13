import { test, expect } from '@playwright/test';

async function waitForLayout(page) {
  await page.waitForSelector('.tulweb-stack', { state: 'visible' });
}

test.describe('Layout Serialization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo/');
    await waitForLayout(page);
  });

  test('toConfig() returns a valid layout object', async ({ page }) => {
    const config = await page.evaluate(() => window.layout.toConfig());
    expect(config).toHaveProperty('content');
    expect(Array.isArray(config.content)).toBe(true);
    expect(config.content.length).toBeGreaterThan(0);
  });

  test('toConfig() root node has a type', async ({ page }) => {
    const config = await page.evaluate(() => window.layout.toConfig());
    expect(['row', 'column', 'stack']).toContain(config.content[0].type);
  });

  test('toConfig() includes children recursively', async ({ page }) => {
    const config = await page.evaluate(() => window.layout.toConfig());
    const root = config.content[0];
    // Root should have its own content children
    expect(Array.isArray(root.content)).toBe(true);
    expect(root.content.length).toBeGreaterThan(0);
  });

  test('loadLayout() followed by toConfig() is a round-trip', async ({ page }) => {
    const originalConfig = await page.evaluate(() => window.layout.toConfig());

    await page.evaluate((cfg) => {
      window.layout.loadLayout(cfg);
    }, originalConfig);

    await waitForLayout(page);

    const reloadedConfig = await page.evaluate(() => window.layout.toConfig());
    // The root type should be preserved
    expect(reloadedConfig.content[0].type).toBe(originalConfig.content[0].type);
  });

  test('Ctrl+S saves valid JSON to localStorage', async ({ page }) => {
    await page.evaluate(() => localStorage.removeItem('tulweb_saved_state_v2'));
    await page.locator('.tulweb-root').click();
    await page.keyboard.press('Control+s');

    const raw = await page.evaluate(() => localStorage.getItem('tulweb_saved_state_v2'));
    expect(raw).not.toBeNull();

    // Should not throw
    const parsed = JSON.parse(raw);
    expect(parsed).toHaveProperty('content');
  });

  test('getAllStacks() returns a non-empty array', async ({ page }) => {
    const stackCount = await page.evaluate(() => window.layout.getAllStacks().length);
    expect(stackCount).toBeGreaterThan(0);
  });
});
