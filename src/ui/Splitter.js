import { Utils } from '../utils/Utils.js'

export class Splitter {
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
            if (e.altKey || e.ctrlKey || e.metaKey) return
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
        if (this._rafPending) {
            this._lastMoveEvent = e
            return
        }
        this._rafPending = true
        this._lastMoveEvent = e
        requestAnimationFrame(() => {
            this._rafPending = false
            this._applyResize(this._lastMoveEvent)
        })
    }

    _applyResize(e) {
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
        if (this.isDragging) {
            this._onMouseUp()
        }
        this.element.removeEventListener('mousedown', this._onMouseDown)
        this.element.removeEventListener('dblclick', this._onDblClick)
        if (this.element.parentElement) {
            this.element.parentElement.removeChild(this.element)
        }
    }
}
