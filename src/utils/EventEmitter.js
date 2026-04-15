export class EventEmitter {
  constructor () {
    this._listeners = {}
  }

  on (event, callback) {
    if (!this._listeners[event]) this._listeners[event] = []
    this._listeners[event].push(callback)
  }

  off (event, callback) {
    if (!this._listeners[event]) return
    this._listeners[event] = this._listeners[event].filter(cb => cb !== callback)
  }

  once (event, callback) {
    const wrapper = (...args) => {
      this.off(event, wrapper)
      callback(...args)
    }
    this.on(event, wrapper)
  }

  emit (event, ...args) {
    let result = true
    if (this._listeners[event]) {
      const snapshot = [...this._listeners[event]]
      for (const cb of snapshot) {
        if (cb(...args) === false) result = false
      }
    }
    return result
  }
}
