import { test, expect } from '@playwright/test'

test.describe('Splitter behavior with minimized stacks', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8080/demo/index.html')
  })

  test('splitter next to minimized stack should hide handle and be undraggable', async ({ page }) => {
    // 1. Find a stack and its minimize button
    const stack = page.locator('.tulweb-stack').first()
    const minBtn = stack.locator('.tulweb-min-btn')
    
    // 2. Minimize it
    await minBtn.click()
    await expect(stack).toHaveClass(/minimized/)
    
    // 3. Find adjacent splitter
    // In the default demo, stacks are usually in rows/cols with splitters between them
    const splitter = page.locator('.tulweb-splitter').first()
    
    // 4. Verify class is applied
    await expect(splitter).toHaveClass(/adjacent-minimized/)
    
    // 5. Verify handle is hidden (CSS check)
    const afterDisplay = await splitter.evaluate((el) => {
      const after = window.getComputedStyle(el, ':after')
      return after.display
    })
    expect(afterDisplay).toBe('none')
    
    // 6. Verify cursor is default
    const cursor = await splitter.evaluate((el) => window.getComputedStyle(el).cursor)
    expect(cursor).toBe('default')
  })

  test('restoring stack restores splitter handle', async ({ page }) => {
    const stack = page.locator('.tulweb-stack').first()
    const minBtn = stack.locator('.tulweb-min-btn')
    
    // Minimize
    await minBtn.click()
    const splitter = page.locator('.tulweb-splitter').first()
    await expect(splitter).toHaveClass(/adjacent-minimized/)
    
    // Restore by clicking minimize button again
    await minBtn.click()
    await expect(stack).not.toHaveClass(/minimized/)
    await expect(splitter).not.toHaveClass(/adjacent-minimized/)
    
    // Verify handle is back
    const afterDisplay = await splitter.evaluate((el) => {
      const after = window.getComputedStyle(el, ':after')
      return after.display
    })
    expect(afterDisplay).not.toBe('none')
  })
})
