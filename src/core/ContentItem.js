import { EventEmitter } from '../utils/EventEmitter.js'
import { Utils } from '../utils/Utils.js'

export class ContentItem extends EventEmitter {
    constructor(config, layoutManager) {
        super()
        this.config = config || {}
        this.layoutManager = layoutManager
        this.parent = null
        this.children = []
        this.element = null
        this.size = this.config.size || null
        this.minWidth = this.config.minWidth ?? 0
        this.minHeight = this.config.minHeight ?? 0
        this.id = this.config.id || Utils.generateId()

        this._isActive = false
        this._isFocused = false

        this.createDOM()
        if (this.element) {
            this.element.tulwebItem = this // Link back from DOM
        }
    }

    createDOM() { /* Override */ }

    addChild(child, index, skipLayout = false) {
        child.parent = this
        if (typeof index === 'number') {
            this.children.splice(index, 0, child)
        } else {
            this.children.push(child)
        }
        this._appendDOMChild(child, index)
        if (!skipLayout) {
            this.updateLayout()
        }
    }

    removeChild(child) {
        const index = this.children.indexOf(child)
        if (index > -1) {
            // Check if closure is allowed
            if (child.emit('beforeClose') === false) return false

            this.children.splice(index, 1)
            child.parent = null

            // Perform actual destruction after removal from array
            child.destroy()

            this.updateLayout()
            this.emit('stateChanged')
            if (this.layoutManager) {
                this.layoutManager.emit('stateChanged')
            }
            return true
        }
        return false
    }

    replaceChild(oldChild, newChild, index) {
        this.children[index] = newChild
        newChild.parent = this
        oldChild.parent = null
        this._replaceDOMChild(oldChild, newChild)
        this.updateLayout()
    }

    /**
     * Detach a child from the tree without destroying it.
     * Used by the popout system to move stacks to external windows
     * while preserving their DOM, event listeners, and closure state.
     */
    detachChild(child) {
        const index = this.children.indexOf(child)
        if (index > -1) {
            this.children.splice(index, 1)
            child.parent = null
            // Remove from DOM without destroying
            if (child.element && child.element.parentElement) {
                child.element.parentElement.removeChild(child.element)
            }
            this.updateLayout()
            this.emit('stateChanged')
            if (this.layoutManager) {
                this.layoutManager.emit('stateChanged')
            }
            return true
        }
        return false
    }

    _appendDOMChild(child, index) { /* Override */ }
    _removeDOMChild(child) { /* Override */ }
    _replaceDOMChild(oldChild, newChild) { /* Override */ }

    updateLayout() { /* Override */ }

    getMinWidthPx() {
        if (this.isMinimized) return 0;
        const parentPx = this.parent ? this.parent.element.offsetWidth : (this.layoutManager ? this.layoutManager.rootElement.offsetWidth : window.innerWidth);
        return Utils.resolveToPixels(this.minWidth, parentPx);
    }

    getMinHeightPx() {
        if (this.isMinimized) return 0;
        const parentPx = this.parent ? this.parent.element.offsetHeight : (this.layoutManager ? this.layoutManager.rootElement.offsetHeight : window.innerHeight);
        return Utils.resolveToPixels(this.minHeight, parentPx);
    }

    updateFlex() {
        if (!this.element) return;
        const size = this.size;

        this.element.style.minWidth = this.isMinimized ? '' : (typeof this.minWidth === 'number' ? `${this.minWidth}px` : this.minWidth);
        this.element.style.minHeight = this.isMinimized ? '' : (typeof this.minHeight === 'number' ? `${this.minHeight}px` : this.minHeight);
        if (typeof size === 'number') {
            this.element.style.flex = `${size} 1 0%`;
            this.element.style.width = '';
            this.element.style.height = '';
        } else if (typeof size === 'string') {
            this.element.style.flex = `0 0 ${size}`;
            const isRow = this.parent && this.parent.config.type === 'row';
            if (isRow) {
                this.element.style.width = size;
                this.element.style.height = '';
            } else {
                this.element.style.height = size;
                this.element.style.width = '';
            }
        } else {
            this.element.style.flex = '1 1 auto';
            this.element.style.width = '';
            this.element.style.height = '';
        }
        this.emit('resize');
    }

    destroy() {
        if (this.emit('beforeClose') === false) return false

        if (this._isFocused) {
            this._isFocused = false
            this.emit('defocus')
        }
        if (this._isActive) {
            this._isActive = false
            this.emit('inactive')
        }
        this.emit('destroy')
        const kids = [...this.children]
        for (const c of kids) {
            if (c.destroy() === false) return false
        }

        if (this.parent) {
            if (this.parent.children.length === 0 && this.parent.layoutManager) {
                this.parent.layoutManager._cleanupEmptyStack(this.parent)
            }
            this.parent.removeChild(this)
        } else if (this.element && this.element.parentElement) {
            this.element.parentElement.removeChild(this.element)
        }
        return true
    }

    toConfig() {
        const res = {
            type: this.config.type,
            size: this.size,
            minWidth: this.minWidth,
            minHeight: this.minHeight
        }
        if (this.id) res.id = this.id
        if (this.children.length > 0) {
            res.content = this.children.map(c => c.toConfig())
        }
        return res
    }
}
