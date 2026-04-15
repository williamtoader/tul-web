import { test, expect } from '@playwright/test';

test.describe('Performance Profiling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo/');
    await page.waitForSelector('.tulweb-stack', { state: 'visible' });
  });

  test('Benchmark: Large Layout Initialization', async ({ page }) => {
    const metrics = await page.evaluate(() => {
        const start = performance.now();
        const content = [];
        // Create 20 stacks with 5 tabs each
        for(let i=0; i<20; i++) {
            content.push({
                type: 'stack',
                content: Array.from({length: 5}, (_, j) => ({
                    type: 'component',
                    title: `Tab ${i}-${j}`,
                    componentName: 'generic'
                }))
            });
        }
        window.layout.loadLayout({
            type: 'row',
            content: content
        });
        const end = performance.now();
        return { duration: end - start };
    });
    
    console.log(`Large Layout Init: ${metrics.duration.toFixed(2)}ms`);
    expect(metrics.duration).toBeLessThan(500); // 2026 standard: <500ms for large layout
  });

  test('Benchmark: Tab Add/Remove Thrashing', async ({ page }) => {
    const metrics = await page.evaluate(async () => {
        const stack = window.layout.getAllStacks()[0];
        const start = performance.now();
        
        // Add 100 tabs sequentially
        for(let i=0; i<100; i++) {
            const childConfig = {
                type: 'component',
                title: `Fast Tab ${i}`,
                componentName: 'generic'
            };
            // Create the item instance properly using the internal factory
            const item = window.layout._buildObjectTree(childConfig);
            stack.addChild(item);
        }
        
        const endAdd = performance.now();
        
        // Remove 100 tabs sequentially
        const kids = [...stack.children].slice(-100);
        for(const child of kids) {
            child.destroy();
        }
        
        const endRemove = performance.now();
        return { 
            addDuration: endAdd - start,
            removeDuration: endRemove - endAdd 
        };
    });
    
    console.log(`Add 100 tabs: ${metrics.addDuration.toFixed(2)}ms`);
    console.log(`Remove 100 tabs: ${metrics.removeDuration.toFixed(2)}ms`);
    
    // If every add/remove causes full innerHTML rebuild, it will be slow
    // With diffing, it should be significantly faster.
  });

  test('Benchmark: Deep Nested Layout Update', async ({ page }) => {
    const metrics = await page.evaluate(() => {
        // Create 10 nested rows
        let current = [];
        for(let i=0; i<10; i++) {
            current = [{
                type: 'row',
                content: [
                    { type: 'stack', content: [{ type: 'component', title: 'Deep' }] },
                    ...current
                ]
            }];
        }
        
        const start = performance.now();
        window.layout.loadLayout({ content: current });
        const end = performance.now();
        
        return { duration: end - start };
    });
    
    console.log(`Deep Nested Layout (10 levels) Init: ${metrics.duration.toFixed(2)}ms`);
    expect(metrics.duration).toBeLessThan(300);
  });
});
