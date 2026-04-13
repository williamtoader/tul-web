// --- Utility Functions ---
class Utils {
    static createElement(tag, className, parent) {
        const el = document.createElement(tag)
        if (className) el.className = className
        if (parent) parent.appendChild(el)
        return el
    }

    static generateId() {
        return Math.random().toString(36).substr(2, 9)
    }

    static getRelativePos(evt, elem) {
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

    static parseSize(size) {
        if (typeof size === 'number') return { value: size, unit: 'weight' };
        if (typeof size !== 'string') return { value: 0, unit: 'weight' };
        const match = size.match(/^([\d.]+)([a-z%]*)$/);
        if (!match) {
            const val = parseFloat(size);
            return isNaN(val) ? { value: 0, unit: 'weight' } : { value: val, unit: 'px' };
        }
        return { value: parseFloat(match[1]), unit: match[2] || 'px' };
    }

    static resolveToPixels(size, totalPixels) {
        if (typeof size === 'number') return size;
        const parsed = Utils.parseSize(size);
        if (parsed.unit === 'px') return parsed.value;
        if (parsed.unit === '%') return (parsed.value / 100) * totalPixels;
        if (parsed.unit === 'weight') return (parsed.value / 100) * totalPixels; // Optional but consistent
        return parsed.value;
    }
}

// --- Drag & Drop Manager Singleton ---
// --- Drag & Drop Manager ---
class DragManager {
    constructor(layoutManager) {
        this.isDragging = false
        this.dragItem = null
        this.proxy = null
        this.indicator = null
        this.layoutManager = layoutManager
        this.sourceType = null
        this.sourceStack = null

        this.isPendingDrag = false
        this.pendingStartPos = null
        this.pendingArgs = null

        this.currentDropZone = null

        this.init()
    }

    init() {
        this.handleMouseMove = this.handleMouseMove.bind(this)
        this.handleMouseUp = this.handleMouseUp.bind(this)
        this.handlePendingMove = this.handlePendingMove.bind(this)
        this.handlePendingUp = this.handlePendingUp.bind(this)

        // Touch bindings
        this.handleTouchMove = (e) => { this.handleMouseMove(e); if (this.isDragging) e.preventDefault(); }
        this.handleTouchEnd = (e) => this.handleMouseUp(e)
        this.handlePendingTouchMove = (e) => this.handlePendingMove(e)
        this.handlePendingTouchEnd = (e) => this.handlePendingUp(e)

        // Create indicator element
        this.indicator = Utils.createElement('div', 'tulweb-drop-indicator', document.body)
        this.indicator.style.display = 'none'
        this.indicator.setAttribute('role', 'status')
        this.indicator.setAttribute('aria-live', 'polite')

        // Create tab drop indicator element
        this.tabIndicator = Utils.createElement('div', 'tulweb-tab-drop-indicator', document.body)
        this.tabIndicator.style.display = 'none'
        this.tabIndicator.setAttribute('role', 'status')
        this.tabIndicator.setAttribute('aria-live', 'polite')
    }

    destroy() {
        if (this.indicator && this.indicator.parentElement) {
            this.indicator.parentElement.removeChild(this.indicator)
        }
        if (this.tabIndicator && this.tabIndicator.parentElement) {
            this.tabIndicator.parentElement.removeChild(this.tabIndicator)
        }
        this.layoutManager = null
    }

    pendDrag(evt, itemConfig, type, sourceStack, title) {
        this.isPendingDrag = true
        const isTouch = evt.touches && evt.touches.length > 0
        const clientX = isTouch ? evt.touches[0].clientX : evt.clientX
        const clientY = isTouch ? evt.touches[0].clientY : evt.clientY

        this.pendingStartPos = { x: clientX, y: clientY }
        this.pendingArgs = { itemConfig, type, sourceStack, title }

        if (isTouch) {
            document.addEventListener('touchmove', this.handlePendingTouchMove, { passive: false })
            document.addEventListener('touchend', this.handlePendingTouchEnd)
        } else {
            document.addEventListener('mousemove', this.handlePendingMove)
            document.addEventListener('mouseup', this.handlePendingUp)
        }
    }

    handlePendingMove(evt) {
        if (!this.isPendingDrag) return
        const isTouch = evt.touches && evt.touches.length > 0
        const clientX = isTouch ? evt.touches[0].clientX : evt.clientX
        const clientY = isTouch ? evt.touches[0].clientY : evt.clientY

        const dx = clientX - this.pendingStartPos.x
        const dy = clientY - this.pendingStartPos.y
        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
            this.isPendingDrag = false
            document.removeEventListener('mousemove', this.handlePendingMove)
            document.removeEventListener('mouseup', this.handlePendingUp)
            document.removeEventListener('touchmove', this.handlePendingTouchMove)
            document.removeEventListener('touchend', this.handlePendingTouchEnd)

            const a = this.pendingArgs
            this.startDrag(evt, a.itemConfig, a.type, a.sourceStack, a.title)
        }
    }

    handlePendingUp(evt) {
        this.isPendingDrag = false
        document.removeEventListener('mousemove', this.handlePendingMove)
        document.removeEventListener('mouseup', this.handlePendingUp)
        document.removeEventListener('touchmove', this.handlePendingTouchMove)
        document.removeEventListener('touchend', this.handlePendingTouchEnd)
    }

    startDrag(evt, itemConfig, type, sourceStack, title) {
        this.isDragging = true
        this.dragItem = itemConfig
        this.sourceType = type
        this.sourceStack = sourceStack

        // Create UI proxy
        this.proxy = Utils.createElement('div', 'tulweb-drag-proxy', document.body)
        this.proxy.textContent = title || itemConfig.title || 'Component'
        this.updateProxyPos(evt)

        if (evt.touches) {
            document.addEventListener('touchmove', this.handleTouchMove, { passive: false })
            document.addEventListener('touchend', this.handleTouchEnd)
        } else {
            document.addEventListener('mousemove', this.handleMouseMove)
            document.addEventListener('mouseup', this.handleMouseUp)
        }

        // If dragging from a stack, make it look active but keep it in the DOM until drop
        if (sourceStack) {
            // Visual feedback only for now
        }
    }

    updateProxyPos(evt) {
        if (this.proxy) {
            const isTouch = evt.touches && evt.touches.length > 0
            const clientX = isTouch ? evt.touches[0].clientX : evt.clientX
            const clientY = isTouch ? evt.touches[0].clientY : evt.clientY
            this.proxy.style.left = (clientX + 10) + 'px'
            this.proxy.style.top = (clientY + 10) + 'px'
        }
    }

    handleMouseMove(evt) {
        if (!this.isDragging) return
        evt.preventDefault()
        this.updateProxyPos(evt)
        this.findDropZone(evt)
    }

