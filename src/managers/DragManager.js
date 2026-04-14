import { Utils } from '../utils/Utils.js'
import { StackItem } from '../core/StackItem.js'
import { ComponentItem } from '../core/ComponentItem.js'
import { RowItem, ColumnItem } from '../core/ContainerItem.js'

export class DragManager {
    constructor(layoutManager) {
        this.isDragging = false
        this.dragItem = null
        this.proxy = null
        this.indicator = null
        this.layoutManager = layoutManager
        this.sourceType = null
        this.sourceStack = null
        this._dragDoc = document

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
        this._dragDoc = evt.target ? (evt.target.ownerDocument || document) : document

        const isTouch = evt.touches && evt.touches.length > 0
        const clientX = isTouch ? evt.touches[0].clientX : evt.clientX
        const clientY = isTouch ? evt.touches[0].clientY : evt.clientY

        this.pendingStartPos = { x: clientX, y: clientY }
        this.pendingArgs = { itemConfig, type, sourceStack, title }

        if (isTouch) {
            this._dragDoc.addEventListener('touchmove', this.handlePendingTouchMove, { passive: false })
            this._dragDoc.addEventListener('touchend', this.handlePendingTouchEnd)
        } else {
            this._dragDoc.addEventListener('mousemove', this.handlePendingMove)
            this._dragDoc.addEventListener('mouseup', this.handlePendingUp)
        }
    }

    cancelDrag() {
        if (this.isPendingDrag) {
            this.handlePendingUp()
        }
        if (this.isDragging) {
            this.handleMouseUp()
        }
        this.isPendingDrag = false
        this.isDragging = false
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
            this._dragDoc.removeEventListener('mousemove', this.handlePendingMove)
            this._dragDoc.removeEventListener('mouseup', this.handlePendingUp)
            this._dragDoc.removeEventListener('touchmove', this.handlePendingTouchMove)
            this._dragDoc.removeEventListener('touchend', this.handlePendingTouchEnd)

            const a = this.pendingArgs
            this.startDrag(evt, a.itemConfig, a.type, a.sourceStack, a.title)
        }
    }

    handlePendingUp(evt) {
        this.isPendingDrag = false
        this._dragDoc.removeEventListener('mousemove', this.handlePendingMove)
        this._dragDoc.removeEventListener('mouseup', this.handlePendingUp)
        this._dragDoc.removeEventListener('touchmove', this.handlePendingTouchMove)
        this._dragDoc.removeEventListener('touchend', this.handlePendingTouchEnd)
    }

    startDrag(evt, itemConfig, type, sourceStack, title) {
        this.isDragging = true
        this.dragItem = itemConfig
        this.sourceType = type
        this.sourceStack = sourceStack

        // Create UI proxy in the document where the drag originated
        this.proxy = Utils.createElement('div', 'tulweb-drag-proxy', this._dragDoc.body)
        this.proxy.textContent = title || itemConfig.title || 'Component'
        this.updateProxyPos(evt)

        if (evt.touches) {
            this._dragDoc.addEventListener('touchmove', this.handleTouchMove, { passive: false })
            this._dragDoc.addEventListener('touchend', this.handleTouchEnd)
        } else {
            this._dragDoc.addEventListener('mousemove', this.handleMouseMove)
            this._dragDoc.addEventListener('mouseup', this.handleMouseUp)
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

        this._dragDoc.removeEventListener('mousemove', this.handleMouseMove)
        this._dragDoc.removeEventListener('mouseup', this.handleMouseUp)
        this._dragDoc.removeEventListener('touchmove', this.handleTouchMove)
        this._dragDoc.removeEventListener('touchend', this.handleTouchEnd)

        if (this.proxy) {
            if (this.proxy.parentElement) {
                this.proxy.parentElement.removeChild(this.proxy)
            }
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
        const el = this._dragDoc.elementFromPoint(clientX, clientY)
        if (!el) return this.hideIndicator()

        // Find the closest Layout Item
        let targetItem = null
        let currentEl = el
        while (currentEl && currentEl !== this._dragDoc.body) {
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
