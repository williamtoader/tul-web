import { Utils } from '../utils/Utils.js'

export class ContextMenu {
    constructor(layoutManager, evt, stack, child, index) {
        this.layoutManager = layoutManager
        this.element = Utils.createElement('div', 'tulweb-context-menu', document.body)
        this.element.style.left = evt.clientX + 'px'
        this.element.style.top = evt.clientY + 'px'

        this._closeHandler = this._closeHandler.bind(this)

        if (child.config.closeable !== false) {
            this.addOption('Close Tab', () => child.destroy())
        }
        this.addOption('Close Other Tabs', () => {
            const toClose = stack.children.filter(c => c.id !== child.id && c.config.closeable !== false)
            toClose.forEach(c => c.destroy())
        })
        this.addOption('Close All Tabs', () => {
            const toClose = stack.children.filter(c => c.config.closeable !== false)
            toClose.forEach(c => c.destroy())
            if (stack.children.length === 0) {
                stack.layoutManager._cleanupEmptyStack(stack)
            }
        })

        // Popout option (only when enabled)
        if (layoutManager.settings.enablePopout && stack.displayPopoutButton !== false) {
            this.addOption('Popout Stack', () => {
                layoutManager.popoutStack(stack)
            })
        }

        document.addEventListener('mousedown', this._closeHandler)
    }

    addOption(text, onClick) {
        const item = Utils.createElement('div', 'tulweb-context-item', this.element)
        item.textContent = text
        item.addEventListener('mousedown', (e) => e.stopPropagation())
        item.addEventListener('click', (e) => {
            e.stopPropagation()
            onClick()
            this.destroy()
        })
    }

    _closeHandler(e) {
        if (this.element && !this.element.contains(e.target)) {
            this.destroy()
        }
    }

    destroy() {
        if (this._pendingListener) {
            clearTimeout(this._pendingListener)
        }
        document.removeEventListener('mousedown', this._closeHandler)
        if (this.element && this.element.parentElement) {
            this.element.parentElement.removeChild(this.element)
        }
        if (this.layoutManager.contextMenu === this) {
            this.layoutManager.contextMenu = null
        }
    }
}
