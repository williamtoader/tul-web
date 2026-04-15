import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function waitForLayout(page) {
  await page.waitForSelector('.tulweb-stack', { state: 'visible' });
}

test.describe('Accessibility (a11y)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo/');
    await waitForLayout(page);
    
    // Load a realistic test layout
    await page.evaluate(() => {
        if (!window.layout) return;
        window.layout.loadLayout({
            content: [{
                type: 'column',
                content: [
                    {
                        type: 'stack',
                        id: 'test-stack',
                        content: [
                            { type: 'component', componentName: 'generic', title: 'Tab 1' },
                            { type: 'component', componentName: 'generic', title: 'Tab 2' }
                        ]
                    },
                    {
                        type: 'row',
                        content: [
                           { type: 'stack', content: [{ type: 'component', title: 'Row Tab' }] },
                           { type: 'stack', content: [{ type: 'component', title: 'Another Tab' }] }
                        ]
                    }
                ]
            }]
        });
    });
    await expect(page.getByRole('tab', { name: 'Tab 1' })).toBeVisible({ timeout: 5000 });
  });

  test('should not have any automatically detectable accessibility violations', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('ARIA roles are correctly applied to layout structure', async ({ page }) => {
    const tablist = page.locator('.tulweb-tabs').first();
    const tab = page.getByRole('tab', { name: 'Tab 1' });
    const panel = page.locator('.tulweb-content-area').first();

    await expect(tablist).toHaveAttribute('role', 'tablist');
    await expect(tab).toHaveAttribute('role', 'tab');
    await expect(panel).toHaveAttribute('role', 'tabpanel');
  });

  test('keyboard navigation switches tabs (Arrow keys)', async ({ page }) => {
    const tab1 = page.getByRole('tab', { name: 'Tab 1' });
    const tab2 = page.getByRole('tab', { name: 'Tab 2' });
    
    await tab1.focus();
    await expect(tab1).toBeFocused();

    await page.keyboard.press('ArrowRight');
    await expect(tab2).toHaveAttribute('aria-selected', 'true');
    await expect(tab2).toBeFocused();

    await page.keyboard.press('ArrowLeft');
    await expect(tab1).toHaveAttribute('aria-selected', 'true');
    await expect(tab1).toBeFocused();
  });

  test('splitters are navigable via keyboard and resize panels', async ({ page }) => {
    const splitter = page.locator('.tulweb-splitter').first();
    await expect(splitter).toBeVisible();
    
    // Focus splitter
    await splitter.evaluate(el => el.focus());
    await expect(splitter).toBeFocused();
    expect(await splitter.getAttribute('role')).toBe('separator');
    
    const topStack = page.locator('.tulweb-stack').first();
    const initialBox = await topStack.boundingBox();
    
    // Resize down
    await page.keyboard.press('ArrowDown');
    // Give it a moment to update layout
    await page.waitForTimeout(100);
    
    const newBox = await topStack.boundingBox();
    expect(newBox.height).toBeGreaterThan(initialBox.height);
  });
});
