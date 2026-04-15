import { StackItem, ComponentItem, LayoutManager } from '../tulweb.js'

describe('StackItem', () => {
  let container
  let layoutManager

  beforeEach(() => {
    container = document.createElement('div')
    layoutManager = new LayoutManager(null, container)
  })

  afterEach(() => {
    container.innerHTML = ''
    jest.restoreAllMocks()
  })

  test('initializes with default settings', () => {
    const stack = new StackItem({ type: 'stack' }, layoutManager)
    expect(stack.type).toBe('stack')
    expect(stack.activeChildIndex).toBe(0)
    expect(stack.isMinimized).toBe(false)
    expect(stack.element.classList.contains('tulweb-stack')).toBe(true)
  })

  test('adds and removes component children', () => {
    const stack = new StackItem({ type: 'stack' }, layoutManager)
    const child1 = new ComponentItem({ type: 'component', componentName: 'test1' }, layoutManager)
    const child2 = new ComponentItem({ type: 'component', componentName: 'test2' }, layoutManager)

    stack.addChild(child1)
    expect(stack.children.length).toBe(1)
    expect(stack.activeChildIndex).toBe(0)

    stack.addChild(child2)
    expect(stack.children.length).toBe(2)
    expect(stack.activeChildIndex).toBe(1) // Auto-activates new child

    stack.removeChild(child1)
    expect(stack.children.length).toBe(1)
    expect(stack.children[0]).toBe(child2)
  })

  test('toggles minimize state', () => {
    const stack = new StackItem({ type: 'stack' }, layoutManager)
    expect(stack.isMinimized).toBe(false)

    stack.toggleMinimize()
    expect(stack.isMinimized).toBe(true)
    expect(stack.element.classList.contains('minimized')).toBe(true)

    stack.toggleMinimize()
    expect(stack.isMinimized).toBe(false)
    expect(stack.element.classList.contains('minimized')).toBe(false)
  })

  test('serializes to correct config', () => {
    const stack = new StackItem({
      type: 'stack',
      id: 'test-stack',
      tabPosition: 'bottom'
    }, layoutManager)

    const child = new ComponentItem({
      type: 'component',
      componentName: 'editor',
      title: 'My Editor'
    }, layoutManager)

    stack.addChild(child)

    const config = stack.toConfig()
    expect(config.type).toBe('stack')
    expect(config.id).toBe('test-stack')
    expect(config.content[0].componentName).toBe('editor')
    expect(config.content[0].title).toBe('My Editor')
  })

  test('activeChildIndex updates on child removal', () => {
    const stack = new StackItem({ type: 'stack' }, layoutManager)
    const child1 = new ComponentItem({ type: 'component' }, layoutManager)
    const child2 = new ComponentItem({ type: 'component' }, layoutManager)
    const child3 = new ComponentItem({ type: 'component' }, layoutManager)

    stack.addChild(child1)
    stack.addChild(child2)
    stack.addChild(child3)

    stack.activeChildIndex = 2 // child3
    stack.removeChild(child3)
    expect(stack.activeChildIndex).toBe(1) // Removed last, should move to previous

    // Reset and test middle removal
    stack.addChild(child3)
    stack.activeChildIndex = 1 // child2
    stack.removeChild(child2)
    expect(stack.activeChildIndex).toBe(0) // Should favor previous (child1) over next (child3)

    // Reset and test first removal
    const child4 = new ComponentItem({ type: 'component' }, layoutManager)
    stack.addChild(child4) // [child1, child3, child4]
    stack.activeChildIndex = 0 // child1
    stack.removeChild(child1)
    expect(stack.activeChildIndex).toBe(0) // No previous, should move to next (child3)
  })

  test('renderTabs generates tab elements', () => {
    const stack = new StackItem({ type: 'stack' }, layoutManager)
    stack.addChild(new ComponentItem({ type: 'component', title: 'Tab 1' }, layoutManager))
    stack.addChild(new ComponentItem({ type: 'component', title: 'Tab 2' }, layoutManager))

    stack.renderTabs()
    const tabs = stack.tabsEl.querySelectorAll('.tulweb-tab')
    expect(tabs.length).toBe(2)
    expect(tabs[0].textContent).toContain('Tab 1')
    expect(tabs[1].textContent).toContain('Tab 2')
  })

  test('updateOverflow detects horizontal overflow and shows button', () => {
    const stack = new StackItem({ type: 'stack' }, layoutManager)
    stack.addChild(new ComponentItem({ type: 'component', title: 'T1' }, layoutManager))

    // Mock overflow
    Object.defineProperty(stack.tabsEl, 'scrollWidth', { value: 200, configurable: true })
    Object.defineProperty(stack.tabsEl, 'clientWidth', { value: 100, configurable: true })

    stack.updateOverflow()
    expect(stack.overflowBtn.style.display).toBe('flex')
  })

  test('updateOverflow detects vertical overflow for side positions', () => {
    const stack = new StackItem({ type: 'stack', tabPosition: 'left' }, layoutManager)
    stack.addChild(new ComponentItem({ type: 'component', title: 'T1' }, layoutManager))

    // Mock overflow
    Object.defineProperty(stack.tabsEl, 'scrollHeight', { value: 200, configurable: true })
    Object.defineProperty(stack.tabsEl, 'clientHeight', { value: 100, configurable: true })

    stack.updateOverflow()
    expect(stack.overflowBtn.style.display).toBe('flex')
  })

  test('scrollTabIntoView calls scrollTo on tabs container', () => {
    const stack = new StackItem({ type: 'stack' }, layoutManager)
    stack.addChild(new ComponentItem({ type: 'component', title: 'T1' }, layoutManager))
    stack.addChild(new ComponentItem({ type: 'component', title: 'T2' }, layoutManager))
    stack.renderTabs()

    const scrollByMock = jest.fn()
    stack.tabsEl.scrollBy = scrollByMock

    // Mock tab positions
    const tabs = stack.tabsEl.querySelectorAll('.tulweb-tab')
    Object.defineProperty(tabs[1], 'offsetLeft', { value: 150, configurable: true })
    Object.defineProperty(tabs[1], 'offsetWidth', { value: 50, configurable: true })
    Object.defineProperty(stack.tabsEl, 'clientWidth', { value: 100, configurable: true })
    Object.defineProperty(stack.tabsEl, 'scrollLeft', { value: 0, configurable: true })

    stack.scrollTabIntoView(1)
    expect(scrollByMock).toHaveBeenCalledWith(expect.objectContaining({
      left: expect.any(Number),
      behavior: 'smooth'
    }))
  })

  test('headless stack skips tab rendering and overflow updates', () => {
    const stack = new StackItem({ type: 'stack', tabPosition: 'headless' }, layoutManager)
    stack.addChild(new ComponentItem({ type: 'component', title: 'T1' }, layoutManager))

    stack.renderTabs()
    expect(stack.tabsEl.innerHTML).toBe('') // Should return early and not render

    stack.updateOverflow()
    expect(stack.overflowBtn).toBeUndefined() // Should return early and not create button
  })

  test('headless stack setActive skips tab-related operations', () => {
    const stack = new StackItem({ type: 'stack', tabPosition: 'headless' }, layoutManager)
    stack.addChild(new ComponentItem({ type: 'component', title: 'T1' }, layoutManager))
    stack.addChild(new ComponentItem({ type: 'component', title: 'T2' }, layoutManager))

    const renderTabsSpy = jest.spyOn(stack, 'renderTabs')
    const scrollTabIntoViewSpy = jest.spyOn(stack, 'scrollTabIntoView')

    stack.setActive(1)

    expect(stack.activeChildIndex).toBe(1)
    expect(renderTabsSpy).not.toHaveBeenCalled()
    expect(scrollTabIntoViewSpy).not.toHaveBeenCalled()
  })
})
