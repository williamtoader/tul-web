import { DragSource } from './DragSource.js'

describe('DragSource Component Tests', () => {
  let element
  let layoutManager
  let pendDragSpy

  beforeEach(() => {
    element = document.createElement('div')
    pendDragSpy = jest.fn()
    layoutManager = {
      dragManager: {
        pendDrag: pendDragSpy
      }
    }
  })

  test('DragSource initializes and adds class', () => {
    const source = new DragSource(element, { title: 'Test' }, layoutManager)
    expect(source.element.classList.contains('tulweb-drag-source')).toBe(true)
  })

  test('MouseDown triggers pendDrag on layoutManager', () => {
    const config = { title: 'My Component', type: 'component' }
    const source = new DragSource(element, config, layoutManager)
    expect(source).toBeDefined()

    const event = new MouseEvent('mousedown', { clientX: 10, clientY: 20 })
    element.dispatchEvent(event)

    expect(pendDragSpy).toHaveBeenCalledWith(
      expect.anything(),
      config,
      'external',
      null,
      'My Component'
    )
  })

  test('TouchStart triggers pendDrag on layoutManager', () => {
    const config = { title: 'Touch Comp' }
    const source = new DragSource(element, config, layoutManager)
    expect(source).toBeDefined()

    // JSDOM support for TouchEvent is limited, but we can dispatch a generic event or use CustomEvent
    const event = new Event('touchstart')
    element.dispatchEvent(event)

    expect(pendDragSpy).toHaveBeenCalledWith(
      expect.anything(),
      config,
      'external',
      null,
      'Touch Comp'
    )
  })
})
