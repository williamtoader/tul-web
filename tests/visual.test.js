import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/demo/');
        // Wait for layout to be ready
        await page.waitForSelector('.tulweb-root', { state: 'visible' });
    });

    const themes = [
        { name: 'pro-light', class: 'theme-light' },
        { name: 'industrial-graphite', class: 'theme-nordic' },
        { name: 'phosphor-terminal', class: 'theme-cyber' },
        { name: 'retro-grid', class: 'theme-retro' }
    ];

    for (const theme of themes) {
        test(`matches screenshot for ${theme.name} theme`, async ({ page }) => {
            // Apply theme
            await page.evaluate((cls) => {
                document.body.className = cls;
            }, theme.class);

            // Give animations a moment to settle
            await page.waitForTimeout(500);

            // Clear hover states
            await page.mouse.move(0, 0);

            // Take a full page screenshot, masking dynamic console content
            await expect(page).toHaveScreenshot(`${theme.name}.png`, {
                fullPage: true,
                animations: 'disabled',
                mask: [page.locator('[data-component="console"]')]
            });
        });
    }

    test('matches screenshot for maximized stack', async ({ page }) => {
        const tab = page.locator('.tulweb-tab').first();
        await tab.dispatchEvent('dblclick');
        
        await page.waitForSelector('.tulweb-stack.maximized');
        await page.mouse.move(0, 0);
        await expect(page).toHaveScreenshot('maximized-stack.png', {
            animations: 'disabled',
            mask: [page.locator('[data-component="console"]')]
        });
    });

    test('matches screenshot for minimized stack', async ({ page }) => {
        const minBtn = page.locator('.tulweb-control').first();
        await minBtn.click();
        
        await page.waitForSelector('.tulweb-stack.minimized');
        await page.mouse.move(0, 0);
        await expect(page).toHaveScreenshot('minimized-stack.png', {
            animations: 'disabled',
            mask: [page.locator('[data-component="console"]')]
        });
    });
});
