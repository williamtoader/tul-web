export class DragSource {
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