    handleMouseUp(evt) {
        if (!this.isDragging) return
        this.isDragging = false

        document.removeEventListener('mousemove', this.handleMouseMove)
        document.removeEventListener('mouseup', this.handleMouseUp)
        document.removeEventListener('touchmove', this.handleTouchMove)
        document.removeEventListener('touchend', this.handleTouchEnd)

        if (this.proxy) {
            document.body.removeChild(this.proxy)
            this.proxy = null
        }

        if (this.indicator) {
            this.indicator.style.display = 'none'
            this.indicator.classList.remove('visible')
        }

        if (this.tabIndicator) {
            this.tabIndicator.style.display = 'none'
            this.tabIndicator.classList.remove('visible')
        }

        if (this.currentDropZone) {
            this.executeDrop()
        } else if (this.sourceType === 'tab' && this.sourceStack && this.dragItem) {
            // Dragged outside, maybe remove or just cancel? Currently cancel.
        }

        this.currentDropZone = null
        this.dragItem = null
        this.sourceStack = null
    }

    findDropZone(evt) {
        const isTouch = evt.touches && evt.touches.length > 0
        const clientX = isTouch ? evt.touches[0].clientX : evt.clientX
        const clientY = isTouch ? evt.touches[0].clientY : evt.clientY

        // Find what we are over. The proxy has pointer-events: none, so this gets the actual element
        const el = document.elementFromPoint(clientX, clientY)
        if (!el) return this.hideIndicator()

        // Find the closest Layout Item
        let targetItem = null
        let currentEl = el
        while (currentEl && currentEl !== document.body) {
            if (currentEl.tulwebItem) {
                targetItem = currentEl.tulwebItem
                break
            }
            currentEl = currentEl.parentElement
        }

        if (!targetItem) {
            // If it's a drag over the root and root is empty, allow dropping
            if (this.layoutManager.rootElement.contains(el) && !this.layoutManager.root) {
                this.currentDropZone = { target: 'root', edge: 'center' }
                this.showIndicator(this.layoutManager.rootElement, 'center')
                return
            }
            return this.hideIndicator()
        }

        // If hovering over a component inside a stack, we want to target the stack
        if (targetItem instanceof ComponentItem && targetItem.parent instanceof StackItem) {
            targetItem = targetItem.parent
        }

        // Don't dropping on itself if it's the only tab
        if (targetItem === this.sourceStack && targetItem.children.length === 1 && this.sourceType === 'tab') {
            return this.hideIndicator() // Can't drop on self if only child
        }

        // Determine zone
        const pos = Utils.getRelativePos(evt, targetItem.element)

        let edge = 'center'
        if (targetItem instanceof StackItem) {
            const isHeader = targetItem.headerEl.contains(el)
            if (isHeader) {
                edge = 'tab_insert'

                const tabs = Array.from(targetItem.tabsEl.querySelectorAll('.tulweb-tab'))
                let dropIdx = tabs.length
                let dropLeft = 0
                let dropTop = 0
                let dropHeight = 0
                let dropWidth = 0

                const isVertical = targetItem.tabPosition === 'left' || targetItem.tabPosition === 'right'

                if (tabs.length > 0) {
                    for (let i = 0; i < tabs.length; i++) {
                        const tab = tabs[i]
                        const rect = tab.getBoundingClientRect()
                        if (tab.style.display === 'none') continue

                        if (isVertical) {
                            if (clientY < rect.top + rect.height / 2) {
                                dropIdx = i
                                dropLeft = rect.left
                                dropTop = rect.top
                                dropWidth = rect.width
                                dropHeight = 2
                                break
                            }
                        } else {
                            if (clientX < rect.left + rect.width / 2) {
                                dropIdx = i
                                dropLeft = rect.left
                                dropTop = rect.top
                                dropWidth = 2
                                dropHeight = rect.height
                                break
                            }
                        }
                    }

                    if (dropIdx === tabs.length) {
                        let lastVisible = null
                        for (let i = tabs.length - 1; i >= 0; i--) {
                            if (tabs[i].style.display !== 'none') {
                                lastVisible = tabs[i]
                                dropIdx = i + 1
                                break
                            }
                        }
                        if (lastVisible) {
                            const rect = lastVisible.getBoundingClientRect()
                            if (isVertical) {
                                dropLeft = rect.left
                                dropTop = rect.bottom
                                dropWidth = rect.width
                                dropHeight = 2
                            } else {
                                dropLeft = rect.right
                                dropTop = rect.top
                                dropWidth = 2
                                dropHeight = rect.height
                            }
                        } else {
                            // Fallback if all hidden
                            const rect = targetItem.tabsEl.getBoundingClientRect()
                            if (isVertical) {
                                dropLeft = rect.left + 4
                                dropTop = rect.top + 8
                                dropWidth = rect.width - 8
                                dropHeight = 2
                            } else {
                                dropLeft = rect.left + 8
                                dropTop = rect.top + 4
                                dropWidth = 2
                                dropHeight = rect.height - 8
                            }
                        }
                    }
                } else {
                    const rect = targetItem.tabsEl.getBoundingClientRect()
                    if (isVertical) {
                        dropLeft = rect.left + 4
                        dropTop = rect.top + 8
                        dropWidth = rect.width - 8
                        dropHeight = 2
                    } else {
                        dropLeft = rect.left + 8
                        dropTop = rect.top + 4
                        dropWidth = 2
                        dropHeight = rect.height - 8
                    }
                }

                this.currentDropZone = { target: targetItem, edge: edge, insertIndex: dropIdx }
                this.showTabIndicator(dropLeft, dropTop, dropWidth, dropHeight)
                return

            } else {
                // Check center 25% box for stacking
                const cx = pos.w / 2
                const cy = pos.h / 2
                if (Math.abs(pos.x - cx) < pos.w * 0.25 && Math.abs(pos.y - cy) < pos.h * 0.25) {
                    edge = 'center'
                } else {
                    // Quadrants
                    const y1 = pos.x * (pos.h / pos.w)
                    const y2 = pos.h - pos.x * (pos.h / pos.w)

                    if (pos.y < y1 && pos.y < y2) edge = 'top'
                    else if (pos.y > y1 && pos.y > y2) edge = 'bottom'
                    else if (pos.y > y1 && pos.y < y2) edge = 'left'
                    else if (pos.y < y1 && pos.y > y2) edge = 'right'
                }
            }
        } else {
            return this.hideIndicator()
        }

        this.currentDropZone = { target: targetItem, edge: edge }
        this.showIndicator(targetItem.element, edge)
    }

    showTabIndicator(l, t, w, h) {
        this.indicator.style.display = 'none'
        this.indicator.classList.remove('visible')

        this.tabIndicator.style.top = t + 'px'
        this.tabIndicator.style.left = l + 'px'
        this.tabIndicator.style.width = w + 'px'
        this.tabIndicator.style.height = h + 'px'
        this.tabIndicator.style.display = 'block'

        setTimeout(() => this.tabIndicator.classList.add('visible'), 10)
    }

