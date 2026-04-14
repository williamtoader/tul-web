import { ContentItem } from './ContentItem.js'
import { Utils } from '../utils/Utils.js'
import { ComponentItem } from './ComponentItem.js'

export class StackItem extends ContentItem {
    constructor(config, layoutManager) {
        super(config, layoutManager)
        this.type = 'stack'
        this.activeChildIndex = 0
        this.isMaximized = false
        this.controlsEl = null
        // isMinimized is initialized in createDOM which is called by the super constructor
        this.hiddenTabs = []
        this._onDocumentClick = this._onDocumentClick.bind(this)
    }

    createDOM() {
        this.tabPosition = this.config.tabPosition || 'top'
        this.isMinimized = !!this.config.minimized
        this.isMaximized = !!this.config.isMaximized

        // Per-stack control button visibility
        this.displayMinimizeButton = this.config.displayMinimizeButton !== false
        this.displayMaximizeButton = this.config.displayMaximizeButton !== false
        this.displayCloseButton = this.config.displayCloseButton !== false
        this.displayPopoutButton = this.config.displayPopoutButton !== false
        this.preventEmptyClosure = !!this.config.preventEmptyClosure

        this.element = document.createElement('div')
        this.element.className = 'tulweb-stack'
        if (this.preventEmptyClosure) this.element.setAttribute('data-persistent', 'true')
        if (this.isMinimized) this.element.classList.add('minimized')
        if (this.isMaximized) this.element.classList.add('maximized')

        if (this.tabPosition && this.tabPosition !== 'top') {
            this.element.classList.add('tab-' + this.tabPosition)
        }

        this.element.addEventListener('mousedown', () => {
            this.layoutManager.setActiveStack(this)
        })

        this.headerEl = Utils.createElement('div', 'tulweb-header', this.element)
        this.tabsEl = Utils.createElement('div', 'tulweb-tabs', this.headerEl)
        this.tabsEl.setAttribute('role', 'tablist')
        this.tabsEl.setAttribute('aria-label', 'Layout Stacks')

        const isPopout = !!this.config.isPopoutChild
        const showMin = this.displayMinimizeButton && this.layoutManager.settings.enableMinimize !== false && !isPopout
        const showMax = this.displayMaximizeButton && !isPopout
        const showClose = this.displayCloseButton && !isPopout
        const showPopout = this.displayPopoutButton && this.layoutManager.settings.enablePopout === true

        if (showMin || showMax || showClose || showPopout) {
            this.controlsEl = Utils.createElement('div', 'tulweb-header-controls', this.headerEl)

            if (showPopout) {
                this.popoutBtn = Utils.createElement('div', 'tulweb-control tulweb-popout-btn', this.controlsEl)
                this.popoutBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>'
                this.popoutBtn.title = 'Pop out to new window'
                this.popoutBtn.addEventListener('click', (e) => {
                    e.stopPropagation()
                    this.layoutManager.popoutStack(this)
                })
            }

            if (showMin) {
                this.minBtn = Utils.createElement('div', 'tulweb-control tulweb-min-btn', this.controlsEl)
                this.minBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 19h12v2H6z"/></svg>'
                this.minBtn.addEventListener('click', (e) => {
                    e.stopPropagation()
                    this.toggleMinimize()
                })
            }

            // Maximize button
            if (showMax) {
                this.maxBtn = Utils.createElement('div', 'tulweb-control tulweb-max-btn', this.controlsEl)
                this.maxBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M4 4h16v16H4V4zm2 2v12h12V6H6z"/></svg>'
                this.maxBtn.addEventListener('click', () => this.toggleMaximize())
            }

            // Close Stack Button
            if (showClose) {
                this.closeBtn = Utils.createElement('div', 'tulweb-control tulweb-close-btn', this.controlsEl)
                this.closeBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>'
                this.closeBtn.addEventListener('click', () => {
                    this.closeAll()
                    if (this.children.length === 0) {
                        this.destroy()
                    }
                })
            }
        }

        this.contentAreaEl = Utils.createElement('div', 'tulweb-content-area', this.element)
        this.contentAreaEl.setAttribute('role', 'tabpanel')
        this.contentAreaEl.id = 'panel-' + this.id

        if (this.layoutManager.settings.enablePreview) {
            this.element.addEventListener('mouseenter', () => {
                if (this.isMinimized) this.element.classList.add('previewing')
            })
            this.element.addEventListener('mouseleave', () => {
                if (this.isMinimized) this.element.classList.remove('previewing')
            })
        }

        if (window.ResizeObserver) {
            this.resizeObserver = new ResizeObserver(() => {
                requestAnimationFrame(() => {
                    if (this.children && this.children.length > 0) this.updateOverflow()
                })
            })
            this.resizeObserver.observe(this.headerEl)
        }
    }

