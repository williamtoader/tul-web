export class DragSource {
  constructor (element, itemConfig, layoutManager) {
    this.element = element
    this.itemConfig = itemConfig
    this.layoutManager = layoutManager
    this.element.classList.add('tulweb-drag-source')

    const startHandler = (e) => {
      // Config is cloned later in startDrag() only if the drag threshold is met
      if (e.type === 'dragstart') {
        this.layoutManager.dragManager.startDrag(e, this.itemConfig, 'external', null, this.itemConfig.title)
      } else {
        this.layoutManager.dragManager.pendDrag(e, this.itemConfig, 'external', null, this.itemConfig.title)
      }
    }

    this.element.setAttribute('draggable', 'true')
    this.element.addEventListener('dragstart', startHandler)
    this.element.addEventListener('mousedown', startHandler)
    this.element.addEventListener('touchstart', startHandler, { passive: true })
  }
}