    showIndicator(element, edge) {
        if (this.tabIndicator) {
            this.tabIndicator.style.display = 'none'
            this.tabIndicator.classList.remove('visible')
        }

        const rect = element.getBoundingClientRect()
        let t = rect.top, l = rect.left, w = rect.width, h = rect.height

        if (edge === 'top') h = h / 2
        if (edge === 'bottom') { t = rect.bottom - (h / 2); h = h / 2; }
        if (edge === 'left') w = w / 2
        if (edge === 'right') { l = rect.right - (w / 2); w = w / 2; }

        this.indicator.style.top = t + 'px'
        this.indicator.style.left = l + 'px'
        this.indicator.style.width = w + 'px'
        this.indicator.style.height = h + 'px'
        this.indicator.style.display = 'block'

        // Small delay for CSS transition
        setTimeout(() => this.indicator.classList.add('visible'), 10)
    }

    hideIndicator() {
        this.indicator.style.display = 'none'
        this.indicator.classList.remove('visible')
        if (this.tabIndicator) {
            this.tabIndicator.style.display = 'none'
            this.tabIndicator.classList.remove('visible')
        }
        this.currentDropZone = null
    }

    executeDrop() {
        const { target, edge } = this.currentDropZone
        let newItemConfig = this.dragItem

        let adjustIndex = false
        // If it's a dragged tab, we need to remove it from the old stack first
        if (this.sourceType === 'tab') {
            const oldComp = this.sourceStack.children.find(c => c.config === newItemConfig)
            if (oldComp) {
                const oldIndex = this.sourceStack.children.indexOf(oldComp)
                if (this.sourceStack === target && edge === 'tab_insert' && oldIndex < this.currentDropZone.insertIndex) {
                    adjustIndex = true
                }
                this.sourceStack.removeChild(oldComp)
                // If source stack is empty, it needs to be cleaned up
                if (this.sourceStack.children.length === 0) {
                    this.layoutManager._cleanupEmptyStack(this.sourceStack)
                }
            }
        } else {
            // It's a new external config. We need to create it.
            // It's already just a config object.
            // Deep copy if needed, but assuming unique factory calls
        }

        let newComp

        if (target === 'root') {
            const row = new RowItem({ type: 'row' }, this.layoutManager)
            const newStack = new StackItem({ type: 'stack', tabPosition: newItemConfig.tabPosition }, this.layoutManager)
            newComp = new ComponentItem(newItemConfig, this.layoutManager)
            newStack.addChild(newComp)
            row.addChild(newStack)
            this.layoutManager.root = row
            this.layoutManager.rootElement.innerHTML = ''
            this.layoutManager.rootElement.appendChild(row.element)
            this.layoutManager.updateLayout()
        } else if (edge === 'center') {
            // Add tab to existing stack
            newComp = new ComponentItem(newItemConfig, this.layoutManager)
            target.addChild(newComp)
        } else if (edge === 'tab_insert') {
            newComp = new ComponentItem(newItemConfig, this.layoutManager)
            let idx = this.currentDropZone.insertIndex
            if (adjustIndex) idx--
            target.addChild(newComp, idx)
        } else {
            // Split
            const isHoriz = (edge === 'left' || edge === 'right')
            const isFirst = (edge === 'left' || edge === 'top')

            // We need to insert a new Row or Column conceptually, or replace target in its parent
            // For simplicity: target is a Stack. Its parent is Row or Col.
            const parent = target.parent
            const newStack = new StackItem({ type: 'stack', tabPosition: newItemConfig.tabPosition }, this.layoutManager)
            newComp = new ComponentItem(newItemConfig, this.layoutManager)
            newStack.addChild(newComp)

            if (parent instanceof RowItem && isHoriz) {
                // Split row
                const index = parent.children.indexOf(target)
                const targetSize = target.size ?? 50

                if (typeof targetSize === 'number') {
                    target.size = targetSize / 2
                    newStack.size = targetSize / 2
                } else {
                    const parsed = Utils.parseSize(targetSize)
                    target.size = (parsed.value / 2) + parsed.unit
                    newStack.size = (parsed.value / 2) + parsed.unit
                }
                parent.addChild(newStack, isFirst ? index : index + 1)
            }
            else if (parent instanceof ColumnItem && !isHoriz) {
                // Split column
                const index = parent.children.indexOf(target)
                const targetSize = target.size ?? 50

                if (typeof targetSize === 'number') {
                    target.size = targetSize / 2
                    newStack.size = targetSize / 2
                } else {
                    const parsed = Utils.parseSize(targetSize)
                    target.size = (parsed.value / 2) + parsed.unit
                    newStack.size = (parsed.value / 2) + parsed.unit
                }
                parent.addChild(newStack, isFirst ? index : index + 1)
            }
            else {
                // Need to wrap target in a new Row/Col
                const wrapperType = isHoriz ? RowItem : ColumnItem
                const wrapper = new wrapperType({ type: isHoriz ? 'row' : 'column' }, this.layoutManager)

                const pIndex = parent.children.indexOf(target)
                wrapper.size = target.size
                target.size = 50
                newStack.size = 50

                // Swap target with wrapper in parent
                parent.replaceChild(target, wrapper, pIndex)

                wrapper.addChild(isFirst ? newStack : target)
                wrapper.addChild(isFirst ? target : newStack)
            }

            // Triggers resize
            this.layoutManager.updateLayout()
        }

        if (this.sourceType === 'tab' && newComp) {
            newComp.emit('move')
        }
    }
}

// DragManager is now instantiated per LayoutManager.


// --- Drag Source ---
class DragSource {
    constructor(element, itemConfig, layoutManager) {
        this.element = element
        this.itemConfig = itemConfig
        this.layoutManager = layoutManager
        this.element.classList.add('tulweb-drag-source')

        const startHandler = (e) => {
            // Clone config so we don't mutate original
            const configCopy = JSON.parse(JSON.stringify(this.itemConfig))
            this.layoutManager.dragManager.pendDrag(e, configCopy, 'external', null, this.itemConfig.title)
        }

        this.element.addEventListener('mousedown', startHandler)
        this.element.addEventListener('touchstart', startHandler, { passive: true })
    }
}


