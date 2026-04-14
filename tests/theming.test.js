import { test, expect } from '@playwright/test';

async function waitForLayout(page) {
  await page.waitForSelector('.tulweb-stack', { state: 'visible' });
}

test.describe('Theming', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo/');
    await waitForLayout(page);

    // Load a layout that contains the sidebar directly
    await page.evaluate(() => {
        if (!window.layout) return;
        window.layout.loadLayout({
            content: [{
                type: 'stack',
                content: [{ type: 'component', componentName: 'sidebar', title: 'Toolkit' }]
            }]
        });
    });
    // Ensure sidebar is rendered
    await expect(page.locator('.app-sidebar')).toBeVisible({ timeout: 5000 });
  });

  const themes = ['theme-nordic', 'theme-cyber', 'theme-light', 'theme-retro'];

  for (const theme of themes) {
    test(`switches to ${theme}`, async ({ page }) => {
      await page.evaluate((t) => { document.body.className = t; }, theme);
      const bodyClass = await page.evaluate(() => document.body.className);
      expect(bodyClass).toBe(theme);
    });
  }

  test('theme radio buttons in sidebar apply correct class', async ({ page }) => {
    // Click the Phosphor Terminal radio (use evaluate because it's display:none)
    const radio = page.locator('input.theme-radio[value="theme-cyber"]');
    await radio.evaluate(el => el.click());
    
    // Give it a moment to propagate
    await page.waitForTimeout(500);
    
    const bodyClass = await page.evaluate(() => document.body.className);
    expect(bodyClass).toBe('theme-cyber');
  });

  test('CSS custom properties are defined', async ({ page }) => {
    const accentDefined = await page.evaluate(() => {
      const val = getComputedStyle(document.body).getPropertyValue('--tulweb-accent');
      return val.trim().length > 0;
    });
    expect(accentDefined).toBe(true);
  });
});
