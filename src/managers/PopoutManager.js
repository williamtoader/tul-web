import { Utils } from '../utils/Utils.js'
import { RowItem } from '../core/ContainerItem.js'

export class PopoutManager {
  constructor (layoutManager) {
    this.layoutManager = layoutManager
    // Map of popoutId -> { window, originalStack, location, intervalId }
    this.openPopouts = new Map()

    // Close all popouts when parent unloads
    this._onBeforeUnload = () => this.closeAll()
    window.addEventListener('beforeunload', this._onBeforeUnload)
  }

  /**
     * Pop a stack out into a new browser window.
     * Uses document.adoptNode to physically move the DOM elements,
     * preserving all event listeners and closures.
     */
  popout (stack) {
    if (!stack || stack.children.length === 0) return null

    // Can't popout a stack that's already in a popout
    if (stack.isPopoutChild) {
      return null
    }

    const popoutId = 'popout-' + Utils.generateId()

    // Calculate window dimensions from the stack's current size before we move it
    const rect = stack.element.getBoundingClientRect()
    const width = Math.max(400, Math.round(rect.width))
    let height = Math.max(300, Math.round(rect.height))
    if (stack.isMinimized) height = 500
    const left = Math.round(window.screenX + rect.left)
    const top = Math.round(window.screenY + rect.top)

    // Build styles string from all <link> and <style> tags in parent
    const styles = this._collectStyles()
    const bodyClass = document.body.className || ''

    // Open the window
    const features = `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=no,status=no,toolbar=no,menubar=no,location=no`
    const childWindow = window.open('', popoutId, features)

    if (!childWindow) {
      this.layoutManager.showToast('Popup blocked. Please allow popups for this site.', 'error')
      return null
    }

    // Store reference and location for re-integration
    const parent = stack.parent
    const index = parent ? parent.children.indexOf(stack) : 0
    const parentId = parent ? parent.id : null

    const entry = {
      window: childWindow,
      originalStack: stack,
      location: {
        parentId,
        index
      }
    }
    this.openPopouts.set(popoutId, entry)

    // 1. Detach stack from parent's tree logic WITHOUT destroying it
    // We use the new detachChild which removes it from the layout tree but preserves the instance
    if (stack.parent) {
      stack.parent.detachChild(stack)
      if (stack.parent && stack.parent.children && stack.parent.children.length === 0) {
        this.layoutManager._cleanupEmptyStack(stack.parent)
      }
    } else {
      // Stack was root
      this.layoutManager.rootElement.innerHTML = ''
      this.layoutManager.root = null
      this.layoutManager.renderEmptyState()
    }

    // Apply some overrides while in popout mode
    stack.isPopoutChild = true

    // Track previous state
    entry.prePopoutMinimized = Boolean(stack.isMinimized)
    entry.prePopoutMaximized = Boolean(stack.isMaximized)

    // Force maximize (even if previously minimized)
    if (stack.isMinimized) {
      stack.element.classList.remove('minimized')
      stack.isMinimized = false
      stack.updateFlex()
    }
    if (!stack.isMaximized) {
      stack.element.classList.add('maximized')
      stack.isMaximized = true
    }

    // Force it to full size temporarily
    stack.element.style.width = '100%'
    stack.element.style.height = '100%'
    stack.element.style.flex = '1' // Make sure it takes full space

    // Stop displaying the popout button in popouts
    if (stack.popoutBtn) stack.popoutBtn.style.display = 'none'

    // Prepare the transfer logic
    const performTransfer = () => {
      const destContainer = childWindow.document.getElementById('tulweb-popout-root')
      if (!destContainer) return

      // The core transfer: adopt the node and its entire subtree to the new document
      childWindow.document.adoptNode(stack.element)

      // Append it to the new window's DOM
      destContainer.appendChild(stack.element)

      // Force a resize event on the children so they layout correctly in the new window size
      stack.children.forEach(child => child.emit('resize'))
      this.layoutManager.emit('popoutReady', { popoutId })
    }

    // Write the HTML skeleton into the new window
    childWindow.document.open()
    childWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this._getPopoutTitle(stack)}</title>
    ${styles}
    <style>
        html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
        }
        #tulweb-popout-root {
            width: 100%;
            height: 100%;
            display: flex;
        }
        .tulweb-header-controls {
            display: none !important;
        }
        /* Extra safety: ensure tab panels fill the space */
        .tulweb-stack { border: none !important; border-radius: 0 !important; }
    </style>