// --- Splitter ---
class Splitter {
    constructor(isVertical, prevItem, nextItem, parentContainer) {
        this.isVertical = isVertical // True for row (vertical line), false for column (horizontal line)
        this.prevItem = prevItem
        this.nextItem = nextItem
        this.parentContainer = parentContainer

        this.element = Utils.createElement('div', 'tulweb-splitter', parentContainer)

        this.isDragging = false
        this._onMouseDown = this._onMouseDown.bind(this)
        this._onMouseMove = this._onMouseMove.bind(this)
        this._onMouseUp = this._onMouseUp.bind(this)
        this._onDblClick = this._onDblClick.bind(this)

        this.element.addEventListener('mousedown', this._onMouseDown)
        this.element.addEventListener('touchstart', this._onMouseDown, { passive: false })
        this.element.addEventListener('dblclick', this._onDblClick)

        // Accessibility for splitters
        this.element.setAttribute('role', 'separator')
        this.element.setAttribute('tabindex', '0')
        this.element.setAttribute('aria-orientation', isVertical ? 'vertical' : 'horizontal')
        this.element.addEventListener('keydown', (e) => {
            const step = e.shiftKey ? 5 : 1
            let diff = 0
            if (isVertical) {
                if (e.key === 'ArrowLeft') diff = -step
                if (e.key === 'ArrowRight') diff = step
            } else {
                if (e.key === 'ArrowUp') diff = -step
                if (e.key === 'ArrowDown') diff = step
            }

            if (diff !== 0) {
                e.preventDefault()
                this._moveSplitter(diff)
            }
        })
    }

    _moveSplitter(diffPx) {
        const minPrevPx = this.isVertical ? (this.prevItem.getMinWidthPx() || 40) : (this.prevItem.getMinHeightPx() || 40)
        const minNextPx = this.isVertical ? (this.nextItem.getMinWidthPx() || 40) : (this.nextItem.getMinHeightPx() || 40)

        // Calculate weight ratio if needed
        const parentRect = this.parentContainer.getBoundingClientRect()
        const totalSizePx = this.isVertical ? parentRect.width : parentRect.height
        const pixelsPerPercent = totalSizePx / 100

        const startPrevSize = this.prevItem.size ?? 50
        const startNextSize = this.nextItem.size ?? 50
        const prevType = typeof startPrevSize === 'number' ? 'weight' : 'fixed'
        const nextType = typeof startNextSize === 'number' ? 'weight' : 'fixed'

        if (prevType === 'weight' && nextType === 'weight') {
            const diffPct = diffPx / pixelsPerPercent
            let newPrev = startPrevSize + diffPct
            let newNext = startNextSize - diffPct
            // Apply bounds (simplified for keyboard)
            this.prevItem.size = newPrev
            this.nextItem.size = newNext
        } else {
            // Simplified fixed resize for keyboard
            if (prevType === 'fixed') {
                const parsed = Utils.parseSize(startPrevSize)
                this.prevItem.size = (parsed.value + diffPx) + parsed.unit
            }
            if (nextType === 'fixed') {
                const parsed = Utils.parseSize(startNextSize)
                this.nextItem.size = (parsed.value - diffPx) + parsed.unit
            }
        }
        this.prevItem.updateFlex()
        this.nextItem.updateFlex()
    }

    _onDblClick(e) {
        e.preventDefault()
        this.prevItem.size = 50
        this.nextItem.size = 50
        if (this.parentContainer.tulwebItem) {
            this.parentContainer.tulwebItem.updateLayout()
        } else {
            this.prevItem.updateFlex()
            this.nextItem.updateFlex()
        }
    }

    _onMouseDown(e) {
        if (e.type !== 'touchstart') e.preventDefault()

        const isTouch = e.touches && e.touches.length > 0
        const clientX = isTouch ? e.touches[0].clientX : e.clientX
        const clientY = isTouch ? e.touches[0].clientY : e.clientY

        this.isDragging = true
        this.element.classList.add('active')

        // Calculate base metrics
        this.startPos = this.isVertical ? clientX : clientY
        this.startPrevSize = this.prevItem.size ?? 50
        this.startNextSize = this.nextItem.size ?? 50

        this.prevType = typeof this.startPrevSize === 'number' ? 'weight' : 'fixed'
        this.nextType = typeof this.startNextSize === 'number' ? 'weight' : 'fixed'

        // Get pixels to percentage ratio for weights
        const parentRect = this.parentContainer.getBoundingClientRect()
        this.pixelsPerPercent = (this.isVertical ? parentRect.width : parentRect.height) / 100

        document.addEventListener('mousemove', this._onMouseMove)
        document.addEventListener('mouseup', this._onMouseUp)
        document.addEventListener('touchmove', this._onMouseMove, { passive: false })
        document.addEventListener('touchend', this._onMouseUp)
    }

    _onMouseMove(e) {
        if (!this.isDragging) return
        const isTouch = e.touches && e.touches.length > 0
        const clientX = isTouch ? e.touches[0].clientX : e.clientX
        const clientY = isTouch ? e.touches[0].clientY : e.clientY

        if (isTouch) e.preventDefault() // Prevent scrolling during resize

        const currentPos = this.isVertical ? clientX : clientY
        const diffPx = currentPos - this.startPos

        const minPrevPx = this.isVertical ? (this.prevItem.getMinWidthPx() || 40) : (this.prevItem.getMinHeightPx() || 40)
        const minNextPx = this.isVertical ? (this.nextItem.getMinWidthPx() || 40) : (this.nextItem.getMinHeightPx() || 40)

        if (this.prevType === 'weight' && this.nextType === 'weight') {
            const diffPct = diffPx / this.pixelsPerPercent
            let newPrev = this.startPrevSize + diffPct
            let newNext = this.startNextSize - diffPct

            const totalWeight = this.startPrevSize + this.startNextSize
            const minPrevWeight = minPrevPx / this.pixelsPerPercent
            const minNextWeight = minNextPx / this.pixelsPerPercent

            if (newPrev < minPrevWeight) {
                newPrev = minPrevWeight
                newNext = totalWeight - minPrevWeight
            } else if (newNext < minNextWeight) {
                newNext = minNextWeight
                newPrev = totalWeight - minNextWeight
            }

            this.prevItem.size = newPrev
            this.nextItem.size = newNext
        } else {
            // Mixed or Both Fixed
            if (this.prevType === 'fixed') {
                const parsed = Utils.parseSize(this.startPrevSize)
                if (parsed.unit === 'px' || parsed.unit === '%') {
                    let newVal = parsed.value + (parsed.unit === '%' ? diffPx / this.pixelsPerPercent : diffPx)
                    const minVal = parsed.unit === '%' ? minPrevPx / this.pixelsPerPercent : minPrevPx
                    if (newVal < minVal) newVal = minVal
                    this.prevItem.size = newVal + parsed.unit
                } else {
                    // Fallback for other units: convert to px once dragged
                    const currentPx = this.isVertical ? this.prevItem.element.offsetWidth : this.prevItem.element.offsetHeight
                    let newVal = currentPx + diffPx
                    if (newVal < minPrevPx) newVal = minPrevPx
                    this.prevItem.size = newVal + 'px'
                    this.startPrevSize = this.prevItem.size // Update base for next move
                    this.startPos = currentPos
                }
            }
            if (this.nextType === 'fixed') {
                const parsed = Utils.parseSize(this.startNextSize)
                if (parsed.unit === 'px' || parsed.unit === '%') {
                    let newVal = parsed.value - (parsed.unit === '%' ? diffPx / this.pixelsPerPercent : diffPx)
                    const minVal = parsed.unit === '%' ? minNextPx / this.pixelsPerPercent : minNextPx
                    if (newVal < minVal) newVal = minVal
                    this.nextItem.size = newVal + parsed.unit
                } else {
                    const currentPx = this.isVertical ? this.nextItem.element.offsetWidth : this.nextItem.element.offsetHeight
                    let newVal = currentPx - diffPx
                    if (newVal < minNextPx) newVal = minNextPx
                    this.nextItem.size = newVal + 'px'
                    this.startNextSize = this.nextItem.size
                    this.startPos = currentPos
                }
            }
        }

        // Re-render
        this.prevItem.updateFlex()
        this.nextItem.updateFlex()
    }

