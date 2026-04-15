import { LayoutManager } from '../LayoutManager.js'

describe('DragManager Integration Tests', () => {
  let container
  let layout
  let dragManager

  beforeAll(() => {
    if (typeof global.structuredClone !== 'function') {
      global.structuredClone = (obj) => JSON.parse(JSON.stringify(obj))
    }
  })

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    layout = new LayoutManager(null, container)
    dragManager = layout.dragManager

    // Mock RAF to be synchronous for tests
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => cb())
  })

  afterEach(() => {
    layout.destroy()
    container.remove()
    jest.restoreAllMocks()
  })

  test('complete drag and drop lifecycle: tab from stack A to stack B', () => {
    // 1. Setup Initial Layout
    layout.loadLayout({
      content: [{
        type: 'row',
        id: 'root-row',
        content: [
          { type: 'stack', id: 'stack-a', content: [{ type: 'component', id: 'comp-1', title: 'C1' }] },
          { type: 'stack', id: 'stack-b', content: [{ type: 'component', id: 'comp-2', title: 'C2' }] }
        ]
      }]
    })

    const stackA = layout.getStackById('stack-a')
    const stackB = layout.getStackById('stack-b')
    const comp1 = layout.getItemById('comp-1')

    // 2. Start Drag (Pending)
    const startEvent = new MouseEvent('mousedown', {
      bubbles: true,
      clientX: 10,
      clientY: 10
    })
    // Simulate clicking on the tab title
    dragManager.pendDrag(startEvent, comp1.config, 'tab', stackA, 'C1')
    expect(dragManager.isPendingDrag).toBe(true)

    // 3. Move to trigger actual drag start
    const moveEvent1 = new MouseEvent('mousemove', {
      bubbles: true,
      clientX: 50, // Move more than 8px threshold
      clientY: 50
    })
    dragManager.handlePendingMove(moveEvent1)
    expect(dragManager.isPendingDrag).toBe(false)
    expect(dragManager.isDragging).toBe(true)
    expect(dragManager.proxy).toBeDefined()

    // 4. Move over target stack to find drop zone
    // Mock getBoundingClientRect for stackB to ensure findDropZone works
    stackB.element.getBoundingClientRect = () => ({
      top: 0,
      left: 100,
      width: 100,
      height: 100,
      bottom: 100,
      right: 200
    })

    // Mock elementFromPoint to return an element inside stack B
    document.elementFromPoint = jest.fn((x, y) => {
      if (x >= 100 && x <= 200) return stackB.element
      return null
    })

    const moveEvent2 = new MouseEvent('mousemove', {
      bubbles: true,
      clientX: 150,
      clientY: 50
    })
    dragManager.handleMouseMove(moveEvent2)
    expect(dragManager.currentDropZone).toBeDefined()
    expect(dragManager.currentDropZone.target).toBe(stackB)

    // 5. Drop
    const upEvent = new MouseEvent('mouseup', {
      bubbles: true,
      clientX: 150,
      clientY: 50
    })
    dragManager.handleMouseUp(upEvent)

    // 6. Verify Results
    expect(dragManager.isDragging).toBe(false)
    expect(layout.getStackById('stack-a')).toBeNull() // Stack A should be cleaned up if empty
    expect(stackB.children.length).toBe(2)
    expect(stackB.children[1].config.id).toBe('comp-1')
  })

  test('splitting a stack horizontally (left side)', () => {
    layout.loadLayout({
      content: [{
        type: 'stack',
        id: 'target-stack',
        content: [{ type: 'component', id: 'c1', title: 'C1' }]
      }]
    })

    const targetStack = layout.getStackById('target-stack')

    // Start drag of a new external component
    const externalConfig = { type: 'component', id: 'new-comp', title: 'New' }
    dragManager.startDrag(new MouseEvent('mousedown'), externalConfig, 'external', null, 'New')

    // Mock target stack dimensions
    targetStack.element.getBoundingClientRect = () => ({
      top: 0, left: 0, width: 200, height: 200, bottom: 200, right: 200
    })
    document.elementFromPoint = jest.fn(() => targetStack.element)

    // Move to the left edge of the target stack
    const moveEvent = new MouseEvent('mousemove', { clientX: 20, clientY: 100 })
    dragManager.handleMouseMove(moveEvent)

    expect(dragManager.currentDropZone.edge).toBe('left')

    // Drop
    dragManager.handleMouseUp(new MouseEvent('mouseup'))

    // Verify structure: Root should now be a Row containing two stacks
    expect(layout.root.type).toBe('row')
    expect(layout.root.children.length).toBe(2)
    expect(layout.root.children[0].children[0].config.id).toBe('new-comp')
    expect(layout.root.children[1]).toBe(targetStack)
  })

  test('splitting a stack vertically (bottom side)', () => {
    layout.loadLayout({
      content: [{
        type: 'stack',
        id: 'target-stack',
        content: [{ type: 'component', id: 'c1', title: 'C1' }]
      }]
    })

    const targetStack = layout.getStackById('target-stack')
    const externalConfig = { type: 'component', id: 'new-comp', title: 'New' }
    dragManager.startDrag(new MouseEvent('mousedown'), externalConfig, 'external', null, 'New')

    targetStack.element.getBoundingClientRect = () => ({
      top: 0, left: 0, width: 200, height: 200, bottom: 200, right: 200
    })
    document.elementFromPoint = jest.fn(() => targetStack.element)

    // Move to the bottom edge
    const moveEvent = new MouseEvent('mousemove', { clientX: 100, clientY: 180 })
    dragManager.handleMouseMove(moveEvent)

    expect(dragManager.currentDropZone.edge).toBe('bottom')

    dragManager.handleMouseUp(new MouseEvent('mouseup'))

    // Verify structure: Root should now be a Column
    expect(layout.root.type).toBe('column')
    expect(layout.root.children.length).toBe(2)
    expect(layout.root.children[0]).toBe(targetStack)
    expect(layout.root.children[1].children[0].config.id).toBe('new-comp')
  })

  test('cancel pending drag resets state', () => {
    const startEvent = new MouseEvent('mousedown', { clientX: 10, clientY: 10 })
    dragManager.pendDrag(startEvent, {}, 'tab', null, 'Test')
    expect(dragManager.isPendingDrag).toBe(true)

    dragManager.cancelDrag()
    expect(dragManager.isPendingDrag).toBe(false)
  })

  test('dragging outside any drop zone results in cancellation on mouseup', () => {
    layout.loadLayout({
      content: [{ type: 'stack', id: 's1', content: [{ type: 'component', title: 'T' }] }]
    })
    const s1 = layout.getStackById('s1')

    dragManager.startDrag(new MouseEvent('mousedown'), s1.children[0].config, 'tab', s1, 'T')
    expect(dragManager.isDragging).toBe(true)

    // Mock no drop zone
    document.elementFromPoint = jest.fn(() => null)
    dragManager.handleMouseMove(new MouseEvent('mousemove', { clientX: 1000, clientY: 1000 }))
    expect(dragManager.currentDropZone).toBeNull()

    dragManager.handleMouseUp(new MouseEvent('mouseup'))
    expect(dragManager.isDragging).toBe(false)
    expect(layout.getStackById('s1')).not.toBeNull() // Still exists
  })
})
