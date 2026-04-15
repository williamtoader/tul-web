export class Utils {
  static createElement (tag, className, parent) {
    const el = document.createElement(tag)
    if (className) el.className = className
    if (parent) parent.appendChild(el)
    return el
  }

  static generateId () {
    return Math.random().toString(36).substr(2, 9)
  }

  static getRelativePos (evt, elem) {
    const isTouch = evt.touches && evt.touches.length > 0
    const clientX = isTouch ? evt.touches[0].clientX : evt.clientX
    const clientY = isTouch ? evt.touches[0].clientY : evt.clientY
    const rect = elem.getBoundingClientRect()

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
      w: rect.width,
      h: rect.height,
      pointerX: clientX,
      pointerY: clientY
    }
  }

  static parseSize (size) {
    if (typeof size === 'number') return { value: size, unit: 'weight' }
    if (typeof size !== 'string') return { value: 0, unit: 'weight' }
    const match = size.match(/^([\d.]+)([a-z%]*)$/)
    if (!match) {
      const val = parseFloat(size)
      return isNaN(val) ? { value: 0, unit: 'weight' } : { value: val, unit: 'px' }
    }
    return { value: parseFloat(match[1]), unit: match[2] || 'px' }
  }

  static resolveToPixels (size, totalPixels) {
    if (typeof size === 'number') return size
    const parsed = Utils.parseSize(size)
    if (parsed.unit === 'px') return parsed.value
    if (parsed.unit === '%') return (parsed.value / 100) * totalPixels
    if (parsed.unit === 'weight') return (parsed.value / 100) * totalPixels // Optional but consistent
    return parsed.value
  }
}