</head>
<body class="${bodyClass}">
    <div id="tulweb-popout-root"></div>
</body>
</html>`)
    childWindow.document.close()

    // Wait for styles and DOM to be ready
    if (childWindow.document.readyState === 'complete') {
      performTransfer()
    } else {
      childWindow.addEventListener('load', performTransfer)
    }

    this.layoutManager.emit('popoutCreated', { popoutId })
    this.layoutManager.emit('popout', stack)
    this.layoutManager.emit('stateChanged')

    // Monitor child window closure: fallback polling just in case beforeunload is missed
    const intervalId = setInterval(() => {
      if (childWindow.closed) {
        clearInterval(intervalId)
        this._handlePopoutClosed(popoutId)
      }
    }, 300)

    entry.intervalId = intervalId

    // Also recover via beforeunload on the child window itself for faster response and event listener fidelity
    const rescueStack = () => {
      if (this.openPopouts.has(popoutId)) {
        this._handlePopoutClosed(popoutId)
      }
    }
    childWindow.addEventListener('beforeunload', rescueStack)
    childWindow.addEventListener('pagehide', rescueStack)
    childWindow.addEventListener('unload', rescueStack)

    return popoutId
  }

  _collectStyles () {
    const parts = []
    document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
      parts.push(`<link rel="stylesheet" href="${link.href}">`)
    })
    document.querySelectorAll('style').forEach(style => {
      parts.push(`<style>\n${style.textContent}\n</style>`)
    })
    return parts.join('\n')
  }

  _getPopoutTitle (stack) {
    if (stack.children && stack.children.length > 0) {
      const first = stack.children[0]
      return (first.config.title || first.config.componentName || 'Panel') + ' — TulWEB Popout'
    }
    return 'TulWEB Popout'
  }

  _handlePopoutClosed (popoutId) {
    const entry = this.openPopouts.get(popoutId)
    if (!entry) return

    this.layoutManager.dragManager.cancelDrag()

    if (entry.intervalId) clearInterval(entry.intervalId)
    this.openPopouts.delete(popoutId)

    const stack = entry.originalStack

    if (stack && stack.element) {
      // Adopt it back to the parent document
      document.adoptNode(stack.element)

      // Remove popout styling overrides
      stack.isPopoutChild = false
      stack.element.style.width = ''
      stack.element.style.height = ''
      stack.element.style.flex = ''
      if (stack.popoutBtn) stack.popoutBtn.style.display = ''

      // Restore previous minimized/maximized state
      if (entry.prePopoutMinimized) {
        stack.element.classList.add('minimized')
        stack.isMinimized = true
      } else {
        stack.element.classList.remove('minimized')
        stack.isMinimized = false
      }

      if (!entry.prePopoutMaximized) {
        stack.element.classList.remove('maximized')
        stack.isMaximized = false
      } else {
        stack.element.classList.add('maximized')
        stack.isMaximized = true
      }

      // Sync SVG toggles and styles
      stack.updateFlex()
      if (stack.isMaximized) {
        if (stack.maxBtn) {
          stack.maxBtn.textContent = ''
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
          svg.setAttribute('viewBox', '0 0 24 24')
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
          path.setAttribute('d', 'M4 4h4v2H6v4H4V4zm16 0h-4v2h2v4h2V4zM4 20h4v-2H6v-4H4v6zm16 0h-4v-2h2v-4h2v6z')
          svg.appendChild(path)
          stack.maxBtn.appendChild(svg)
        }
      } else {
        if (stack.maxBtn) {
          stack.maxBtn.textContent = ''
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
          svg.setAttribute('viewBox', '0 0 24 24')
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
          path.setAttribute('d', 'M4 4h16v16H4V4zm2 2v12h12V6H6z')
          svg.appendChild(path)
          stack.maxBtn.appendChild(svg)
        }
      }

      // Add the stack back to the LayoutManager's tree
      let restored = false

      // Try to restore to previous location
      if (entry.location && entry.location.parentId) {
        let parent = this.layoutManager.getItemById(entry.location.parentId)

        // If the direct parent is gone, try to find an ancestor
        if (!parent) {
          parent = this.layoutManager.root
        }

        if (parent && parent.config && (parent.config.type === 'row' || parent.config.type === 'column')) {
          const targetIndex = Math.min(entry.location.index, parent.children.length)
          parent.addChild(stack, targetIndex)
          restored = true
        }
      }

      if (!restored) {
        // Fallback: original re-integration logic
        if (!this.layoutManager.root) {
          // Layout is empty, create the stack as root
          const row = this.layoutManager._buildObjectTree({
            type: 'row',
            content: []
          })
          this.layoutManager.root = row
          this.layoutManager.rootElement.innerHTML = ''
          this.layoutManager.rootElement.appendChild(row.element)
          row.addChild(stack)
          this.layoutManager.root.updateLayout()
        } else {
          // Find the best stack to add to, or create a new split
          const root = this.layoutManager.root

          if (root.config && (root.config.type === 'row' || root.config.type === 'column')) {
            stack.size = 50
            // Reduce existing children proportionally
            root.children.forEach(c => { if (typeof c.size === 'number') c.size *= 0.8 })
            root.addChild(stack)
          } else {
            // Root is a stack - wrap in row
            const wrapper = new RowItem({ type: 'row' }, this.layoutManager)
            const oldRoot = root
            oldRoot.size = 50
            stack.size = 50

            this.layoutManager.rootElement.innerHTML = ''
            oldRoot.parent = null
            wrapper.addChild(oldRoot, undefined, true)
            wrapper.addChild(stack, undefined, true)

            this.layoutManager.root = wrapper
            this.layoutManager.rootElement.appendChild(wrapper.element)
            wrapper.updateLayout()
          }
        }
      }

      stack.updateFlex()
      stack.children.forEach(child => child.emit('resize'))
      this.layoutManager.updateLayout()
      this.layoutManager.showToast('Popout returned to workspace')
    }

    this.layoutManager.emit('popoutClosed', { popoutId })
    this.layoutManager.emit('popout-restore', stack)
    this.layoutManager.emit('stateChanged')
  }

  /**
     * Send a theme change to all open popouts
     */
  broadcastThemeChange (bodyClass) {
    this.openPopouts.forEach((entry) => {
      try {
        if (entry.window && !entry.window.closed) {
          entry.window.document.body.className = bodyClass
        }
      } catch (e) {
        // Cross-origin or already closed
      }
    })
  }

  /**
     * Close a specific popout
     */
  closePopout (popoutId) {
    const entry = this.openPopouts.get(popoutId)
    if (entry && entry.window) {
      try { entry.window.close() } catch (e) { /* cross-origin safety */ }
    }
  }

  /**
     * Close all open popouts
     */
  closeAll () {
    this.openPopouts.forEach((entry, popoutId) => {
      this.closePopout(popoutId)
    })
  }

  /**
     * Get the number of open popouts
     */
  get count () {
    return this.openPopouts.size
  }

  destroy () {
    this.closeAll()
    window.removeEventListener('beforeunload', this._onBeforeUnload)
    this.openPopouts.clear()
  }
}
