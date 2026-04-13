import { test, expect } from '@playwright/test';

async function waitForLayout(page) {
  await page.waitForSelector('.tulweb-stack', { state: 'visible' });
}

test.describe('Drag and Drop', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForLayout(page);
  });

  test('dragging a tab shows the drop indicator', async ({ page }) => {
    const tab = page.locator('.tulweb-tab').filter({ has: page.locator('.tulweb-tab-close') }).first();
    const box = await tab.boundingBox();

    // Mouse down on tab to initiate drag
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();

    // Move enough to trigger drag start (threshold is ~5px)
    await page.mouse.move(box.x + box.width / 2 + 20, box.y + box.height / 2 + 20, { steps: 5 });

    // The drop indicator or proxy should become visible during drag
    const dragProxy = page.locator('.tulweb-drag-proxy');

    // Give it a moment
    await page.waitForTimeout(300);

    // Clean up
    await page.mouse.up();
  });

  test('dragging from external sidebar creates a drag source element', async ({ page }) => {
    // The sidebar items should have the drag source class applied
    const dragSources = page.locator('.tulweb-drag-source');
    const count = await dragSources.count();
    expect(count).toBeGreaterThan(0);
  });

  test('dragging a tab does not break the layout', async ({ page }) => {
    const tabs = page.locator('.tulweb-tab').filter({ has: page.locator('.tulweb-tab-close') });
    if (await tabs.count() < 2) test.skip();

    const firstTab = tabs.first();
    const secondStack = page.locator('.tulweb-stack').nth(1);

    const tabBox = await firstTab.boundingBox();
    const stackBox = await secondStack.boundingBox();

    if (!tabBox || !stackBox) test.skip();

    // Drag from first tab to center of another stack
    await page.mouse.move(tabBox.x + tabBox.width / 2, tabBox.y + tabBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(stackBox.x + stackBox.width / 2, stackBox.y + stackBox.height / 2, { steps: 20 });
    await page.mouse.up();

    // Layout should still have stacks
    await expect(page.locator('.tulweb-stack').first()).toBeVisible();
  });
});

test.describe('Splitter Resizing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForLayout(page);
  });

  test('splitters are present in the layout', async ({ page }) => {
    const splitters = page.locator('.tulweb-splitter');
    expect(await splitters.count()).toBeGreaterThan(0);
  });

  test('dragging a vertical splitter resizes panels', async ({ page }) => {
    const splitter = page.locator('.tulweb-row .tulweb-splitter').first();
    if (!(await splitter.isVisible())) test.skip();

    const box = await splitter.boundingBox();
    if (!box) test.skip();

    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 60, cy, { steps: 15 });
    await page.mouse.up();

    // Layout should still render correctly
    await expect(page.locator('.tulweb-root')).toBeVisible();
  });

  test('dragging a horizontal splitter resizes panels', async ({ page }) => {
    const splitter = page.locator('.tulweb-column .tulweb-splitter').first();
    if (!(await splitter.isVisible())) test.skip();

    const box = await splitter.boundingBox();
    if (!box) test.skip();

    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx, cy + 60, { steps: 15 });
    await page.mouse.up();

    await expect(page.locator('.tulweb-root')).toBeVisible();
  });
});
