import { LayoutManager } from '../LayoutManager.js'

describe('PopoutManager Unit Tests', () => {
  let container
  let layout

  beforeAll(() => {
    // Mock BroadcastChannel for JSDOM
    global.BroadcastChannel = class {
      constructor (name) {
        this.name = name
        this.onmessage = null
      }

      postMessage () {}
      close () {}
    }

    window.open = jest.fn().mockReturnValue({
      document: {
        open: jest.fn(),
        write: jest.fn(),
        close: jest.fn(),
        adoptNode: jest.fn((node) => node),
        getElementById: jest.fn(() => document.createElement('div')),
        body: { className: '' }
      },
      addEventListener: jest.fn((event, cb) => {
        if (event === 'load') cb()
      }),
      closed: false,
      focus: jest.fn(),
      close: jest.fn(),
      location: { href: 'about:blank' }
    })
  })

  beforeEach(() => {
    container = document.createElement('div')
    layout = new LayoutManager(null, container, { enablePopout: true })
  })

  afterEach(() => {
    if (layout) layout.destroy()
    container.innerHTML = ''
    jest.restoreAllMocks()
  })

  test('LayoutManager has PopoutManager initialized when enabled', () => {
    expect(layout.popoutManager).toBeDefined()
    expect(layout.settings.enablePopout).toBe(true)
  })

  test('popout(stack) successfully tracking location and removing from DOM', () => {
    layout.loadLayout({
      content: [{
        type: 'row',
        id: 'test-row',
        content: [
          { type: 'stack', id: 'item-1', content: [{ type: 'component', title: 'T1' }] },
          { type: 'stack', id: 'target-item', content: [{ type: 'component', title: 'T2' }] }
        ]
      }]
    })

    const target = layout.getStackById('target-item')
    const popoutId = layout.popoutStack(target)

    expect(popoutId).toBeDefined()
    expect(layout.getStackById('target-item')).toBeNull()

    const entry = layout.popoutManager.openPopouts.get(popoutId)
    expect(entry).toBeDefined()
    expect(entry.location.parentId).toBe('test-row')
    expect(entry.location.index).toBe(1)
  })

  test('re-integration restores stack to the exact same position', () => {
    layout.loadLayout({
      content: [{
        type: 'row',
        id: 'parent-row',
        content: [
          { type: 'stack', id: 'stay-1', content: [{ type: 'component', title: 'S1' }] },
          { type: 'stack', id: 'pop-me', content: [{ type: 'component', title: 'P1' }] },
          { type: 'stack', id: 'stay-2', content: [{ type: 'component', title: 'S2' }] }
        ]
      }]
    })

    const target = layout.getStackById('pop-me')
    const popoutId = layout.popoutStack(target)

    layout.popoutManager.openPopouts.get(popoutId)

    // Manually trigger the "closed" handler logic
    layout.popoutManager._handlePopoutClosed(popoutId)

    const restored = layout.getStackById('pop-me')
    expect(restored).not.toBeNull()

    const row = layout.getItemById('parent-row')
    expect(row.children.indexOf(restored)).toBe(1)
    expect(row.children[0].id).toBe('stay-1')
    expect(row.children[2].id).toBe('stay-2')
  })

  test('falls back to root if parent is no longer available', () => {
    layout.loadLayout({
      content: [{ type: 'stack', id: 'only-stack', content: [{ type: 'component', title: 'Only' }] }
      ]
    })

    const target = layout.getStackById('only-stack')
    const popoutId = layout.popoutStack(target)

    layout.popoutManager.openPopouts.get(popoutId)

    // Layout is now empty
    expect(layout.root).toBeNull()

    layout.popoutManager._handlePopoutClosed(popoutId)

    expect(layout.root).not.toBeNull()
    expect(layout.getStackById('only-stack')).not.toBeNull()
  })

  test('popout saves prePopoutMinimized and prePopoutMaximized on entry', () => {
    layout.loadLayout({
      content: [{
        type: 'row',
        id: 'row',
        content: [
          { type: 'stack', id: 's1', content: [{ type: 'component', title: 'A' }] }
        ]
      }]
    })

    const target = layout.getStackById('s1')
    const popoutId = layout.popoutStack(target)
    layout.popoutManager.openPopouts.get(popoutId)

    // Both booleans must be stored on the entry
    const entry = layout.popoutManager.openPopouts.get(popoutId)
    expect(entry).toHaveProperty('prePopoutMinimized')
    expect(entry).toHaveProperty('prePopoutMaximized')
  })

  test('popped-out stack is always maximized even when previously minimized', () => {
    layout.loadLayout({
      content: [{
        type: 'row',
        id: 'row',
        content: [
          { type: 'stack', id: 'mini-stack', content: [{ type: 'component', title: 'M' }] }
        ]
      }]
    })

    const target = layout.getStackById('mini-stack')
    // Minimise before popping out
    target.toggleMinimize()
    expect(target.isMinimized).toBe(true)

    const popoutId = layout.popoutStack(target)
    const entry = layout.popoutManager.openPopouts.get(popoutId)

    // The entry should record it was minimized before
    expect(entry.prePopoutMinimized).toBe(true)
    // The stack itself must be maximized (not minimized) in the popout
    expect(target.isMinimized).toBe(false)
    expect(target.isMaximized).toBe(true)
    expect(target.element.classList.contains('minimized')).toBe(false)
    expect(target.element.classList.contains('maximized')).toBe(true)
  })

  test('state restores correctly after popout closes (was minimized)', () => {
    layout.loadLayout({
      content: [{
        type: 'row',
        id: 'row',
        content: [
          { type: 'stack', id: 'restore-stack', content: [{ type: 'component', title: 'R' }] }
        ]
      }]
    })

    const target = layout.getStackById('restore-stack')
    target.toggleMinimize()
    expect(target.isMinimized).toBe(true)

    const popoutId = layout.popoutStack(target)
    // Stack is now maximized inside popout
    expect(target.isMaximized).toBe(true)

    // Close the popout
    layout.popoutManager._handlePopoutClosed(popoutId)

    const restored = layout.getStackById('restore-stack')
    expect(restored).not.toBeNull()
    // Should be minimized again, not maximized
    expect(restored.isMinimized).toBe(true)
    expect(restored.isMaximized).toBe(false)
    expect(restored.element.classList.contains('minimized')).toBe(true)
    expect(restored.element.classList.contains('maximized')).toBe(false)
  })

  test('state restores correctly after popout closes (was normal)', () => {
    layout.loadLayout({
      content: [{
        type: 'row',
        id: 'row',
        content: [
          { type: 'stack', id: 'norm-stack', content: [{ type: 'component', title: 'N' }] }
        ]
      }]
    })

    const target = layout.getStackById('norm-stack')
    // Normal state: not minimized, not maximized
    expect(target.isMinimized).toBe(false)
    expect(target.isMaximized).toBe(false)

    const popoutId = layout.popoutStack(target)
    expect(target.isMaximized).toBe(true)

    layout.popoutManager._handlePopoutClosed(popoutId)

    const restored = layout.getStackById('norm-stack')
    expect(restored.isMinimized).toBe(false)
    expect(restored.isMaximized).toBe(false)
    expect(restored.element.classList.contains('maximized')).toBe(false)
  })

  test('re-integration triggers cancelDrag on DragManager', () => {
    const cancelSpy = jest.spyOn(layout.dragManager, 'cancelDrag')

    layout.loadLayout({
      content: [{ type: 'stack', id: 'cancel-stack', content: [{ type: 'component', title: 'C' }] }
      ]
    })

    const target = layout.getStackById('cancel-stack')
    const popoutId = layout.popoutStack(target)

    layout.popoutManager._handlePopoutClosed(popoutId)

    expect(cancelSpy).toHaveBeenCalled()
  })

  test('emits popout and popout-restore events', () => {
    const popoutSpy = jest.fn()
    const restoreSpy = jest.fn()

    layout.on('popout', popoutSpy)
    layout.on('popout-restore', restoreSpy)

    layout.loadLayout({
      content: [{ type: 'stack', id: 'event-stack', content: [{ type: 'component', title: 'E' }] }]
    })

    const target = layout.getStackById('event-stack')
    const popoutId = layout.popoutStack(target)

    expect(popoutSpy).toHaveBeenCalledWith(target)

    layout.popoutManager._handlePopoutClosed(popoutId)
    expect(restoreSpy).toHaveBeenCalledWith(target)
  })

  test('broadcastThemeChange updates open popout windows', () => {
    layout.loadLayout({
      content: [{ type: 'stack', id: 'theme-stack', content: [{ type: 'component', title: 'T' }] }]
    })
    const target = layout.getStackById('theme-stack')
    const popoutId = layout.popoutStack(target)
    const entry = layout.popoutManager.openPopouts.get(popoutId)

    layout.popoutManager.broadcastThemeChange('dark-mode')
    expect(entry.window.document.body.className).toBe('dark-mode')
  })

  test('prevents popping out a stack that is already a popout child', () => {
    layout.loadLayout({
      content: [{ type: 'stack', id: 's1', content: [{ type: 'component', title: 'C' }] }]
    })
    const s1 = layout.getStackById('s1')
    layout.popoutStack(s1)

    // Try to popout again (it's already detached and has isPopoutChild = true)
    const secondId = layout.popoutManager.popout(s1)
    expect(secondId).toBeNull()
  })

  test('re-integration when original parent was deleted (falls back to root)', () => {
    layout.loadLayout({
      content: [{
        type: 'row',
        id: 'main-row',
        content: [
          { type: 'stack', id: 'stay', content: [{ type: 'component', title: 'S' }] },
          { type: 'stack', id: 'pop', content: [{ type: 'component', title: 'P' }] }
        ]
      }]
    })

    const popStack = layout.getStackById('pop')
    const popoutId = layout.popoutStack(popStack)

    // After popout, stayStack is still there.
    // If we destroy it, the layout becomes empty.
    const stayStack = layout.getStackById('stay')
    stayStack.destroy()

    // Workaround for current cleanup behavior ensuring it's really empty for test
    if (layout.root) {
      if (layout.root.children && layout.root.children.length === 0) {
        layout._cleanupEmptyStack(layout.root)
      } else {
        layout.root.destroy()
      }
    }
    expect(layout.root).toBeNull()

    // Restore
    layout.popoutManager._handlePopoutClosed(popoutId)

    expect(layout.getStackById('pop')).not.toBeNull()
    expect(layout.root).not.toBeNull()
  })

  test('re-integration when root is another stack (wraps in row)', () => {
    layout.loadLayout({
      content: [{
        type: 'row',
        id: 'row-1',
        content: [
          { type: 'stack', id: 's1', content: [{ type: 'component', title: 'A' }] },
          { type: 'stack', id: 's2', content: [{ type: 'component', title: 'B' }] }
        ]
      }]
    })

    const s1 = layout.getStackById('s1')
    const p1 = layout.popoutStack(s1)

    // After s1 is detached, the row-1 is simplified if it has 1 child
    // In our current LayoutManager logic, this might happen.
    const currentRoot = layout.root
    expect(currentRoot).not.toBeNull()

    // Restore s1
    layout.popoutManager._handlePopoutClosed(p1)

    // Root should now be a container containing both
    expect(layout.root.children.length).toBeGreaterThanOrEqual(2)
  })
})
