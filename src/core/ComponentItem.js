import { ContentItem } from './ContentItem.js'

export class ComponentItem extends ContentItem {
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
        if (this._hasRendered) return
        this._hasRendered = true

        const factory = this.layoutManager.componentFactories[this.config.componentName]

        if (factory) {
            this.element.innerHTML = '' // Clear initial state
            try {
                // Use Reflect.construct to reliably detect classes (survives minification/transpilation)
                const isClass = typeof factory === 'function' &&
                    (factory.isClass || (() => {
                        try { Reflect.construct(String, [], factory); return true } catch { return false }
                    })())

                let contentNode
                if (isClass) {
                    const instance = new factory(this.config.componentState, this)
                    this.instance = instance
                    // Convention: class should have an .element property or be a DOM node itself
                    contentNode = instance.element || (typeof instance.render === 'function' ? instance.render() : instance)
                } else {
                    contentNode = factory(this.config.componentState, this)
                }

                if (contentNode instanceof Node) {
                    this.element.appendChild(contentNode)
                }
                this.emit('init')
            } catch (err) {
                this.element.innerHTML = `<div style="color:red; padding:10px;">Error rendering component: ${err.message}</div>`
                console.error("Component Render Error:", err)
            }
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
