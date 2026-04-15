import { Toast } from './Toast.js'

describe('Toast Component Tests', () => {
  let container

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    jest.useFakeTimers()
  })

  afterEach(() => {
    document.body.innerHTML = ''
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  test('Toast initializes with correct message and type', () => {
    const toast = new Toast(container, 'Hello World', 'info')
    expect(toast).toBeDefined()
    expect(container.textContent).toContain('Hello World')
    expect(container.querySelector('.tulweb-toast')).not.toBeNull()
    expect(container.querySelector('.error')).toBeNull()
  })

  test('Toast adds error class and specific icon for error type', () => {
    const toast = new Toast(container, 'Error Occurred', 'error')
    expect(toast).toBeDefined()
    const toastEl = container.querySelector('.tulweb-toast')
    expect(toastEl.classList.contains('error')).toBe(true)
    // Error icon has a circle and two lines (X)
    expect(toastEl.innerHTML).toContain('circle')
    expect(toastEl.innerHTML).toContain('line')
  })

  test('Toast auto-destroys after timeout', () => {
    const toast = new Toast(container, 'Bye', 'info')
    const toastEl = toast.element

    // Fast-forward 3000ms
    jest.advanceTimersByTime(3000)

    expect(toastEl.classList.contains('hiding')).toBe(true)

    // Fast-forward another 300ms for the exit animation
    jest.advanceTimersByTime(300)

    expect(container.contains(toastEl)).toBe(false)
  })

  test('destroy() safely removes element', () => {
    const toast = new Toast(container, 'Test', 'info')
    toast.destroy()
    expect(container.children.length).toBe(0)

    // Safe to call twice
    toast.destroy()
  })
})