    _onMouseUp(e) {
        if (this.isDragging) {
            this.isDragging = false
            this.element.classList.remove('active')
            document.removeEventListener('mousemove', this._onMouseMove)
            document.removeEventListener('mouseup', this._onMouseUp)
            document.removeEventListener('touchmove', this._onMouseMove)
            document.removeEventListener('touchend', this._onMouseUp)
        }
    }

    destroy() {
        this.element.removeEventListener('mousedown', this._onMouseDown)
        this.element.removeEventListener('dblclick', this._onDblClick)
        if (this.element.parentElement) {
            this.element.parentElement.removeChild(this.element)
        }
    }
}


class EventEmitter {
    constructor() {
        this._listeners = {}
    }
    on(event, callback) {
        if (!this._listeners[event]) this._listeners[event] = []
        this._listeners[event].push(callback)
    }
    off(event, callback) {
        if (!this._listeners[event]) return
        this._listeners[event] = this._listeners[event].filter(cb => cb !== callback)
    }
    once(event, callback) {
        const wrapper = (...args) => {
            this.off(event, wrapper)
            callback(...args)
        }
        this.on(event, wrapper)
    }
    emit(event, ...args) {
        let result = true
        if (this._listeners[event]) {
            for (const cb of this._listeners[event]) {
                if (cb(...args) === false) result = false
            }
        }
        return result
    }
}

// --- Core Layout Classes ---

class ContentItem extends EventEmitter {
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


class ComponentItem extends ContentItem {
    constructor(config, layoutManager) {
        super(config, layoutManager)
        this.type = 'component'
        this.isCloseable = config.closeable !== false
    }

    createDOM() {
        this.element = document.createElement('div')
        this.element.className = 'tulweb-component'
        this.element.setAttribute('data-component', this.config.componentName)
        if (!this.isCloseable) this.element.setAttribute('data-closeable', 'false')
        this.layoutManager.emit('componentCreated', this)
    }

    renderAppContent() {
        // Call the registered component factory or class
        const ComponentClassOrFactory = this.layoutManager.componentFactories[this.config.componentName]
        if (ComponentClassOrFactory) {
            this.element.innerHTML = '' // Clear
            try {
                const isClass = typeof ComponentClassOrFactory === 'function' &&
                    (ComponentClassOrFactory.isClass || (ComponentClassOrFactory.prototype && ComponentClassOrFactory.prototype.constructor.toString().includes('class')))

                let contentNode
                if (isClass) {
                    const instance = new ComponentClassOrFactory(this.config.componentState, this)
                    this.instance = instance
                    // Convention: class should have an .element property or be a DOM node itself
                    contentNode = instance.element || (typeof instance.render === 'function' ? instance.render() : instance)
                } else {
                    contentNode = ComponentClassOrFactory(this.config.componentState, this)
                }

                if (contentNode instanceof Node) {
                    this.element.appendChild(contentNode)
                }
                this.emit('init')
            } catch (err) {
                this.element.innerHTML = `<div style="color:red; padding:10px;">Error rendering component: ${err.message}</div>`
                console.error("Component Render Error:", err)
            }
        } else {
            this.element.innerHTML = `<div style="color:red; padding:10px;">Unknown component: ${this.config.componentName}</div>`
        }
    }

    setState(state) {
        this.config.componentState = Object.assign({}, this.config.componentState, state)
        this.layoutManager.emit('stateChanged')
    }

    getState() {
        return this.config.componentState
    }

    toConfig() {
        const res = super.toConfig()
        res.title = this.config.title
        res.componentName = this.config.componentName
        res.componentState = this.config.componentState
        if (this.config.closeable === false) res.closeable = false
        return res
    }

    destroy() {
        if (this.instance && typeof this.instance.destroy === 'function') {
            this.instance.destroy()
        }
        this.instance = null
        super.destroy()
    }
}


class StackItem extends ContentItem {
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
                this.popoutBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/><path d="M5 5v14h14v-7h-2v5H7V7h5V5H5z"/></svg>'
                this.popoutBtn.title = 'Pop out to new window'
                this.popoutBtn.addEventListener('click', (e) => {
                    e.stopPropagation()
                    this.layoutManager.popoutStack(this)
                })
            }

            if (showMin) {
                this.minBtn = Utils.createElement('div', 'tulweb-control', this.controlsEl)
                this.minBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 19h12v2H6z"/></svg>'
                this.minBtn.addEventListener('click', (e) => {
                    e.stopPropagation()
                    this.toggleMinimize()
                })
            }

            // Maximize button
            if (showMax) {
                this.maxBtn = Utils.createElement('div', 'tulweb-control', this.controlsEl)
                this.maxBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M4 4h16v16H4V4zm2 2v12h12V6H6z"/></svg>'
                this.maxBtn.addEventListener('click', () => this.toggleMaximize())
            }

