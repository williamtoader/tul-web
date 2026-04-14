import { EventEmitter } from './utils/EventEmitter.js'
import { Utils } from './utils/Utils.js'
import { DragManager } from './managers/DragManager.js'
import { PopoutManager } from './managers/PopoutManager.js'
import { DragSource } from './ui/DragSource.js'
import { RowItem, ColumnItem } from './core/ContainerItem.js'
import { StackItem } from './core/StackItem.js'
import { ComponentItem } from './core/ComponentItem.js'
import { Toast } from './ui/Toast.js'
import { ContextMenu } from './ui/ContextMenu.js'

export class LayoutManager extends EventEmitter {
    constructor(config, container, options = {}) {
        super()
        this.container = container
        this.componentFactories = {}
        this.root = null
        this.settings = Object.assign({
            onlyResizeActiveTabs: true,
            enableMinimize: true,
            enablePreview: false,
            enablePopout: false
        }, config && config.settings ? config.settings : {}, options)

        // Create root DOM element
        this.rootElement = Utils.createElement('div', 'tulweb-root', container)

        // Add toast container
        this.toastContainer = Utils.createElement('div', 'tulweb-toast-container', document.body)

        this.activeStack = null

        this.dragManager = new DragManager(this)

        // Initialize popout manager
        this.popoutManager = new PopoutManager(this)

        if (config) {
            this.loadLayout(config)
        }

        // Handle window resize with debounce
        this._resizeTimeout = null
        this._onWindowResize = () => {
            clearTimeout(this._resizeTimeout)
            this._resizeTimeout = setTimeout(() => {
                this.updateLayout()
            }, 100)
        }
        window.addEventListener('resize', this._onWindowResize)

        this._onKeyDown = (e) => {
            this.handleGlobalKeydown(e)
        }
        document.addEventListener('keydown', this._onKeyDown)
    }

    destroy() {
        window.removeEventListener('resize', this._onWindowResize)
        document.removeEventListener('keydown', this._onKeyDown)
        if (this.popoutManager) {
            this.popoutManager.destroy()
        }
        if (this.root) this.root.destroy()
        if (this.rootElement && this.rootElement.parentElement) {
            this.rootElement.parentElement.removeChild(this.rootElement)
        }
        if (this.toastContainer && this.toastContainer.parentElement) {
            this.toastContainer.parentElement.removeChild(this.toastContainer)
        }
        if (this.dragManager) {
            this.dragManager.destroy()
        }
        if (this.contextMenu) {
            this.contextMenu.destroy()
        }
    }

    registerComponent(name, factoryMethod) {
        this.componentFactories[name] = factoryMethod
    }

    createDragSource(element, itemConfig) {
        return new DragSource(element, itemConfig, this)
    }

    loadLayout(config) {
        if (!config) throw new Error("Layout config is required")

        // Basic Validation (Tier 3)
        if (config.content && !Array.isArray(config.content)) {
            throw new Error("Invalid config: 'content' must be an array")
        }

        this.rootElement.innerHTML = ''
        if (config.settings) {
            this.settings = Object.assign(this.settings, config.settings)
        }
        if (!config.content || !Array.isArray(config.content) || config.content.length === 0) {
            this.root = null
            this.renderEmptyState()
            return
        }

        // Config usually wraps in Row or Column.
        this.root = this._buildObjectTree(config.content[0])
        this.rootElement.appendChild(this.root.element)
        this.root.updateLayout()
    }

    _buildObjectTree(config) {
        if (!config) return null
        let item

        if (config.type === 'row') {
            item = new RowItem(config, this)
        } else if (config.type === 'column') {
            item = new ColumnItem(config, this)
        } else if (config.type === 'stack') {
            item = new StackItem(config, this)
        } else if (config.type === 'component') {
            return new ComponentItem(config, this)
        }

        // Recursively build children for container items
        if (item && config.content && Array.isArray(config.content)) {
            config.content.forEach(childConfig => {
                const child = this._buildObjectTree(childConfig)
                if (child) {
                    item.addChild(child, undefined, true)
                }
            })
        }

        return item
    }

