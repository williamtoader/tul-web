import { test, expect } from '@playwright/test';

test.describe('Scrolling Tabs Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo/');
    await page.waitForSelector('.tulweb-stack');
  });

  test('tab header becomes scrollable when many tabs are added', async ({ page }) => {
    // Add many tabs via evaluate using the API
    await page.evaluate(() => {
      const stacks = window.layout.getAllStacks();
      // Find the main editor stack (usually the one with most tabs initially)
      const stack = stacks.find(s => s.children.length > 2) || stacks[0];
      for (let i = 0; i < 15; i++) {
        const newComp = window.layout._buildObjectTree({
          type: 'component', 
          componentName: 'generic', 
          title: 'Extra Tab ' + i
        });
        stack.addChild(newComp);
      }
    });

    // Wait a bit for layout to settle
    await page.waitForTimeout(100);

    const editorStack = page.locator('.tulweb-stack').filter({ hasText: 'Extra Tab 0' }).first();
    const tabsContainer = editorStack.locator('.tulweb-tabs');

    // Verify overflow button exists
    const overflowBtn = editorStack.locator('.tulweb-tab-overflow');
    await expect(overflowBtn).toBeVisible();

    // Verify container is scrollable
    const hasOverflow = await tabsContainer.evaluate(el => el.scrollWidth > el.clientWidth);
    expect(hasOverflow).toBe(true);

    // Verify all tabs are still visible (not display: none)
    const tabs = editorStack.locator('.tulweb-tab');
    const count = await tabs.count();
    expect(count).toBeGreaterThan(15);
    for (let i = 0; i < 5; i++) {
        await expect(tabs.nth(i)).toBeVisible();
    }
  });

  test('clicking a tab in overflow dropdown scrolls it into view', async ({ page }) => {
    // Add many tabs
    await page.evaluate(() => {
      const stacks = window.layout.getAllStacks();
      const stack = stacks.find(s => s.tabPosition === 'top') || stacks[0];
      for (let i = 0; i < 15; i++) {
        const newComp = window.layout._buildObjectTree({
          type: 'component', 
          componentName: 'generic', 
          title: 'Scroll Tab ' + i
        });
        stack.addChild(newComp);
      }
    });

    const editorStack = page.locator('.tulweb-stack').filter({ hasText: 'Scroll Tab 0' }).first();
    const tabsContainer = editorStack.locator('.tulweb-tabs');

    // Scroll to first tab to make last tab definitely out of view
    await tabsContainer.evaluate(el => el.scrollLeft = 0);

    // Open dropdown
    await editorStack.locator('.tulweb-tab-overflow').click();
    const dropdown = page.locator('.tulweb-dropdown');
    await expect(dropdown).toBeVisible();

    // Click a tab at the end of the list in dropdown
    const lastItem = dropdown.locator('.tulweb-dropdown-item').last();
    await lastItem.click();

    // Verify it is active
    const lastTab = editorStack.locator('.tulweb-tab').last();
    await expect(lastTab).toHaveClass(/active/);
    
    // Check if scrolled into view
    await page.waitForTimeout(1000); // More time for smooth scroll
    const isVisibleInContainer = await lastTab.evaluate((el) => {
      const container = el.parentElement;
      const rect = el.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const isVisible = rect.left >= containerRect.left - 10 && rect.right <= containerRect.right + 10;
      if (!isVisible) {
          console.log(`Tab Rect: ${rect.left}-${rect.right}, Container Rect: ${containerRect.left}-${containerRect.right}`);
      }
      return isVisible;
    });
    expect(isVisibleInContainer).toBe(true);

  });

  test('vertical stacks also support scrolling', async ({ page }) => {
    // Add tabs to a vertical stack
    await page.evaluate(() => {
      const stacks = window.layout.getAllStacks();
      const vStack = stacks.find(s => s.tabPosition === 'left' || s.tabPosition === 'right') || stacks[0];
      for (let i = 0; i < 15; i++) {
        const newComp = window.layout._buildObjectTree({
          type: 'component', 
          componentName: 'generic', 
          title: 'Vert Tab ' + i
        });
        vStack.addChild(newComp);
      }
    });

    // Find the vertical stack with many tabs
    const verticalStack = page.locator('.tulweb-stack.tab-left, .tulweb-stack.tab-right').filter({ hasText: 'Vert Tab 0' }).first();
    const tabsContainer = verticalStack.locator('.tulweb-tabs');

    const hasVerticalOverflow = await tabsContainer.evaluate(el => el.scrollHeight > el.clientHeight);
    expect(hasVerticalOverflow).toBe(true);
    
    const overflowBtn = verticalStack.locator('.tulweb-tab-overflow');
    await expect(overflowBtn).toBeVisible();
  });
});