            // Close Stack Button
            if (showClose) {
                this.closeBtn = Utils.createElement('div', 'tulweb-control', this.controlsEl)
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

    renderTabs() {
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
        if (!this.tabsEl) return

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

        // Keep all tabs in dropdown for convenience jumping
        this.hiddenTabs = this.children
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
            this.renderTabs()
            this.showActiveChild()

            if (hadFocus || oldIndex !== index) {
                setTimeout(() => {
                    const tabs = this.tabsEl.querySelectorAll('.tulweb-tab')
                    if (tabs[this.activeChildIndex]) {
                        tabs[this.activeChildIndex].focus()
                    }
                }, 0)
            }
            // Ensure we scroll only after the browser has laid out the new content
            setTimeout(() => {
                this.scrollTabIntoView(index)
            }, 50)
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


class ContainerItem extends ContentItem {
    constructor(config, layoutManager) {
        super(config, layoutManager)
        this.splitters = []
    }

    destroy() {
        // Must clone array to avoid skipping indices as children remove themselves
        const kids = [...this.children]
        for (const child of kids) {
            if (child.destroy() === false) return false
        }
        this.splitters.forEach(s => s.destroy())
        this.splitters = []
        return super.destroy()
    }

    updateFlex() {
        super.updateFlex()
        this.children.forEach(child => {
            if (child.updateFlex) {
                child.updateFlex()
            }
        })
    }

    toConfig() {
        const res = super.toConfig()
        res.content = this.children.map(c => c.toConfig())
        return res
    }

    createDOM() {
        this.element = document.createElement('div')
        this.element.className = this.config.type === 'row' ? 'tulweb-row' : 'tulweb-column'
    }

    _appendDOMChild(child, index) {
        // Because of splitters, DOM insertion is tricky. Better to just full re-render.
        // Handled in updateLayout.
    }

    _removeDOMChild(child) {
        // Handled in updateLayout
    }

    _replaceDOMChild(oldc, newc) {
        // Handled in updateLayout
    }

    updateLayout() {
        // Ensure weights (numbers) sum to 100 roughly
        if (this.children.length > 0) {
            const weightChildren = this.children.filter(c => typeof c.size === 'number');
            if (weightChildren.length > 0) {
                let totalWeight = weightChildren.reduce((sum, c) => sum + (c.size || 0), 0);
                if (totalWeight === 0) {
                    const p = 100 / weightChildren.length;
                    weightChildren.forEach(c => c.size = p);
                } else if (Math.abs(totalWeight - 100) > 1) {
                    weightChildren.forEach(c => c.size = (c.size / totalWeight) * 100);
                }
            }
        }

        // Rebuild DOM and Splitters
        this.element.innerHTML = ''
        this.splitters.forEach(s => s.destroy())
        this.splitters = []

        const isVertical = this.config.type === 'row'

        this.children.forEach((child, index) => {
            this.element.appendChild(child.element)
            child.updateLayout()

            if (index < this.children.length - 1) {
                const splitter = new Splitter(isVertical, child, this.children[index + 1], this.element)
                this.splitters.push(splitter)
            }
        })

        this.updateFlex()
    }
}

class RowItem extends ContainerItem { }
class ColumnItem extends ContainerItem { }


// --- UI Helper Classes ---

class Toast {
    constructor(container, message, type = 'info') {
        this.element = Utils.createElement('div', 'tulweb-toast', container)
        if (type === 'error') this.element.classList.add('error')

        const icon = type === 'error' ?
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>' :
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>'

        this.element.innerHTML = icon + '<span>' + message + '</span>'

        setTimeout(() => {
            this.element.classList.add('hiding')
            setTimeout(() => this.destroy(), 300)
        }, 3000)
    }

    destroy() {
        if (this.element && this.element.parentElement) {
            this.element.parentElement.removeChild(this.element)
        }
    }
}

class ContextMenu {
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


// --- Popout Manager ---

class PopoutManager {
    constructor(layoutManager) {
        this.layoutManager = layoutManager
        this.openPopouts = new Map() // popoutId -> { window, channel, stackConfig }
        this._channelName = 'tulweb-popout-' + Utils.generateId()

        // Master channel listens for messages from child windows
        if (typeof BroadcastChannel !== 'undefined') {
            this.masterChannel = new BroadcastChannel(this._channelName)
            this.masterChannel.onmessage = (e) => this._handleChildMessage(e.data)
        }

        // Close all popouts when parent unloads
        this._onBeforeUnload = () => this.closeAll()
        window.addEventListener('beforeunload', this._onBeforeUnload)
    }

    /**
     * Pop a stack out into a new browser window.
     * The stack's config (with all children) is serialized, sent to the child window,
     * which recreates it using the same registered component factories.
     */
    popout(stack) {
        if (!stack || stack.children.length === 0) return null

        const popoutId = 'popout-' + Utils.generateId()
        const stackConfig = stack.toConfig()

        // Calculate window dimensions from the stack's current size
        const rect = stack.element.getBoundingClientRect()
        const width = Math.max(400, Math.round(rect.width))
        let height = Math.max(300, Math.round(rect.height))
        if (stack.isMinimized) height = 500
        const left = Math.round(window.screenX + rect.left)
        const top = Math.round(window.screenY + rect.top)

        // Build styles string from all <link> and <style> tags in parent
        const styles = this._collectStyles()
        const bodyClass = document.body.className || ''

        // Build the child window HTML
        const html = this._buildPopoutHTML(popoutId, stackConfig, styles, bodyClass)

        // Open the window
        const features = `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=no,status=no,toolbar=no,menubar=no,location=no`
        const childWindow = window.open('', popoutId, features)

        if (!childWindow) {
            this.layoutManager.showToast('Popup blocked. Please allow popups for this site.', 'error')
            return null
        }

        childWindow.document.open()
        childWindow.document.write(html)
        childWindow.document.close()

        // Store reference and location for re-integration
        const parent = stack.parent
        const index = parent ? parent.children.indexOf(stack) : 0
        const parentId = parent ? parent.id : null

        const entry = { 
            window: childWindow, 
            stackConfig, 
            popoutId,
            location: {
                parentId,
                index
            }
        }
        this.openPopouts.set(popoutId, entry)

        // Setup child window communication
        this._setupChildWindow(childWindow, popoutId, stackConfig)

        // Remove the stack from the parent layout
        // We remove each child component from the stack, then cleanup
        const parentStack = stack
        const childConfigs = stackConfig.content || []

        // Remove the stack from the parent tree
        if (stack.parent) {
            stack.parent.removeChild(stack)
            if (stack.parent && stack.parent.children && stack.parent.children.length === 0) {
                this.layoutManager._cleanupEmptyStack(stack.parent)
            }
        } else {
            // Stack was root
            this.layoutManager.rootElement.innerHTML = ''
            this.layoutManager.root = null
            this.layoutManager.renderEmptyState()
        }

        this.layoutManager.emit('popoutCreated', { popoutId, stackConfig })
        this.layoutManager.emit('stateChanged')

        // Monitor child window closure
        const intervalId = setInterval(() => {
            if (childWindow.closed) {
                clearInterval(intervalId)
                this._handlePopoutClosed(popoutId, stackConfig)
            }
        }, 500)

        entry.intervalId = intervalId

        return popoutId
    }

    _collectStyles() {
        const parts = []

        // Collect <link rel="stylesheet"> hrefs
        document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
            parts.push(`<link rel="stylesheet" href="${link.href}">`)
        })

        // Collect inline <style> tags
        document.querySelectorAll('style').forEach(style => {
            parts.push(`<style>${style.textContent}</style>`)
        })

        return parts.join('\n')
    }

    _buildPopoutHTML(popoutId, stackConfig, stylesHTML, bodyClass) {
        // We embed the entire tulweb.js module inline via import from the same origin.
        // The child window needs access to LayoutManager + component factories.
        // We use BroadcastChannel to pass factory registration instructions.

        // Use import.meta.url if available (wrapped in eval to avoid parser errors in non-ESM environments like Jest)
        let tulwebModulePath = '';
        try {
            tulwebModulePath = eval('import.meta.url');
        } catch (e) {}

        // Fallback 1: try to find the module path from script tags
        if (!tulwebModulePath) {
            const scriptEls = document.querySelectorAll('script');
            for (const s of scriptEls) {
                if (s.src && (s.src.includes('tulweb.js') || s.src.includes('bundle.js'))) {
                    tulwebModulePath = s.src;
                    break;
                }
            }
        }
        // Fallback 2: If we are in the demo, tries to guess the path relative to app.js
        if (!tulwebModulePath) {
            const appScript = document.querySelector('script[src*="app.js"]');
            if (appScript) {
                try {
                    // Try to guess based on standard project structure
                    const base = new URL(appScript.src, window.location.href).href;
                    if (base.includes('/demo/')) {
                        tulwebModulePath = new URL('../src/tulweb.js', base).href;
                    } else {
                        tulwebModulePath = new URL('src/tulweb.js', base).href;
                    }
                } catch (e) {}
            }
        }

        // Fallback 3: try common paths relative to current page
        if (!tulwebModulePath) {
            try {
                const base = new URL('.', window.location.href).href;
                if (base.includes('/demo/')) {
                    tulwebModulePath = new URL('../src/tulweb.js', base).href;
                } else {
                    tulwebModulePath = new URL('src/tulweb.js', base).href;
                }
            } catch (e) {}
        }

        // Serialize the component factory names so the child can request them
        const factoryNames = Object.keys(this.layoutManager.componentFactories)

        // Clone stack config and ensure it takes full space in child window
        const stackConfigForChild = JSON.parse(JSON.stringify(stackConfig))
        stackConfigForChild.size = 100
        stackConfigForChild.isPopoutChild = true
        stackConfigForChild.isMaximized = true
        stackConfigForChild.minimized = false

        // The child window layout config wraps the stack config in a minimal layout
        const childLayoutConfig = {
            settings: Object.assign({}, this.layoutManager.settings, {
                enablePopout: false, // No nesting of popouts
                hasHeaders: true
            }),
            content: [stackConfigForChild]
        }

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this._getPopoutTitle(stackConfig)}</title>
    ${stylesHTML}
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
        }
    </style>
</head>
<body class="${bodyClass}">
    <div id="tulweb-popout-root"></div>
    <script>
        // Store config and popout metadata for the initialization script
        window.__tulweb_popout__ = {
            popoutId: ${JSON.stringify(popoutId)},
            channelName: ${JSON.stringify(this._channelName)},
            layoutConfig: ${JSON.stringify(childLayoutConfig)},
            factoryNames: ${JSON.stringify(factoryNames)}
        };

        // Error reporting back to parent
        window.onerror = function(msg, url, line, col, error) {
            try {
                const bc = new BroadcastChannel(window.__tulweb_popout__.channelName);
                bc.postMessage({
                    type: 'popoutError',
                    popoutId: window.__tulweb_popout__.popoutId,
                    message: msg + (line ? ' at ' + url + ':' + line : '')
                });
                bc.close();
            } catch(e) {}
            return false;
        };
    <\/script>
    <script type="module">
        import { LayoutManager } from ${JSON.stringify(tulwebModulePath)};

        const popoutData = window.__tulweb_popout__;
        const channel = new BroadcastChannel(popoutData.channelName);
        const container = document.getElementById('tulweb-popout-root');

        // Request component factories from parent
        channel.postMessage({
            type: 'requestFactories',
            popoutId: popoutData.popoutId,
            factoryNames: popoutData.factoryNames
        });

        // Mock dependencies that might be used by demo factories
        window.tulWebLogger = (msg, color) => {
            console.log('[Parent Logger Proxy] %c' + msg, color ? 'color: ' + color : '');
        };

        // Wait for parent to confirm factory source transfer
        channel.onmessage = function initHandler(e) {
            if (e.data.type === 'factorySources' && e.data.popoutId === popoutData.popoutId) {
                channel.onmessage = null;

                const layout = new LayoutManager(null, container);
                window.__tulweb_layout__ = layout;

                // Register component factories from source code strings
                const sources = e.data.sources;
                for (const [name, source] of Object.entries(sources)) {
                    try {
                        // Reconstruct the factory function from its source
                        const fn = new Function('return ' + source)();
                        layout.registerComponent(name, fn);
                    } catch (err) {
                        console.warn('Could not reconstruct factory for ' + name + ':', err);
                        // Register a fallback
                        layout.registerComponent(name, (state, comp) => {
                            const el = document.createElement('div');
                            el.style.padding = '24px';
                            el.style.color = 'var(--tulweb-text-secondary)';
                            el.innerHTML = '<p>Component: ' + name + '</p><p style="font-size:12px;opacity:0.6">Could not transfer factory to popout window.</p>';
                            return el;
                        });
                    }
                }

                // Load the layout
                layout.loadLayout(popoutData.layoutConfig);

                // Forward state changes back to parent
                layout.on('stateChanged', () => {
                    channel.postMessage({
                        type: 'stateChanged',
                        popoutId: popoutData.popoutId,
                        config: layout.toConfig()
                    });
                });

                // Listen for parent-initiated updates
                channel.onmessage = function(e) {
                    if (e.data.popoutId !== popoutData.popoutId) return;
                    if (e.data.type === 'themeChanged') {
                        document.body.className = e.data.bodyClass;
                    } else if (e.data.type === 'closePopout') {
                        window.close();
                    }
                };

                // Notify parent we're ready
                channel.postMessage({
                    type: 'popoutReady',
                    popoutId: popoutData.popoutId
                });
            }
        };

        // On close, notify parent
        window.addEventListener('beforeunload', () => {
            channel.postMessage({
                type: 'popoutClosing',
                popoutId: popoutData.popoutId,
                config: window.__tulweb_layout__ ? window.__tulweb_layout__.toConfig() : null
            });
        });
    <\/script>
</body>
</html>`;
    }

    _getPopoutTitle(stackConfig) {
        if (stackConfig.content && stackConfig.content.length > 0) {
            const first = stackConfig.content[0]
            return (first.title || first.componentName || 'Panel') + ' — TulWEB Popout'
        }
        return 'TulWEB Popout'
    }

    _setupChildWindow(childWindow, popoutId, stackConfig) {
        // Nothing extra needed; communication is via BroadcastChannel
    }

    _handleChildMessage(data) {
        if (!data || !data.popoutId) return

        const entry = this.openPopouts.get(data.popoutId)
        if (!entry && data.type !== 'popoutClosing') return

        switch (data.type) {
            case 'requestFactories': {
                // Send component factory sources to child
                const sources = {}
                for (const name of data.factoryNames) {
                    const factory = this.layoutManager.componentFactories[name]
                    if (factory) {
                        sources[name] = factory.toString()
                    }
                }
                this.masterChannel.postMessage({
                    type: 'factorySources',
                    popoutId: data.popoutId,
                    sources
                })
                break
            }

            case 'stateChanged': {
                // Child state changed - emit event so parent can react
                this.layoutManager.emit('popoutStateChanged', {
                    popoutId: data.popoutId,
                    config: data.config
                })
                break
            }

            case 'popoutReady': {
                this.layoutManager.emit('popoutReady', { popoutId: data.popoutId })
                break
            }

            case 'popoutClosing': {
                // The child is about to close - re-integrate its content
                this._handlePopoutClosed(data.popoutId, data.config)
                break
            }

            case 'popoutError': {
                console.error(`[Popout Error ${data.popoutId}]: ${data.message}`)
                this.layoutManager.emit('popoutError', { popoutId: data.popoutId, message: data.message })
                break
            }
        }
    }

    _handlePopoutClosed(popoutId, returnedConfig) {
        const entry = this.openPopouts.get(popoutId)
        if (!entry) return

        if (entry.intervalId) clearInterval(entry.intervalId)
        this.openPopouts.delete(popoutId)

        // Re-integrate the stack content into the parent layout
        const configToRestore = returnedConfig || entry.stackConfig

        if (configToRestore && configToRestore.content) {
            // Extract stack config from returned layout, or use directly
            let stackConfig = configToRestore
            if (configToRestore.content && configToRestore.content[0]) {
                const top = configToRestore.content[0]
                // The returned config may be a full layout config wrapping the stack
                if (top.type === 'stack') {
                    stackConfig = top
                } else if (top.content) {
                    // Could be row/col wrapping - find first stack
                    const findStack = (item) => {
                        if (item.type === 'stack') return item
                        if (item.content) {
                            for (const child of item.content) {
                                const found = findStack(child)
                                if (found) return found
                            }
                        }
                        return null
                    }
                    stackConfig = findStack(top) || configToRestore
                }
            }

            // Add the stack back to the layout
            try {
                const builtStack = this.layoutManager._buildObjectTree(stackConfig)
                let restored = false

                // Try to restore to previous location
                if (entry.location && entry.location.parentId) {
                    let parent = this.layoutManager.getItemById(entry.location.parentId)
                    
                    // If the direct parent is gone, try to find an ancestor
                    if (!parent) {
                        // This happens if a row/column was destroyed because it became empty
                        // Fallback: use root if available
                        parent = this.layoutManager.root
                    }

                    if (parent && (parent instanceof RowItem || parent instanceof ColumnItem)) {
                        const targetIndex = Math.min(entry.location.index, parent.children.length)
                        parent.addChild(builtStack, targetIndex)
                        restored = true
                    }
                }

                if (!restored) {
                    // Fallback: original re-integration logic
                    if (!this.layoutManager.root) {
                        // Layout is empty, create the stack as root
                        const row = this.layoutManager._buildObjectTree({
                            type: 'row',
                            content: [stackConfig]
                        })
                        this.layoutManager.root = row
                        this.layoutManager.rootElement.innerHTML = ''
                        this.layoutManager.rootElement.appendChild(row.element)
                        this.layoutManager.root.updateLayout()
                    } else {
                        // Find the best stack to add to, or create a new split
                        const root = this.layoutManager.root

                        if (root instanceof RowItem) {
                            builtStack.size = 50
                            // Reduce existing children proportionally
                            root.children.forEach(c => { if (typeof c.size === 'number') c.size *= 0.8 })
                            root.addChild(builtStack)
                        } else if (root instanceof ColumnItem) {
                            builtStack.size = 50
                            root.children.forEach(c => { if (typeof c.size === 'number') c.size *= 0.8 })
                            root.addChild(builtStack)
                        } else {
                            // Root is a stack - wrap in row
                            const wrapper = new RowItem({ type: 'row' }, this.layoutManager)
                            const oldRoot = root
                            oldRoot.size = 50
                            builtStack.size = 50

                            this.layoutManager.rootElement.innerHTML = ''
                            oldRoot.parent = null
                            wrapper.addChild(oldRoot, undefined, true)
                            wrapper.addChild(builtStack, undefined, true)

                            this.layoutManager.root = wrapper
                            this.layoutManager.rootElement.appendChild(wrapper.element)
                            wrapper.updateLayout()
                        }
                    }
                }

                this.layoutManager.updateLayout()
                this.layoutManager.showToast('Popout returned to workspace')
            } catch (err) {
                console.error('Failed to re-integrate popout:', err)
                this.layoutManager.showToast('Failed to restore popout content', 'error')
            }
        }

        this.layoutManager.emit('popoutClosed', { popoutId })
        this.layoutManager.emit('stateChanged')
    }

    /**
     * Send a theme change to all open popouts
     */
    broadcastThemeChange(bodyClass) {
        this.openPopouts.forEach((entry, popoutId) => {
            if (this.masterChannel) {
                this.masterChannel.postMessage({
                    type: 'themeChanged',
                    popoutId,
                    bodyClass
                })
            }
        })
    }

    /**
     * Close a specific popout
     */
    closePopout(popoutId) {
        const entry = this.openPopouts.get(popoutId)
        if (entry) {
            if (this.masterChannel) {
                this.masterChannel.postMessage({
                    type: 'closePopout',
                    popoutId
                })
            }
            // Also try to close directly
            try { entry.window.close() } catch (e) { /* cross-origin safety */ }
        }
    }

    /**
     * Close all open popouts
     */
    closeAll() {
        this.openPopouts.forEach((entry, popoutId) => {
            this.closePopout(popoutId)
        })
    }

    /**
     * Get the number of open popouts
     */
    get count() {
        return this.openPopouts.size
    }

    destroy() {
        this.closeAll()
        window.removeEventListener('beforeunload', this._onBeforeUnload)
        if (this.masterChannel) {
            this.masterChannel.close()
            this.masterChannel = null
        }
        this.openPopouts.clear()
    }
}


// --- Public Layout Manager ---

class LayoutManager extends EventEmitter {
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

    _buildObjectTree(itemConfig) {
        let item
        if (itemConfig.type === 'row') item = new RowItem(itemConfig, this)
        else if (itemConfig.type === 'column') item = new ColumnItem(itemConfig, this)
        else if (itemConfig.type === 'stack') item = new StackItem(itemConfig, this)
        else if (itemConfig.type === 'component') item = new ComponentItem(itemConfig, this)
        else throw new Error("Unknown type: " + itemConfig.type)

        if (itemConfig.content) {
            if (!Array.isArray(itemConfig.content)) throw new Error(`Content for ${itemConfig.type} must be an array`)
            itemConfig.content.forEach(childConfig => {
                item.addChild(this._buildObjectTree(childConfig), undefined, true)
            })
        }
        if (itemConfig.id) {
            item.id = itemConfig.id
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


// Expose API
export {
    LayoutManager,
    PopoutManager,
    DragSource,
    Utils as utils,
    ContentItem,
    StackItem,
    RowItem,
    ColumnItem,
    ComponentItem
}