    showContextMenu(evt, stack, child, index) {
        if (this.contextMenu) {
            this.contextMenu.destroy()
        }
        this.contextMenu = new ContextMenu(this, evt, stack, child, index)
    }

    handleGlobalKeydown(e) {
        if (e.ctrlKey || e.metaKey) {
            if (e.key.toLowerCase() === 's') {
                e.preventDefault()
                // Emit an event so applications can handle save in their own way
                this.emit('saveRequested')
            }
            if (e.key.toLowerCase() === 'w') {
                let active = this.activeStack
                if (!active) {
                    const stacks = Array.from(this.rootElement.querySelectorAll('.tulweb-stack'))
                        .map(el => el.tulwebItem)
                        .filter(s => s && s instanceof StackItem && s.children.length > 0)
                    if (stacks.length > 0) active = stacks[0]
                }
                if (active && active.children.length > 0) {
                    e.preventDefault()
                    const idx = active.activeChildIndex
                    const child = active.children[idx]
                    child.destroy()
                }
            }
        }
        if (e.altKey) {
            if (['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                e.preventDefault()
                this.navigateFocus(e.key)
            }
        }
    }

    initShortcuts() {
        // Redundant now that handles are in handleGlobalKeydown
    }

    navigateFocus(key) {
        if (!this.activeStack || !this.activeStack.element) return
        const stacks = Array.from(this.rootElement.querySelectorAll('.tulweb-stack'))
            .map(el => el.tulwebItem)
            .filter(s => s && s instanceof StackItem)

        const currentRect = this.activeStack.element.getBoundingClientRect()
        const cx = currentRect.left + currentRect.width / 2
        const cy = currentRect.top + currentRect.height / 2

        let bestStack = null
        let bestDist = Infinity

        stacks.forEach(s => {
            if (s === this.activeStack) return
            const r = s.element.getBoundingClientRect()
            const tx = r.left + r.width / 2
            const ty = r.top + r.height / 2

            let valid = false
            if (key === 'ArrowRight' && tx > cx) valid = true
            if (key === 'ArrowLeft' && tx < cx) valid = true
            if (key === 'ArrowDown' && ty > cy) valid = true
            if (key === 'ArrowUp' && ty < cy) valid = true

            if (valid) {
                const dist = Math.pow(tx - cx, 2) + Math.pow(ty - cy, 2)
                if (dist < bestDist) {
                    bestDist = dist
                    bestStack = s
                }
            }
        })

        if (bestStack) {
            this.setActiveStack(bestStack)
        }
    }

    updateLayout() {
        if (this.root) {
            this.root.updateLayout()
        }
        this.emit('stateChanged')
    }

    toConfig() {
        return {
            settings: {
                hasHeaders: true
            },
            dimensions: {},
            content: this.root ? [this.root.toConfig()] : []
        }
    }

    // Helper: cleans up stacks when empty, or simplifies tree
    _cleanupEmptyStack(stackItem) {
        if (stackItem.type === 'stack' && stackItem.preventEmptyClosure) return
        if (this.activeStack === stackItem) {
            this.setActiveStack(null)
        }

        const parent = stackItem.parent
        if (!parent) {
            // It's the root. If it's a stack and empty, clear root
            if (stackItem.children.length === 0) {
                this.rootElement.innerHTML = ''
                this.root = null
                this.renderEmptyState()
            }
            return
        }

        // Remove stack from parent
        parent.removeChild(stackItem)

        // If parent is now empty, clean it up recursively
        if (parent.children.length === 0) {
            this._cleanupEmptyStack(parent)
        }
        // If parent is Row/Col and has only 1 child, simplify tree
        else if (parent.children.length === 1 && parent !== this.root) {
            const singleChild = parent.children[0]
            const grandParent = parent.parent

            if (grandParent) {
                const pIndex = grandParent.children.indexOf(parent)
                singleChild.size = parent.size
                grandParent.replaceChild(parent, singleChild, pIndex)
            } else {
                // Parent is root, replace root
                this.root = singleChild
                this.root.parent = null
                this.rootElement.innerHTML = ''
                this.rootElement.appendChild(this.root.element)
                this.root.updateLayout()
            }
        }
    }

    showToast(message, type = 'info') {
        new Toast(this.toastContainer, message, type)
    }

    renderEmptyState() {
        if (this.root) return
        this.rootElement.innerHTML = `
                <div class="tulweb-empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="9" y1="3" x2="9" y2="21"></line>
                        <path d="M14 8h5"></path>
                        <path d="M14 12h5"></path>
                    </svg>
                    <div>Workspace is empty</div>
                    <div style="font-size: 13px; margin-top: 8px; opacity: 0.5;">Drag a component from the sidebar to get started</div>
                </div>
            `
    }

    setActiveStack(stack) {
        if (this.activeStack === stack) return

        if (this.activeStack && this.activeStack.element) {
            this.activeStack.element.classList.remove('active-stack')
            if (this.activeStack.children) {
                const oldActive = this.activeStack.children[this.activeStack.activeChildIndex]
                if (oldActive && oldActive._isFocused) {
                    oldActive._isFocused = false
                    oldActive.emit('defocus')
                }
            }
        }

        this.activeStack = stack

        if (this.activeStack && this.activeStack.element && this.activeStack.children) {
            this.activeStack.element.classList.add('active-stack')
            const newActive = this.activeStack.children[this.activeStack.activeChildIndex]
            if (newActive && newActive._isActive && !newActive._isFocused) {
                newActive._isFocused = true
                newActive.emit('focus')
            }
        }
    }

    // --- Search & Retrieval API ---

    getComponentById(id) {
        return this._findInTree(this.root, item => item.type === 'component' && item.id === id)
    }

    getStackById(id) {
        return this._findInTree(this.root, item => item.type === 'stack' && item.id === id)
    }

    getItemById(id) {
        return this._findInTree(this.root, item => item.id === id)
    }

    getAllStacks() {
        const stacks = []
        this._traverseTree(this.root, item => {
            if (item.type === 'stack') stacks.push(item)
        })
        return stacks
    }

    addComponent(stackId, config) {
        const stack = this.getStackById(stackId) || this.activeStack
        if (!stack) {
            throw new Error("No target stack found and no active stack available")
        }
        const component = this._buildObjectTree(config)
        stack.addChild(component)
        this.updateLayout()
        return component
    }

    removeComponent(id) {
        const component = this.getComponentById(id)
        if (component) {
            return component.destroy()
        }
        return false
    }

    _findInTree(item, predicate) {
        if (!item) return null
        if (predicate(item)) return item
        if (item.children) {
            for (const child of item.children) {
                const found = this._findInTree(child, predicate)
                if (found) return found
            }
        }
        return null
    }

    _traverseTree(item, callback) {
        if (!item) return
        callback(item)
        if (item.children) {
            item.children.forEach(child => this._traverseTree(child, callback))
        }
    }

    // --- Popout API ---

    /**
     * Pop a stack out to a new browser window.
     * Requires enablePopout: true in settings.
     * @param {StackItem} stack - The stack to pop out
     * @returns {string|null} The popout ID, or null if blocked
     */
    popoutStack(stack) {
        if (!this.settings.enablePopout) {
            console.warn('Popout is disabled. Set enablePopout: true in settings.')
            return null
        }
        return this.popoutManager.popout(stack)
    }

    /**
     * Close all open popout windows.
     */
    closeAllPopouts() {
        this.popoutManager.closeAll()
    }

    /**
     * Close a specific popout by ID.
     * @param {string} popoutId
     */
    closePopout(popoutId) {
        this.popoutManager.closePopout(popoutId)
    }

    /**
     * Broadcast a theme change to all open popout windows.
     * @param {string} bodyClass - The CSS class(es) to apply to body
     */
    broadcastThemeToPopouts(bodyClass) {
        this.popoutManager.broadcastThemeChange(bodyClass)
    }
}
