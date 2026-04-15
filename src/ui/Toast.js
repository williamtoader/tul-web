import { Utils } from '../utils/Utils.js'

export class Toast {
  constructor (container, message, type = 'info') {
    this.element = Utils.createElement('div', 'tulweb-toast', container)
    if (type === 'error') this.element.classList.add('error')

    const icon = type === 'error'
      ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>'
      : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>'

    this.element.innerHTML = icon + '<span>' + message + '</span>'

    setTimeout(() => {
      this.element.classList.add('hiding')
      setTimeout(() => this.destroy(), 300)
    }, 3000)
  }

  destroy () {
    if (this.element && this.element.parentElement) {
      this.element.parentElement.removeChild(this.element)
    }
  }
}
