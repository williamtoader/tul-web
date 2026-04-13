import { test, expect } from '@playwright/test';

async function waitForLayout(page) {
  await page.waitForSelector('.tulweb-stack', { state: 'visible' });
}

test.describe('Accessibility (a11y)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForLayout(page);
    
    // Load a simple test layout to ensure stability
    await page.evaluate(() => {
        if (!window.layout) return;
        window.layout.loadLayout({
            content: [{
                type: 'stack',
                id: 'test-stack',
                content: [
                    { type: 'component', componentName: 'generic', title: 'Tab 1', componentState: { name: 'C1' } },
                    { type: 'component', componentName: 'generic', title: 'Tab 2', componentState: { name: 'C2' } },
                    { type: 'component', componentName: 'generic', title: 'Tab 3', componentState: { name: 'C3' } }
                ]
            }]
        });
    });
    // Wait for the specific tab to appear to ensure the new layout is active
    await expect(page.getByRole('tab', { name: 'Tab 1' })).toBeVisible({ timeout: 5000 });
  });

  test('ARIA roles are correctly applied', async ({ page }) => {
    const tablist = page.locator('.tulweb-tabs').first();
    const tab = page.getByRole('tab', { name: 'Tab 1' });
    const panel = page.locator('.tulweb-content-area').first();

    await expect(tablist).toBeVisible();
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

  test('keyboard selection (Enter/Space)', async ({ page }) => {
    const tab2 = page.getByRole('tab', { name: 'Tab 2' });
    
    await tab2.evaluate(el => el.focus());
    await expect(tab2).toBeFocused();
    
    await page.keyboard.press('Enter');
    await expect(tab2).toHaveAttribute('aria-selected', 'true');
  });

  test('keyboard "Delete" closes a tab', async ({ page }) => {
    const tab3 = page.getByRole('tab', { name: 'Tab 3' });
    const tab2 = page.getByRole('tab', { name: 'Tab 2' });
    const initialCount = await page.locator('.tulweb-tab').count();

    await tab3.evaluate(el => el.focus());
    await page.keyboard.press('Delete');

    await expect(page.locator('.tulweb-tab')).toHaveCount(initialCount - 1);
  });

  test('focus management: closing a tab focuses the next available tab', async ({ page }) => {
    const tab1 = page.getByRole('tab', { name: 'Tab 1' });
    const tab2 = page.getByRole('tab', { name: 'Tab 2' });
    const tab3 = page.getByRole('tab', { name: 'Tab 3' });
    
    // Select tab 2
    await tab2.evaluate(el => el.focus());
    await page.keyboard.press('Enter');
    await expect(tab2).toHaveAttribute('aria-selected', 'true');
    
    const closeBtn = tab2.locator('.tulweb-tab-close');
    await closeBtn.click();

    // After closing Tab 2, Tab 3 (or Tab 1) should be active and focused
    const activeTab = page.locator('.tulweb-tab.active');
    await expect(activeTab).toBeFocused();
  });

  test('splitters are navigable via keyboard', async ({ page }) => {
    // Reload with a split layout
    await page.evaluate(() => {
        window.layout.loadLayout({
            content: [{
                type: 'row',
                content: [
                    { type: 'stack', content: [{ type: 'component', title: 'S1' }] },
                    { type: 'stack', content: [{ type: 'component', title: 'S2' }] }
                ]
            }]
        });
    });
    
    const splitter = page.locator('.tulweb-splitter');
    await expect(splitter).toBeVisible();
    
    await splitter.evaluate(el => el.focus());
    await expect(splitter).toBeFocused();
    
    const leftStack = page.locator('.tulweb-stack').first();
    const initialBox = await leftStack.boundingBox();
    
    await page.keyboard.press('ArrowRight');
    const newBox = await leftStack.boundingBox();
    expect(newBox.width).not.toBe(initialBox.width);
  });
});