    destroy() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect()
        }
        document.removeEventListener('mousedown', this._onDocumentClick)
        super.destroy()
    }

    removeChild(child) {
        const index = this.children.indexOf(child);
        const wasActive = index === this.activeChildIndex;

        if (super.removeChild(child)) {
            if (this.children.length === 0) {
                this.activeChildIndex = 0;
            } else if (index < this.activeChildIndex) {
                this.activeChildIndex--;
            } else if (index === this.activeChildIndex) {
                this.activeChildIndex = Math.min(this.activeChildIndex, this.children.length - 1);
            }

            // Re-render is handled by ContentItem calling updateLayout() 
            // which is overridden in StackItem to call renderTabs()
            return true;
        }
        return false;
    }

    _appendDOMChild(child, index) {
        this.contentAreaEl.appendChild(child.element)
        child.renderAppContent() // Lazy render when added
        this.activeChildIndex = typeof index === 'number' ? index : this.children.length - 1 // Activate new
    }

    _closeTab(child, index, shouldFocus = true) {
        const wasActive = index === this.activeChildIndex;
        if (this.removeChild(child)) {
            if (this.children.length === 0) {
                this.layoutManager._cleanupEmptyStack(this);
            } else if (wasActive && shouldFocus) {
                // Wait for DOM to update then focus the new active tab
                setTimeout(() => {
                    const tabs = this.tabsEl.querySelectorAll('.tulweb-tab');
                    if (tabs[this.activeChildIndex]) {
                        tabs[this.activeChildIndex].focus();
                    }
                }, 0);
            }
        }
    }

    _removeDOMChild(child) {
        if (child.element && child.element.parentElement === this.contentAreaEl) {
            this.contentAreaEl.removeChild(child.element)
        }
        if (this.activeChildIndex >= this.children.length) {
            this.activeChildIndex = Math.max(0, this.children.length - 1)
        }
    }

    updateLayout() {
        this.renderTabs()
        this.showActiveChild()
        this.updateFlex()
        this.updateOverflow()
    }

    _updateTabActiveState() {
        if (this.tabPosition === 'headless' || !this.tabsEl) return
        const tabs = this.tabsEl.querySelectorAll('.tulweb-tab')
        tabs.forEach((tab, i) => {
            tab.classList.toggle('active', i === this.activeChildIndex)
            tab.setAttribute('aria-selected', i === this.activeChildIndex ? 'true' : 'false')
            tab.setAttribute('tabindex', i === this.activeChildIndex ? '0' : '-1')
        })
    }

    renderTabs() {
        if (this.tabPosition === 'headless') return
        this.tabsEl.innerHTML = ''
        this.children.forEach((child, index) => {
            const tab = Utils.createElement('div', 'tulweb-tab', this.tabsEl)
            if (index === this.activeChildIndex) tab.classList.add('active')

            const title = Utils.createElement('div', 'tulweb-tab-title', tab)
            title.textContent = child.config.title || child.config.componentName || 'Tab'
            let close = null
            const isCloseable = child.isCloseable
            if (isCloseable) {
                close = Utils.createElement('div', 'tulweb-tab-close', tab)
                close.textContent = '×'
                close.addEventListener('click', (e) => {
                    e.stopPropagation()
                    this._closeTab(child, index)
                })

                // Tab drag (allow only if closeable target wasn't clicked, though we check that later)
                tab.addEventListener('mousedown', (e) => {
                    if (e.target === close) return // Handled by close listener
                })
            }

            tab.setAttribute('role', 'tab')
            tab.setAttribute('aria-selected', index === this.activeChildIndex ? 'true' : 'false')
            tab.setAttribute('aria-controls', 'panel-' + this.id)
            tab.setAttribute('tabindex', index === this.activeChildIndex ? '0' : '-1')

            // Keyboard navigation for tabs
            tab.addEventListener('keydown', (e) => {
                if (e.altKey || e.ctrlKey || e.metaKey) return
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                    e.preventDefault()
                    this.setActive((index + 1) % this.children.length)
                    this.tabsEl.querySelectorAll('.tulweb-tab')[this.activeChildIndex].focus()
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                    e.preventDefault()
                    this.setActive((index - 1 + this.children.length) % this.children.length)
                    this.tabsEl.querySelectorAll('.tulweb-tab')[this.activeChildIndex].focus()
                } else if (e.key === 'Home') {
                    e.preventDefault()
                    this.setActive(0)
                    this.tabsEl.querySelectorAll('.tulweb-tab')[0].focus()
                } else if (e.key === 'End') {
                    e.preventDefault()
                    this.setActive(this.children.length - 1)
                    this.tabsEl.querySelectorAll('.tulweb-tab')[this.children.length - 1].focus()
                } else if (e.key === 'Delete' && isCloseable) {
                    e.preventDefault()
                    this._closeTab(child, index, true)
                }
                if (e.key === 'Enter' || e.key === ' ') {
                    this.setActive(index)
                    e.preventDefault()
                }
            })

            // Tab click
            tab.addEventListener('mousedown', (e) => {
                if (e.target !== close && e.button === 0) {
                    this.setActive(index)
                }
            })

            // Tab double click (maximize)
            tab.addEventListener('dblclick', (e) => {
                if (e.target !== close) {
                    this.toggleMaximize()
                }
            })

            // Tab right click context menu
            tab.addEventListener('contextmenu', (e) => {
                e.preventDefault()
                this.setActive(index)
                this.layoutManager.showContextMenu(e, this, child, index)
            })

            // Tab drag
            const startDragHandler = (e) => {
                if (e.target !== close && this.children.length > 0 && (e.type === 'touchstart' || e.button === 0)) {
                    this.layoutManager.dragManager.pendDrag(e, child.config, 'tab', this, child.config.title)
                }
            }

            tab.addEventListener('mousedown', startDragHandler)
            tab.addEventListener('touchstart', startDragHandler, { passive: true })
        })

    }

    updateOverflow() {
        if (!this.tabsEl || this.tabPosition === 'headless') return

        const isVertical = this.tabPosition === 'left' || this.tabPosition === 'right'
        let hasOverflow = false

        if (isVertical) {
            hasOverflow = this.tabsEl.scrollHeight > this.tabsEl.clientHeight
        } else {
            hasOverflow = this.tabsEl.scrollWidth > this.tabsEl.clientWidth
        }

        if (hasOverflow) {
            if (!this.overflowBtn) {
                this.overflowBtn = Utils.createElement('div', 'tulweb-tab-overflow')
                this.overflowBtn.innerHTML = '‹›'
                this.headerEl.insertBefore(this.overflowBtn, this.tabsEl.nextSibling)

                this.dropdownEl = Utils.createElement('div', 'tulweb-dropdown', this.element)
                this.dropdownEl.style.display = 'none'

                this.overflowBtn.addEventListener('click', (e) => {
                    e.stopPropagation()
                    const show = this.dropdownEl.style.display === 'none'
                    if (show) {
                        this.updateDropdownPosition()
                        this.renderDropdown()
                    }
                    this.dropdownEl.style.display = show ? 'block' : 'none'
                })

                document.addEventListener('mousedown', this._onDocumentClick)
            }
            this.overflowBtn.style.display = 'flex'
        } else {
            if (this.overflowBtn) this.overflowBtn.style.display = 'none'
            if (this.dropdownEl) this.dropdownEl.style.display = 'none'
        }

        // Determine actually hidden tabs for the dropdown
        const tabs = this.tabsEl.querySelectorAll('.tulweb-tab')
        if (hasOverflow && tabs.length > 0) {
            const containerRect = this.tabsEl.getBoundingClientRect()
            this.hiddenTabs = this.children.filter((child, i) => {
                const tab = tabs[i]
                if (!tab) return true
                const rect = tab.getBoundingClientRect()
                if (isVertical) {
                    return rect.bottom > containerRect.bottom || rect.top < containerRect.top
                }
                return rect.right > containerRect.right || rect.left < containerRect.left
            })
        } else {
            this.hiddenTabs = []
        }
    }


    _onDocumentClick(e) {
        if (this.dropdownEl && !this.dropdownEl.contains(e.target) && e.target !== this.overflowBtn) {
            this.dropdownEl.style.display = 'none'
        }
    }

    updateDropdownPosition() {
        if (!this.overflowBtn || !this.dropdownEl) return
        const btnRect = this.overflowBtn.getBoundingClientRect()
        const containerRect = this.element.getBoundingClientRect()

        const top = btnRect.top - containerRect.top
        const left = btnRect.left - containerRect.left
        const right = containerRect.right - btnRect.right
        const bottom = containerRect.bottom - btnRect.bottom

        if (this.tabPosition === 'left') {
            this.dropdownEl.style.top = top + 'px'
            this.dropdownEl.style.left = (left + btnRect.width + 5) + 'px'
            this.dropdownEl.style.right = 'auto'
            this.dropdownEl.style.bottom = 'auto'
        } else if (this.tabPosition === 'right') {
            this.dropdownEl.style.top = top + 'px'
            this.dropdownEl.style.right = (right + btnRect.width + 5) + 'px'
            this.dropdownEl.style.left = 'auto'
            this.dropdownEl.style.bottom = 'auto'
        } else if (this.tabPosition === 'bottom') {
            this.dropdownEl.style.bottom = (bottom + btnRect.height + 5) + 'px'
            this.dropdownEl.style.left = (left + btnRect.width - 150) + 'px' // Align right-ish
            if (parseInt(this.dropdownEl.style.left) < 0) this.dropdownEl.style.left = '5px'
            this.dropdownEl.style.top = 'auto'
            this.dropdownEl.style.right = 'auto'
        } else {
            // Top (default)
            this.dropdownEl.style.top = (top + btnRect.height + 5) + 'px'
            this.dropdownEl.style.left = (left + btnRect.width - 150) + 'px' // Align right-ish
            if (parseInt(this.dropdownEl.style.left) < 0) this.dropdownEl.style.left = '5px'
            this.dropdownEl.style.right = 'auto'
            this.dropdownEl.style.bottom = 'auto'
        }
    }

    renderDropdown() {
        this.dropdownEl.innerHTML = ''
        this.hiddenTabs.forEach(child => {
            const item = Utils.createElement('div', 'tulweb-dropdown-item', this.dropdownEl)
            item.textContent = child.config.title || child.config.componentName || 'Tab'
            const selectTab = () => {
                const index = this.children.indexOf(child)
                this.layoutManager.setActiveStack(this)
                this.setActive(index)
                this.dropdownEl.style.display = 'none'
            }
            item.addEventListener('click', selectTab)
            item.addEventListener('touchstart', selectTab, { passive: true })
        })
    }

    setActive(index) {
        const hadFocus = document.activeElement && this.tabsEl && this.tabsEl.contains(document.activeElement)
        const oldIndex = this.activeChildIndex
        this.activeChildIndex = index

        if (this.isMinimized) {
            this.toggleMinimize()
        } else {
            if (this.tabPosition !== 'headless') {
                this._updateTabActiveState()
            }
            this.showActiveChild()

            if ((hadFocus || oldIndex !== index) && this.tabPosition !== 'headless') {
                setTimeout(() => {
                    const tabs = this.tabsEl.querySelectorAll('.tulweb-tab')
                    if (tabs[this.activeChildIndex]) {
                        tabs[this.activeChildIndex].focus()
                    }
                }, 0)
            }
            // Ensure we scroll only after the browser has laid out the new content
            if (this.tabPosition !== 'headless') {
                setTimeout(() => {
                    this.scrollTabIntoView(index)
                }, 50)
            }
        }

        this.layoutManager.emit('stackChanged', this)
        this.layoutManager.emit('stateChanged')
    }

    scrollTabIntoView(index) {
        if (!this.tabsEl) return
        const tabs = this.tabsEl.querySelectorAll('.tulweb-tab')
        const tab = tabs[index]
        if (!tab) return

        const containerRect = this.tabsEl.getBoundingClientRect()
        const tabRect = tab.getBoundingClientRect()
        const isVertical = this.tabPosition === 'left' || this.tabPosition === 'right'

        const buffer = 20 // Slightly larger buffer for better visibility

        if (isVertical) {
            // Check top overflow
            if (tabRect.top < containerRect.top + buffer) {
                this.tabsEl.scrollBy({ top: tabRect.top - containerRect.top - buffer, behavior: 'smooth' })
            }
            // Check bottom overflow
            else if (tabRect.bottom > containerRect.bottom - buffer) {
                this.tabsEl.scrollBy({ top: tabRect.bottom - containerRect.bottom + buffer, behavior: 'smooth' })
            }
        } else {
            // Check left overflow
            if (tabRect.left < containerRect.left + buffer) {
                this.tabsEl.scrollBy({ left: tabRect.left - containerRect.left - buffer, behavior: 'smooth' })
            }
            // Check right overflow
            else if (tabRect.right > containerRect.right - buffer) {
                this.tabsEl.scrollBy({ left: tabRect.right - containerRect.right + buffer, behavior: 'smooth' })
            }
        }
    }



    showActiveChild() {
        const isStackFocused = this.layoutManager.activeStack === this

        this.children.forEach((child, index) => {
            const shouldBeActive = index === this.activeChildIndex
            const shouldBeFocused = shouldBeActive && isStackFocused

            if (shouldBeActive) {
                child.element.style.display = 'block'
            } else {
                child.element.style.display = 'none'
            }

            if (shouldBeActive !== child._isActive) {
                child._isActive = shouldBeActive
                if (shouldBeActive) {
                    child.emit('active')
                    if (this.layoutManager.settings && this.layoutManager.settings.onlyResizeActiveTabs) {
                        child.emit('resize')
                    }
                }
                else child.emit('inactive')
            }

            if (shouldBeFocused !== child._isFocused) {
                child._isFocused = shouldBeFocused
                if (shouldBeFocused) child.emit('focus')
                else child.emit('defocus')
            }
        })
    }

    updateFlex() {
        super.updateFlex()

        if (this.isMinimized) {
            this.element.style.flex = '0 0 auto'
            const isVertical = this.tabPosition === 'left' || this.tabPosition === 'right'
            if (isVertical) {
                this.element.style.width = 'calc(var(--tulweb-tab-height) + 2px)'
                this.element.style.height = ''
            } else {
                this.element.style.height = 'calc(var(--tulweb-tab-height) + 2px)'
                this.element.style.width = ''
            }
        } else {
            this.element.style.width = ''
            this.element.style.height = ''
        }

        const onlyActive = this.layoutManager.settings && this.layoutManager.settings.onlyResizeActiveTabs

        // Propagate resize events to the leaf components so they can react to dimensions
        this.children.forEach((child, index) => {
            if (onlyActive && index !== this.activeChildIndex) return
            child.emit('resize')
        })
    }

    toggleMinimize() {
        if (this.isMaximized) {
            this.toggleMaximize()
        }
        this.isMinimized = !this.isMinimized
        if (this.isMinimized) {
            this.element.classList.add('minimized')
        } else {
            this.element.classList.remove('minimized')
            this.element.classList.remove('previewing')
        }
        this.updateFlex()
        if (this.parent) this.parent.updateLayout()
    }

    toggleMaximize() {
        if (this.isMinimized) {
            this.toggleMinimize()
        }
        this.isMaximized = !this.isMaximized
        if (this.isMaximized) {
            this.element.classList.add('maximized')
            if (this.maxBtn) this.maxBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M4 4h4v2H6v4H4V4zm16 0h-4v2h2v4h2V4zM4 20h4v-2H6v-4H4v6zm16 0h-4v-2h2v-4h2v6z"/></svg>'
        } else {
            this.element.classList.remove('maximized')
            if (this.maxBtn) this.maxBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M4 4h16v16H4V4zm2 2v12h12V6H6z"/></svg>'
        }
    }

    closeAll() {
        const kids = [...this.children].filter(c => c.config.closeable !== false)
        for (const child of kids) {
            if (child.destroy() === false) break
        }
        if (this.children.length === 0) {
            this.layoutManager._cleanupEmptyStack(this)
        }
    }

    toConfig() {
        const res = super.toConfig()
        res.activeChildIndex = this.activeChildIndex
        if (this.tabPosition !== 'top') {
            res.tabPosition = this.tabPosition
        }
        if (this.isMinimized) {
            res.minimized = true
        }
        if (this.isMaximized) {
            res.isMaximized = true
        }
        if (!this.displayMinimizeButton) res.displayMinimizeButton = false
        if (!this.displayMaximizeButton) res.displayMaximizeButton = false
        if (!this.displayCloseButton) res.displayCloseButton = false
        if (!this.displayPopoutButton) res.displayPopoutButton = false
        if (this.preventEmptyClosure) res.preventEmptyClosure = true
        res.content = this.children.map(c => c.toConfig())
        return res
    }
}
