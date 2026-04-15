import { LayoutManager } from '../LayoutManager.js'
import { ContextMenu } from './ContextMenu.js'

describe('ContextMenu Component Tests', () => {
  let container
  let layout

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    layout = new LayoutManager(null, container, { enablePopout: true })
  })

  afterEach(() => {
    layout.destroy()
    container.remove()
    // Cleanup any lingering menus in document body
    document.querySelectorAll('.tulweb-context-menu').forEach(m => m.remove())
    jest.restoreAllMocks()
  })

  test('ContextMenu displays correct options based on configuration', () => {
    layout.loadLayout({
      content: [{
        type: 'stack',
        id: 's1',
        content: [
          { type: 'component', id: 'c1', title: 'Closeable' },
          { type: 'component', id: 'c2', title: 'Fixed', closeable: false }
        ]
      }]
    })

    const stack = layout.getStackById('s1')
    const c1 = layout.getItemById('c1')
    const c2 = layout.getItemById('c2')

    // 1. Menu for closeable component
    const menu1 = new ContextMenu(layout, { clientX: 10, clientY: 10 }, stack, c1, 0)
    expect(document.body.innerHTML).toContain('Close Tab')
    expect(document.body.innerHTML).toContain('Close Other Tabs')
    expect(document.body.innerHTML).toContain('Popout Stack')
    menu1.destroy()

    // 2. Menu for non-closeable component
    const menu2 = new ContextMenu(layout, { clientX: 20, clientY: 20 }, stack, c2, 1)
    expect(document.body.innerHTML).not.toContain('Close Tab')
    menu2.destroy()
  })

  test('clicking an option triggers action and destroys menu', () => {
    layout.loadLayout({
      content: [{ type: 'stack', id: 's1', content: [{ type: 'component', id: 'c1', title: 'T' }] }]
    })
    const stack = layout.getStackById('s1')
    const c1 = layout.getItemById('c1')

    const menu = new ContextMenu(layout, { clientX: 0, clientY: 0 }, stack, c1, 0)
    const closeOption = Array.from(document.querySelectorAll('.tulweb-context-item')).find(el => el.textContent === 'Close Tab')

    closeOption.click()
    menu.destroy()

    expect(layout.getItemById('c1')).toBeNull() // Component should be destroyed
    expect(document.querySelector('.tulweb-context-menu')).toBeNull() // Menu should be gone
  })

  test('clicking outside the menu closes it', () => {
    layout.loadLayout({
      content: [{ type: 'stack', id: 's1', content: [{ type: 'component', id: 'c1', title: 'T' }] }]
    })
    const stack = layout.getStackById('s1')
    const c1 = layout.getItemById('c1')

    const menu = new ContextMenu(layout, { clientX: 0, clientY: 0 }, stack, c1, 0)
    expect(document.querySelector('.tulweb-context-menu')).not.toBeNull()

    // Simulate mousedown outside
    const downEvent = new MouseEvent('mousedown', { bubbles: true })
    document.body.dispatchEvent(downEvent)

    expect(document.querySelector('.tulweb-context-menu')).toBeNull()
    menu.destroy()
  })

  test('Close All Tabs option cleans up the stack if empty', () => {
    layout.loadLayout({
      content: [{ type: 'stack', id: 's1', content: [{ type: 'component', id: 'c1', title: 'T' }] }]
    })
    const stack = layout.getStackById('s1')
    const c1 = layout.getItemById('c1')

    const menu = new ContextMenu(layout, { clientX: 0, clientY: 0 }, stack, c1, 0)
    const allOption = Array.from(document.querySelectorAll('.tulweb-context-item')).find(el => el.textContent === 'Close All Tabs')

    allOption.click()
    menu.destroy()

    expect(layout.getStackById('s1')).toBeNull() // Entire stack should be cleaned up
  })
})
