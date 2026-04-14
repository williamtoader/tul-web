import { ContentItem } from './ContentItem.js'
import { Splitter } from '../ui/Splitter.js'

export class ContainerItem extends ContentItem {
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

export class RowItem extends ContainerItem { }
export class ColumnItem extends ContainerItem { }
