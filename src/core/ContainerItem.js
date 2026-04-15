import { ContentItem } from './ContentItem.js'
import { Splitter } from '../ui/Splitter.js'

export class ContainerItem extends ContentItem {
  constructor (config, layoutManager) {
    super(config, layoutManager)
    this.splitters = []
    this._prevChildOrder = [] // Track children for diffing
  }

  destroy () {
    // Must clone array to avoid skipping indices as children remove themselves
    const kids = [...this.children]
    for (const child of kids) {
      if (child.destroy() === false) return false
    }
    this.splitters.forEach(s => s.destroy())
    this.splitters = []
    this._prevChildOrder = []
    return super.destroy()
  }

  updateFlex () {
    super.updateFlex()
    this.children.forEach(child => {
      if (child.updateFlex) {
        child.updateFlex()
      }
    })
  }

  toConfig () {
    const res = super.toConfig()
    res.content = this.children.map(c => c.toConfig())
    return res
  }

  createDOM () {
    this.element = document.createElement('div')
    this.element.className = this.config.type === 'row' ? 'tulweb-row' : 'tulweb-column'
  }

  _appendDOMChild (child, index) {
    // Handled in updateLayout via diffing.
  }

  _removeDOMChild (child) {
    // Handled in updateLayout via diffing.
  }

  _replaceDOMChild (oldc, newc) {
    // Handled in updateLayout via diffing.
  }

  /**
     * Normalize flex weights so they sum to ~100.
     */
  _normalizeSizes () {
    if (this.children.length === 0) return
    const weightChildren = this.children.filter(c => typeof c.size === 'number')
    if (weightChildren.length === 0) return

    const totalWeight = weightChildren.reduce((sum, c) => sum + (c.size || 0), 0)
    if (totalWeight === 0) {
      const p = 100 / weightChildren.length
      weightChildren.forEach(c => { c.size = p })
    } else if (Math.abs(totalWeight - 100) > 1) {
      weightChildren.forEach(c => { c.size = (c.size / totalWeight) * 100 })
    }
  }

  /**
     * Check if the child list matches the previous render.
     * Returns true when the children and their order are identical.
     */
  _childrenUnchanged () {
    if (this._prevChildOrder.length !== this.children.length) return false
    for (let i = 0; i < this.children.length; i++) {
      if (this._prevChildOrder[i] !== this.children[i]) return false
    }
    return true
  }

  /**
     * Rebuild the DOM interleaving children and splitters.
     * Reuses Splitter instances whose prev/next pair is unchanged.
     */
  _rebuildDOM () {
    const isVertical = this.config.type === 'row'

    // Build a lookup of existing splitters by their (prev, next) item pair
    const existingSplitters = new Map()
    for (const s of this.splitters) {
      existingSplitters.set(s.prevItem.id + ':' + s.nextItem.id, s)
    }

    const newSplitters = []
    const fragment = document.createDocumentFragment()

    this.children.forEach((child, index) => {
      fragment.appendChild(child.element)

      if (index < this.children.length - 1) {
        const nextChild = this.children[index + 1]
        const key = child.id + ':' + nextChild.id

        if (existingSplitters.has(key)) {
          // Reuse existing splitter — just re-append its element
          const reused = existingSplitters.get(key)
          fragment.appendChild(reused.element)
          newSplitters.push(reused)
          existingSplitters.delete(key) // Mark as consumed
        } else {
          // Create splitter with the real container element (needed for
          // getBoundingClientRect in keyboard/mouse resize calculations).
          // The constructor appends to this.element, so we immediately
          // move it to the fragment for batched DOM insertion.
          const splitter = new Splitter(isVertical, child, nextChild, this.element)
          fragment.appendChild(splitter.element)
          newSplitters.push(splitter)
        }
      }
    })

    // Destroy orphaned splitters that are no longer needed
    existingSplitters.forEach(s => s.destroy())

    // Single DOM write: clear and append the fragment
    this.element.textContent = ''
    this.element.appendChild(fragment)

    this.splitters = newSplitters
    this._updateSplitterStates()
    this._prevChildOrder = [...this.children]
  }

  _updateSplitterStates () {
    this.splitters.forEach(s => {
      const isMin = (s.prevItem.isMinimized || s.nextItem.isMinimized)
      s.element.classList.toggle('adjacent-minimized', !!isMin)
    })
  }

  updateLayout () {
    this._normalizeSizes()

    const structureChanged = !this._childrenUnchanged()

    if (structureChanged) {
      this._rebuildDOM()
    } else {
      this._updateSplitterStates()
    }

    // Recurse into children — they may need their own layout updated
    this.children.forEach(child => child.updateLayout())
    this.updateFlex()
  }
}

export class RowItem extends ContainerItem {
  constructor (config, layoutManager) {
    super(config, layoutManager)
    this.type = 'row'
  }
}

export class ColumnItem extends ContainerItem {
  constructor (config, layoutManager) {
    super(config, layoutManager)
    this.type = 'column'
  }
}
