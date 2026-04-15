import { LayoutManager } from '../LayoutManager.js'
import { Splitter } from './Splitter.js'

describe('Splitter Component Tests', () => {
  let container
  let layout

  beforeEach(() => {
    container = document.createElement('div')
    // JSDOM needs dimensions for getBoundingClientRect to work if we mock it,
    // or we just mock the calls.
    container.style.width = '1000px'
    container.style.height = '1000px'
    document.body.appendChild(container)
    layout = new LayoutManager(null, container)
  })

  afterEach(() => {
    layout.destroy()
    container.remove()
    jest.restoreAllMocks()
  })

  test('Splitter initializes with correct accessibility attributes', () => {
    const prev = { size: 50, element: document.createElement('div'), parent: { children: [] } }
    const next = { size: 50, element: document.createElement('div'), parent: { children: [] } }
    const splitter = new Splitter(true, prev, next, container)

    expect(splitter.element.getAttribute('role')).toBe('separator')
    expect(splitter.element.getAttribute('aria-orientation')).toBe('vertical')
    expect(splitter.element.getAttribute('tabindex')).toBe('0')

    splitter.destroy()
  })

  test('Splitter double click resets sizes to 50/50', () => {
    const prev = { size: 20, updateFlex: jest.fn() }
    const next = { size: 80, updateFlex: jest.fn() }
    const splitter = new Splitter(true, prev, next, container)

    const dblEvent = new MouseEvent('dblclick', { bubbles: true })
    splitter.element.dispatchEvent(dblEvent)

    expect(prev.size).toBe(50)
    expect(next.size).toBe(50)
    expect(prev.updateFlex).toHaveBeenCalled()
  })

  test('Keyboard accessibility (Arrow keys) moves splitter', () => {
    layout.loadLayout({
      content: [{
        type: 'row',
        id: 'r1',
        content: [
          { type: 'stack', id: 's1', size: 50, content: [{ type: 'component', title: 'A' }] },
          { type: 'stack', id: 's2', size: 50, content: [{ type: 'component', title: 'B' }] }
        ]
      }]
    })

    const r1 = layout.getItemById('r1')
    const s1 = layout.getStackById('s1')
    const s2 = layout.getStackById('s2')
    const splitterEl = container.querySelector('.tulweb-splitter')

    // Mock dimensions for parent row and children
    r1.element.getBoundingClientRect = () => ({ width: 1000, height: 1000, left: 0, top: 0 })
    s1.element.getBoundingClientRect = () => ({ width: 500, height: 1000, left: 0, top: 0 })
    s2.element.getBoundingClientRect = () => ({ width: 500, height: 1000, left: 500, top: 0 })

    const keyEvent = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })
    splitterEl.dispatchEvent(keyEvent)

    // availableSpace = 1000. totalWeight = 100. pixelsPerPercent = 10.
    // ArrowRight step = 1. diffPct = 1/10 = 0.1.
    expect(s1.size).toBeCloseTo(50.1)
    expect(s2.size).toBeCloseTo(49.9)
  })

  test('Mouse drag (horizontal) resizes children', () => {
    // Mock RAF to be synchronous for testing
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => cb())

    layout.loadLayout({
      content: [{
        type: 'row',
        id: 'r1',
        content: [
          { type: 'stack', id: 's1', size: 50, content: [{ type: 'component', title: 'A' }] },
          { type: 'stack', id: 's2', size: 50, content: [{ type: 'component', title: 'B' }] }
        ]
      }]
    })

    const r1 = layout.getItemById('r1')
    const s1 = layout.getStackById('s1')
    const s2 = layout.getStackById('s2')
    const splitterEl = container.querySelector('.tulweb-splitter')

    r1.element.getBoundingClientRect = () => ({ width: 1000, height: 1000, left: 0, top: 0 })

    // MouseDown
    const downEvent = new MouseEvent('mousedown', { clientX: 500, clientY: 500 })
    splitterEl.dispatchEvent(downEvent)

    // MouseMove (move 100px right)
    const moveEvent = new MouseEvent('mousemove', { clientX: 600, clientY: 500 })
    document.dispatchEvent(moveEvent)

    // Check sizes
    expect(s1.size).toBeCloseTo(60)
    expect(s2.size).toBeCloseTo(40)

    // MouseUp
    document.dispatchEvent(new MouseEvent('mouseup'))
  })
})
