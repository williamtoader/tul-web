/**
 * TulWEB - Pure JS Windowing Toolkit
 */

const TulWEB = (function () {

    // --- Utility Functions ---
    const Utils = {
        createElement(tag, className, parent) {
            const el = document.createElement(tag);
            if (className) el.className = className;
            if (parent) parent.appendChild(el);
            return el;
        },
        generateId() {
            return Math.random().toString(36).substr(2, 9);
        },
        getRelativePos(evt, elem) {
            const rect = elem.getBoundingClientRect();
            return {
                x: evt.clientX - rect.left,
                y: evt.clientY - rect.top,
                w: rect.width,
                h: rect.height,
                pointerX: evt.clientX,
                pointerY: evt.clientY
            };
        }
    };

    // --- Drag & Drop Manager Singleton ---
    const DragManager = {
        isDragging: false,
        dragItem: null, // The config or tab being dragged
        proxy: null,
        indicator: null,
        layoutManager: null, // Set during init
        sourceType: null, // 'tab' or 'external'
        sourceStack: null, // If 'tab', the stack it came from

        isPendingDrag: false,
        pendingStartPos: null,
        pendingArgs: null,

        init(layoutManager) {
            this.layoutManager = layoutManager;
            this.handleMouseMove = this.handleMouseMove.bind(this);
            this.handleMouseUp = this.handleMouseUp.bind(this);
            this.handlePendingMove = this.handlePendingMove.bind(this);
            this.handlePendingUp = this.handlePendingUp.bind(this);

            // Create indicator element
            this.indicator = Utils.createElement('div', 'tulweb-drop-indicator', document.body);
            this.indicator.style.display = 'none';

            // Create tab drop indicator element
            this.tabIndicator = Utils.createElement('div', 'tulweb-tab-drop-indicator', document.body);
            this.tabIndicator.style.display = 'none';
        },

        pendDrag(evt, itemConfig, type, sourceStack, title) {
            this.isPendingDrag = true;
            this.pendingStartPos = { x: evt.clientX, y: evt.clientY };
            this.pendingArgs = { itemConfig, type, sourceStack, title };

            document.addEventListener('mousemove', this.handlePendingMove);
            document.addEventListener('mouseup', this.handlePendingUp);
        },

        handlePendingMove(evt) {
            if (!this.isPendingDrag) return;
            const dx = evt.clientX - this.pendingStartPos.x;
            const dy = evt.clientY - this.pendingStartPos.y;
            if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
                this.isPendingDrag = false;
                document.removeEventListener('mousemove', this.handlePendingMove);
                document.removeEventListener('mouseup', this.handlePendingUp);
                const a = this.pendingArgs;
                this.startDrag(evt, a.itemConfig, a.type, a.sourceStack, a.title);
            }
        },

        handlePendingUp(evt) {
            this.isPendingDrag = false;
            document.removeEventListener('mousemove', this.handlePendingMove);
            document.removeEventListener('mouseup', this.handlePendingUp);
        },

        startDrag(evt, itemConfig, type, sourceStack, title) {
            this.isDragging = true;
            this.dragItem = itemConfig;
            this.sourceType = type;
            this.sourceStack = sourceStack;

            // Create UI proxy
            this.proxy = Utils.createElement('div', 'tulweb-drag-proxy', document.body);
            this.proxy.textContent = title || itemConfig.title || 'Component';
            this.updateProxyPos(evt);

            document.addEventListener('mousemove', this.handleMouseMove);
            document.addEventListener('mouseup', this.handleMouseUp);

            // If dragging from a stack, make it look active but keep it in the DOM until drop
            if (sourceStack) {
                // Visual feedback only for now
            }
        },

        updateProxyPos(evt) {
            if (this.proxy) {
                this.proxy.style.left = (evt.clientX + 10) + 'px';
                this.proxy.style.top = (evt.clientY + 10) + 'px';
            }
        },

        handleMouseMove(evt) {
            if (!this.isDragging) return;
            evt.preventDefault();
            this.updateProxyPos(evt);
            this.findDropZone(evt);
        },

        handleMouseUp(evt) {
            if (!this.isDragging) return;
            this.isDragging = false;

            document.removeEventListener('mousemove', this.handleMouseMove);
            document.removeEventListener('mouseup', this.handleMouseUp);

            if (this.proxy) {
                document.body.removeChild(this.proxy);
                this.proxy = null;
            }

            if (this.indicator) {
                this.indicator.style.display = 'none';
                this.indicator.classList.remove('visible');
            }

            if (this.tabIndicator) {
                this.tabIndicator.style.display = 'none';
                this.tabIndicator.classList.remove('visible');
            }

            if (this.currentDropZone) {
                this.executeDrop();
            } else if (this.sourceType === 'tab' && this.sourceStack && this.dragItem) {
                // Dragged outside, maybe remove or just cancel? Currently cancel.
            }

            this.currentDropZone = null;
            this.dragItem = null;
            this.sourceStack = null;
        },

        currentDropZone: null, // { targetItem, edge: 'top'|'bottom'|'left'|'right'|'center' }

        findDropZone(evt) {
            // Find what we are over. The proxy has pointer-events: none, so this gets the actual element
            const el = document.elementFromPoint(evt.clientX, evt.clientY);
            if (!el) return this.hideIndicator();

            // Find the closest Layout Item
            let targetItem = null;
            let currentEl = el;
            while (currentEl && currentEl !== document.body) {
                if (currentEl.tulwebItem) {
                    targetItem = currentEl.tulwebItem;
                    break;
                }
                currentEl = currentEl.parentElement;
            }

            if (!targetItem) {
                // If it's a drag over the root and root is empty, allow dropping
                if (this.layoutManager.rootElement.contains(el) && !this.layoutManager.root) {
                    this.currentDropZone = { target: 'root', edge: 'center' };
                    this.showIndicator(this.layoutManager.rootElement, 'center');
                    return;
                }
                return this.hideIndicator();
            }

            // If hovering over a component inside a stack, we want to target the stack
            if (targetItem instanceof ComponentItem && targetItem.parent instanceof StackItem) {
                targetItem = targetItem.parent;
            }

            // Don't dropping on itself if it's the only tab
            if (targetItem === this.sourceStack && targetItem.children.length === 1 && this.sourceType === 'tab') {
                return this.hideIndicator(); // Can't drop on self if only child
            }

            // Determine zone
            const pos = Utils.getRelativePos(evt, targetItem.element);

            let edge = 'center';
            if (targetItem instanceof StackItem) {
                const isHeader = targetItem.headerEl.contains(el);
                if (isHeader) {
                    edge = 'tab_insert';

                    const tabs = Array.from(targetItem.tabsEl.querySelectorAll('.tulweb-tab'));
                    let dropIdx = tabs.length;
                    let dropLeft = 0;
                    let dropTop = 0;
                    let dropHeight = 0;
                    let dropWidth = 0;

                    const isVertical = targetItem.tabPosition === 'left' || targetItem.tabPosition === 'right';

                    if (tabs.length > 0) {
                        for (let i = 0; i < tabs.length; i++) {
                            const tab = tabs[i];
                            const rect = tab.getBoundingClientRect();
                            if (tab.style.display === 'none') continue;

                            if (isVertical) {
                                if (evt.clientY < rect.top + rect.height / 2) {
                                    dropIdx = i;
                                    dropLeft = rect.left;
                                    dropTop = rect.top;
                                    dropWidth = rect.width;
                                    dropHeight = 2;
                                    break;
                                }
                            } else {
                                if (evt.clientX < rect.left + rect.width / 2) {
                                    dropIdx = i;
                                    dropLeft = rect.left;
                                    dropTop = rect.top;
                                    dropWidth = 2;
                                    dropHeight = rect.height;
                                    break;
                                }
                            }
                        }

                        if (dropIdx === tabs.length) {
                            let lastVisible = null;
                            for (let i = tabs.length - 1; i >= 0; i--) {
                                if (tabs[i].style.display !== 'none') {
                                    lastVisible = tabs[i];
                                    dropIdx = i + 1;
                                    break;
                                }
                            }
                            if (lastVisible) {
                                const rect = lastVisible.getBoundingClientRect();
                                if (isVertical) {
                                    dropLeft = rect.left;
                                    dropTop = rect.bottom;
                                    dropWidth = rect.width;
                                    dropHeight = 2;
                                } else {
                                    dropLeft = rect.right;
                                    dropTop = rect.top;
                                    dropWidth = 2;
                                    dropHeight = rect.height;
                                }
                            } else {
                                // Fallback if all hidden
                                const rect = targetItem.tabsEl.getBoundingClientRect();
                                if (isVertical) {
                                    dropLeft = rect.left + 4;
                                    dropTop = rect.top + 8;
                                    dropWidth = rect.width - 8;
                                    dropHeight = 2;
                                } else {
                                    dropLeft = rect.left + 8;
                                    dropTop = rect.top + 4;
                                    dropWidth = 2;
                                    dropHeight = rect.height - 8;
                                }
                            }
                        }
                    } else {
                        const rect = targetItem.tabsEl.getBoundingClientRect();
                        if (isVertical) {
                            dropLeft = rect.left + 4;
                            dropTop = rect.top + 8;
                            dropWidth = rect.width - 8;
                            dropHeight = 2;
                        } else {
                            dropLeft = rect.left + 8;
                            dropTop = rect.top + 4;
                            dropWidth = 2;
                            dropHeight = rect.height - 8;
                        }
                    }

                    this.currentDropZone = { target: targetItem, edge: edge, insertIndex: dropIdx };
                    this.showTabIndicator(dropLeft, dropTop, dropWidth, dropHeight);
                    return;

                } else {
                    // Check center 25% box for stacking
                    const cx = pos.w / 2;
                    const cy = pos.h / 2;
                    if (Math.abs(pos.x - cx) < pos.w * 0.25 && Math.abs(pos.y - cy) < pos.h * 0.25) {
                        edge = 'center';
                    } else {
                        // Quadrants
                        const y1 = pos.x * (pos.h / pos.w);
                        const y2 = pos.h - pos.x * (pos.h / pos.w);

                        if (pos.y < y1 && pos.y < y2) edge = 'top';
                        else if (pos.y > y1 && pos.y > y2) edge = 'bottom';
                        else if (pos.y > y1 && pos.y < y2) edge = 'left';
                        else if (pos.y < y1 && pos.y > y2) edge = 'right';
                    }
                }
            } else {
                return this.hideIndicator();
            }

            this.currentDropZone = { target: targetItem, edge: edge };
            this.showIndicator(targetItem.element, edge);
        },

        showTabIndicator(l, t, w, h) {
            this.indicator.style.display = 'none';
            this.indicator.classList.remove('visible');

            this.tabIndicator.style.top = t + 'px';
            this.tabIndicator.style.left = l + 'px';
            this.tabIndicator.style.width = w + 'px';
            this.tabIndicator.style.height = h + 'px';
            this.tabIndicator.style.display = 'block';

            setTimeout(() => this.tabIndicator.classList.add('visible'), 10);
        },

        showIndicator(element, edge) {
            if (this.tabIndicator) {
                this.tabIndicator.style.display = 'none';
                this.tabIndicator.classList.remove('visible');
            }

            const rect = element.getBoundingClientRect();
            let t = rect.top, l = rect.left, w = rect.width, h = rect.height;

            if (edge === 'top') h = h / 2;
            if (edge === 'bottom') { t = rect.bottom - (h / 2); h = h / 2; }
            if (edge === 'left') w = w / 2;
            if (edge === 'right') { l = rect.right - (w / 2); w = w / 2; }

            this.indicator.style.top = t + 'px';
            this.indicator.style.left = l + 'px';
            this.indicator.style.width = w + 'px';
            this.indicator.style.height = h + 'px';
            this.indicator.style.display = 'block';

            // Small delay for CSS transition
            setTimeout(() => this.indicator.classList.add('visible'), 10);
        },

        hideIndicator() {
            this.indicator.style.display = 'none';
            this.indicator.classList.remove('visible');
            if (this.tabIndicator) {
                this.tabIndicator.style.display = 'none';
                this.tabIndicator.classList.remove('visible');
            }
            this.currentDropZone = null;
        },

        executeDrop() {
            const { target, edge } = this.currentDropZone;
            let newItemConfig = this.dragItem;

            let adjustIndex = false;
            // If it's a dragged tab, we need to remove it from the old stack first
            if (this.sourceType === 'tab') {
                const oldComp = this.sourceStack.children.find(c => c.config === newItemConfig);
                if (oldComp) {
                    const oldIndex = this.sourceStack.children.indexOf(oldComp);
                    if (this.sourceStack === target && edge === 'tab_insert' && oldIndex < this.currentDropZone.insertIndex) {
                        adjustIndex = true;
                    }
                    this.sourceStack.removeChild(oldComp);
                    // If source stack is empty, it needs to be cleaned up
                    if (this.sourceStack.children.length === 0) {
                        this.layoutManager._cleanupEmptyStack(this.sourceStack);
                    }
                }
            } else {
                // It's a new external config. We need to create it.
                // It's already just a config object.
                // Deep copy if needed, but assuming unique factory calls
            }

            let newComp;

            if (target === 'root') {
                const row = new RowItem({ type: 'row' }, this.layoutManager);
                const newStack = new StackItem({ type: 'stack' }, this.layoutManager);
                newComp = new ComponentItem(newItemConfig, this.layoutManager);
                newStack.addChild(newComp);
                row.addChild(newStack);
                this.layoutManager.root = row;
                this.layoutManager.rootElement.innerHTML = '';
                this.layoutManager.rootElement.appendChild(row.element);
                this.layoutManager.updateLayout();
            } else if (edge === 'center') {
                // Add tab to existing stack
                newComp = new ComponentItem(newItemConfig, this.layoutManager);
                target.addChild(newComp);
            } else if (edge === 'tab_insert') {
                newComp = new ComponentItem(newItemConfig, this.layoutManager);
                let idx = this.currentDropZone.insertIndex;
                if (adjustIndex) idx--;
                target.addChild(newComp, idx);
            } else {
                // Split
                const isHoriz = (edge === 'left' || edge === 'right');
                const isFirst = (edge === 'left' || edge === 'top');

                // We need to insert a new Row or Column conceptually, or replace target in its parent
                // For simplicity: target is a Stack. Its parent is Row or Col.
                const parent = target.parent;
                const newStack = new StackItem({ type: 'stack' }, this.layoutManager);
                newComp = new ComponentItem(newItemConfig, this.layoutManager);
                newStack.addChild(newComp);

                if (parent instanceof RowItem && isHoriz) {
                    // Split row
                    const index = parent.children.indexOf(target);
                    // Split size
                    const targetSize = target.size || 50;
                    target.size = targetSize / 2;
                    newStack.size = targetSize / 2;
                    parent.addChild(newStack, isFirst ? index : index + 1);
                }
                else if (parent instanceof ColumnItem && !isHoriz) {
                    // Split column
                    const index = parent.children.indexOf(target);
                    const targetSize = target.size || 50;
                    target.size = targetSize / 2;
                    newStack.size = targetSize / 2;
                    parent.addChild(newStack, isFirst ? index : index + 1);
                }
                else {
                    // Need to wrap target in a new Row/Col
                    const wrapperType = isHoriz ? RowItem : ColumnItem;
                    const wrapper = new wrapperType({ type: isHoriz ? 'row' : 'column' }, this.layoutManager);

                    const pIndex = parent.children.indexOf(target);
                    wrapper.size = target.size;
                    target.size = 50;
                    newStack.size = 50;

                    // Swap target with wrapper in parent
                    parent.replaceChild(target, wrapper, pIndex);

                    wrapper.addChild(isFirst ? newStack : target);
                    wrapper.addChild(isFirst ? target : newStack);
                }

                // Triggers resize
                this.layoutManager.updateLayout();
            }

            if (this.sourceType === 'tab' && newComp) {
                newComp.emit('move');
            }
        }
    };


    // --- Drag Source ---
    class DragSource {
        constructor(element, itemConfig, layoutManager) {
            this.element = element;
            this.itemConfig = itemConfig;
            this.layoutManager = layoutManager;
            this.element.classList.add('tulweb-drag-source');

            this.element.addEventListener('mousedown', (e) => {
                e.preventDefault(); // Prevent text selection
                // Clone config so we don't mutate original
                const configCopy = JSON.parse(JSON.stringify(this.itemConfig));
                DragManager.pendDrag(e, configCopy, 'external', null, this.itemConfig.title);
            });
        }
    }


    // --- Splitter ---
    class Splitter {
        constructor(isVertical, prevItem, nextItem, parentContainer) {
            this.isVertical = isVertical; // True for row (vertical line), false for column (horizontal line)
            this.prevItem = prevItem;
            this.nextItem = nextItem;
            this.parentContainer = parentContainer;

            this.element = Utils.createElement('div', 'tulweb-splitter', parentContainer);

            this.isDragging = false;
            this._onMouseDown = this._onMouseDown.bind(this);
            this._onMouseMove = this._onMouseMove.bind(this);
            this._onMouseUp = this._onMouseUp.bind(this);
            this._onDblClick = this._onDblClick.bind(this);

            this.element.addEventListener('mousedown', this._onMouseDown);
            this.element.addEventListener('dblclick', this._onDblClick);
        }

        _onDblClick(e) {
            e.preventDefault();
            const total = (this.prevItem.size || 50) + (this.nextItem.size || 50);
            this.prevItem.size = total / 2;
            this.nextItem.size = total / 2;
            this.prevItem.updateFlex();
            this.nextItem.updateFlex();
        }

        _onMouseDown(e) {
            e.preventDefault();
            this.isDragging = true;
            this.element.classList.add('active');

            // Calculate base metrics
            this.startPos = this.isVertical ? e.clientX : e.clientY;
            this.startPrevSize = this.prevItem.size || 50;
            this.startNextSize = this.nextItem.size || 50;
            this.totalSize = this.startPrevSize + this.startNextSize;

            // Get pixels to percentage ratio
            const parentRect = this.parentContainer.getBoundingClientRect();
            this.pixelsPerPercent = (this.isVertical ? parentRect.width : parentRect.height) / 100;

            document.addEventListener('mousemove', this._onMouseMove);
            document.addEventListener('mouseup', this._onMouseUp);
        }

        _onMouseMove(e) {
            if (!this.isDragging) return;
            const currentPos = this.isVertical ? e.clientX : e.clientY;
            const diffPx = currentPos - this.startPos;
            const diffPct = diffPx / this.pixelsPerPercent;

            let newPrevSize = this.startPrevSize + diffPct;
            let newNextSize = this.startNextSize - diffPct;

            // Min size constraints (e.g. 5%)
            const MIN_SIZE = 10;
            if (newPrevSize < MIN_SIZE) {
                newPrevSize = MIN_SIZE;
                newNextSize = this.totalSize - MIN_SIZE;
            } else if (newNextSize < MIN_SIZE) {
                newNextSize = MIN_SIZE;
                newPrevSize = this.totalSize - MIN_SIZE;
            }

            this.prevItem.size = newPrevSize;
            this.nextItem.size = newNextSize;

            // Re-render
            this.prevItem.updateFlex();
            this.nextItem.updateFlex();
        }

        _onMouseUp(e) {
            if (this.isDragging) {
                this.isDragging = false;
                this.element.classList.remove('active');
                document.removeEventListener('mousemove', this._onMouseMove);
                document.removeEventListener('mouseup', this._onMouseUp);
            }
        }

        destroy() {
            this.element.removeEventListener('mousedown', this._onMouseDown);
            this.element.removeEventListener('dblclick', this._onDblClick);
            if (this.element.parentElement) {
                this.element.parentElement.removeChild(this.element);
            }
        }
    }


    class EventEmitter {
        constructor() {
            this._listeners = {};
        }
        on(event, callback) {
            if (!this._listeners[event]) this._listeners[event] = [];
            this._listeners[event].push(callback);
        }
        off(event, callback) {
            if (!this._listeners[event]) return;
            this._listeners[event] = this._listeners[event].filter(cb => cb !== callback);
        }
        emit(event, ...args) {
            if (this._listeners[event]) {
                this._listeners[event].forEach(cb => cb(...args));
            }
        }
    }

    // --- Core Layout Classes ---

    class ContentItem extends EventEmitter {
        constructor(config, layoutManager) {
            super();
            this.config = config || {};
            this.layoutManager = layoutManager;
            this.parent = null;
            this.children = [];
            this.element = null;
            this.size = this.config.size || null;
            this.id = Utils.generateId();

            this._isActive = false;
            this._isFocused = false;

            this.createDOM();
            if (this.element) {
                this.element.tulwebItem = this; // Link back from DOM
            }
        }

        createDOM() { /* Override */ }

        addChild(child, index, skipLayout = false) {
            child.parent = this;
            if (typeof index === 'number') {
                this.children.splice(index, 0, child);
            } else {
                this.children.push(child);
            }
            this._appendDOMChild(child, index);
            if (!skipLayout) {
                this.updateLayout();
            }
        }

        removeChild(child) {
            const index = this.children.indexOf(child);
            if (index > -1) {
                this.children.splice(index, 1);
                child.parent = null;
                this._removeDOMChild(child);
                this.updateLayout();
            }
        }

        replaceChild(oldChild, newChild, index) {
            this.children[index] = newChild;
            newChild.parent = this;
            oldChild.parent = null;
            this._replaceDOMChild(oldChild, newChild);
            this.updateLayout();
        }

        _appendDOMChild(child, index) { /* Override */ }
        _removeDOMChild(child) { /* Override */ }
        _replaceDOMChild(oldChild, newChild) { /* Override */ }

        updateLayout() { /* Override */ }

        updateFlex() {
            if (this.size && this.element) {
                this.element.style.flex = `${this.size} 1 0%`;
            } else if (this.element) {
                this.element.style.flex = '1 1 auto';
            }
            this.emit('resize');
        }

        destroy() {
            if (this._isFocused) {
                this._isFocused = false;
                this.emit('defocus');
            }
            if (this._isActive) {
                this._isActive = false;
                this.emit('inactive');
            }
            this.emit('destroy');
            const kids = [...this.children];
            kids.forEach(c => c.destroy());

            if (this.parent) {
                if (this.parent.children.length === 0 && this.parent.layoutManager) {
                    this.parent.layoutManager._cleanupEmptyStack(this.parent);
                }
                this.parent.removeChild(this);
            } else if (this.element && this.element.parentElement) {
                this.element.parentElement.removeChild(this.element);
            }
        }

        toConfig() {
            const res = {
                type: this.config.type,
                size: this.size
            };
            if (this.children.length > 0) {
                res.content = this.children.map(c => c.toConfig());
            }
            return res;
        }
    }


    class ComponentItem extends ContentItem {
        constructor(config, layoutManager) {
            super(config, layoutManager);
        }

        createDOM() {
            this.element = document.createElement('div');
            this.element.className = 'tulweb-component';
            this.layoutManager.emit('componentCreated', this);
        }

        renderAppContent() {
            // Call the registered component factory
            const factory = this.layoutManager.componentFactories[this.config.componentName];
            if (factory) {
                this.element.innerHTML = ''; // Clear
                try {
                    const contentNode = factory(this.config.componentState, this);
                    if (contentNode) {
                        this.element.appendChild(contentNode);
                    }
                    this.emit('init');
                } catch (err) {
                    this.element.innerHTML = `<div style="color:red; padding:10px;">Error rendering component: ${err.message}</div>`;
                    console.error("Component Render Error:", err);
                }
            } else {
                this.element.innerHTML = `<div style="color:red; padding:10px;">Unknown component: ${this.config.componentName}</div>`;
            }
        }

        toConfig() {
            return {
                type: 'component',
                title: this.config.title,
                componentName: this.config.componentName,
                componentState: this.config.componentState
            };
        }
    }


    class StackItem extends ContentItem {
        constructor(config, layoutManager) {
            super(config, layoutManager);
            this.activeChildIndex = 0;
            this.isMaximized = false;
            this.isMinimized = false;
            this.hiddenTabs = [];
        }

        createDOM() {
            this.tabPosition = this.config.tabPosition || 'top';
            this.element = document.createElement('div');
            this.element.className = 'tulweb-stack';
            if (this.tabPosition && this.tabPosition !== 'top') {
                this.element.classList.add('tab-' + this.tabPosition);
            }

            this.element.addEventListener('mousedown', () => {
                this.layoutManager.setActiveStack(this);
            });

            this.headerEl = Utils.createElement('div', 'tulweb-header', this.element);
            this.tabsEl = Utils.createElement('div', 'tulweb-tabs', this.headerEl);
            this.controlsEl = Utils.createElement('div', 'tulweb-header-controls', this.headerEl);

            if (this.layoutManager.settings.enableMinimize !== false) {
                this.minBtn = Utils.createElement('div', 'tulweb-control', this.controlsEl);
                this.minBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 19h12v2H6z"/></svg>';
                this.minBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleMinimize();
                });
            }

            // Maximize button
            this.maxBtn = Utils.createElement('div', 'tulweb-control', this.controlsEl);
            this.maxBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M4 4h16v16H4V4zm2 2v12h12V6H6z"/></svg>';
            this.maxBtn.addEventListener('click', () => this.toggleMaximize());

            // Close Stack Button
            this.closeBtn = Utils.createElement('div', 'tulweb-control', this.controlsEl);
            this.closeBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>';
            this.closeBtn.addEventListener('click', () => {
                console.log(this)
                this.closeAll();
                this.destroy();
            });

            this.contentAreaEl = Utils.createElement('div', 'tulweb-content-area', this.element);

            if (this.layoutManager.settings.enablePreview) {
                this.element.addEventListener('mouseenter', () => {
                    if (this.isMinimized) this.element.classList.add('previewing');
                });
                this.element.addEventListener('mouseleave', () => {
                    if (this.isMinimized) this.element.classList.remove('previewing');
                });
            }

            if (window.ResizeObserver) {
                this.resizeObserver = new ResizeObserver(() => {
                    if (this.children && this.children.length > 0) this.updateOverflow();
                });
                this.resizeObserver.observe(this.headerEl);
            }
        }

        _appendDOMChild(child, index) {
            this.contentAreaEl.appendChild(child.element);
            child.renderAppContent(); // Lazy render when added
            this.activeChildIndex = typeof index === 'number' ? index : this.children.length - 1; // Activate new
        }

        _removeDOMChild(child) {
            if (child.element && child.element.parentElement === this.contentAreaEl) {
                this.contentAreaEl.removeChild(child.element);
            }
            if (this.activeChildIndex >= this.children.length) {
                this.activeChildIndex = Math.max(0, this.children.length - 1);
            }
        }

        updateLayout() {
            this.renderTabs();
            this.showActiveChild();
            this.updateFlex();
        }

        renderTabs() {
            this.tabsEl.innerHTML = '';
            this.children.forEach((child, index) => {
                const tab = Utils.createElement('div', 'tulweb-tab', this.tabsEl);
                if (index === this.activeChildIndex) tab.classList.add('active');

                const title = Utils.createElement('div', 'tulweb-tab-title', tab);
                title.textContent = child.config.title || child.config.componentName || 'Tab';

                const close = Utils.createElement('div', 'tulweb-tab-close', tab);
                close.textContent = '×';
                close.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.removeChild(child);
                    if (this.children.length === 0) {
                        this.layoutManager._cleanupEmptyStack(this);
                    }
                });

                // Tab click
                tab.addEventListener('mousedown', (e) => {
                    if (e.target !== close && e.button === 0) {
                        this.setActive(index);
                    }
                });

                // Tab double click (maximize)
                tab.addEventListener('dblclick', (e) => {
                    if (e.target !== close) {
                        this.toggleMaximize();
                    }
                });

                // Tab right click context menu
                tab.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    this.setActive(index);
                    this.layoutManager.showContextMenu(e, this, child, index);
                });

                // Tab drag
                tab.addEventListener('mousedown', (e) => {
                    if (e.target !== close && this.children.length > 0 && e.button === 0) {
                        e.preventDefault(); // Prevent text selection
                        DragManager.pendDrag(e, child.config, 'tab', this, child.config.title);
                    }
                });
            });
            this.updateOverflow();
        }

        updateOverflow() {
            let tabs = Array.from(this.tabsEl.querySelectorAll('.tulweb-tab'));
            tabs.forEach(t => t.style.display = '');

            if (this.overflowBtn) this.overflowBtn.style.display = 'none';
            if (this.dropdownEl) this.dropdownEl.style.display = 'none';

            if (tabs.length <= 1) return;

            const isVertical = this.tabPosition === 'left' || this.tabPosition === 'right';

            // Add 8px to account for the container's padding-left/top 
            let totalSize = tabs.reduce((w, t) => w + (isVertical ? t.offsetHeight : t.offsetWidth) + 2, 0) + 8;
            let maxSize = isVertical ? this.tabsEl.clientHeight : this.tabsEl.clientWidth;

            if (totalSize <= maxSize) return;

            if (!this.overflowBtn) {
                this.overflowBtn = Utils.createElement('div', 'tulweb-tab-overflow', this.headerEl);
                this.overflowBtn.innerHTML = '‹›';
                this.headerEl.insertBefore(this.overflowBtn, this.controlsEl);

                this.dropdownEl = Utils.createElement('div', 'tulweb-dropdown', this.element);
                this.dropdownEl.style.display = 'none';

                this.overflowBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const show = this.dropdownEl.style.display === 'none';
                    this.dropdownEl.style.display = show ? 'block' : 'none';
                    if (show) this.renderDropdown();
                });

                document.addEventListener('mousedown', (e) => {
                    if (this.dropdownEl && !this.dropdownEl.contains(e.target) && e.target !== this.overflowBtn) {
                        this.dropdownEl.style.display = 'none';
                    }
                });
            }

            this.overflowBtn.style.display = 'flex';
            this.hiddenTabs = [];

            const maxW = maxSize - 30; // space for btn
            for (let i = tabs.length - 1; i >= 0; i--) {
                if (totalSize <= maxW) break;
                if (i === this.activeChildIndex) continue;

                tabs[i].style.display = 'none';
                totalSize -= ((isVertical ? tabs[i].offsetHeight : tabs[i].offsetWidth) + 2);
                this.hiddenTabs.push(this.children[i]);
            }
            this.hiddenTabs.reverse();
        }

        renderDropdown() {
            this.dropdownEl.innerHTML = '';
            this.hiddenTabs.forEach(child => {
                const item = Utils.createElement('div', 'tulweb-dropdown-item', this.dropdownEl);
                item.textContent = child.config.title || child.config.componentName || 'Tab';
                item.addEventListener('click', () => {
                    const index = this.children.indexOf(child);
                    this.setActive(index);
                    this.dropdownEl.style.display = 'none';
                });
            });
        }

        setActive(index) {
            this.activeChildIndex = index;
            if (this.isMinimized) {
                this.toggleMinimize();
            } else {
                this.renderTabs();
                this.showActiveChild();
            }
        }

        showActiveChild() {
            const isStackFocused = this.layoutManager.activeStack === this;

            this.children.forEach((child, index) => {
                const shouldBeActive = index === this.activeChildIndex;
                const shouldBeFocused = shouldBeActive && isStackFocused;

                if (shouldBeActive) {
                    child.element.style.display = 'block';
                } else {
                    child.element.style.display = 'none';
                }

                if (shouldBeActive !== child._isActive) {
                    child._isActive = shouldBeActive;
                    if (shouldBeActive) {
                        child.emit('active');
                        if (this.layoutManager.settings && this.layoutManager.settings.onlyResizeActiveTabs) {
                            child.emit('resize');
                        }
                    }
                    else child.emit('inactive');
                }

                if (shouldBeFocused !== child._isFocused) {
                    child._isFocused = shouldBeFocused;
                    if (shouldBeFocused) child.emit('focus');
                    else child.emit('defocus');
                }
            });
        }

        updateFlex() {
            if (this.isMinimized) {
                this.element.style.flex = '0 0 auto';
                const isVertical = this.tabPosition === 'left' || this.tabPosition === 'right';
                if (isVertical) {
                    this.element.style.width = 'calc(var(--tulweb-tab-height) + 2px)';
                    this.element.style.height = '100%';
                } else {
                    this.element.style.height = 'calc(var(--tulweb-tab-height) + 2px)';
                    this.element.style.width = '100%';
                }
            } else {
                // Clear any manual width/height set during minimize
                this.element.style.width = '';
                this.element.style.height = '';
                super.updateFlex();
            }

            const onlyActive = this.layoutManager.settings && this.layoutManager.settings.onlyResizeActiveTabs;

            // Propagate resize events to the leaf components so they can react to dimensions
            this.children.forEach((child, index) => {
                if (onlyActive && index !== this.activeChildIndex) return;
                child.emit('resize');
            });
        }

        toggleMinimize() {
            this.isMinimized = !this.isMinimized;
            if (this.isMinimized) {
                this.element.classList.add('minimized');
            } else {
                this.element.classList.remove('minimized');
                this.element.classList.remove('previewing');
            }
            this.updateFlex();
            if (this.parent) this.parent.updateLayout();
        }

        toggleMaximize() {
            this.isMaximized = !this.isMaximized;
            if (this.isMaximized) {
                this.element.classList.add('maximized');
                this.maxBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M4 4h4v2H6v4H4V4zm16 0h-4v2h2v4h2V4zM4 20h4v-2H6v-4H4v6zm16 0h-4v-2h2v-4h2v6z"/></svg>';
            } else {
                this.element.classList.remove('maximized');
                this.maxBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M4 4h16v16H4V4zm2 2v12h12V6H6z"/></svg>';
            }
        }

        closeAll() {
            const kids = [...this.children];
            kids.forEach(child => child.destroy());
            this.layoutManager._cleanupEmptyStack(this)
        }

        toConfig() {
            const res = super.toConfig();
            if (this.tabPosition !== 'top') {
                res.tabPosition = this.tabPosition;
            }
            return res;
        }
    }


    class ContainerItem extends ContentItem {
        constructor(config, layoutManager) {
            super(config, layoutManager);
            this.splitters = [];
        }

        destroy() {
            this.splitters.forEach(s => s.destroy());
            this.splitters = [];
            super.destroy();

        }

        updateFlex() {
            super.updateFlex();
            this.children.forEach(child => {
                if (child.updateFlex) {
                    child.updateFlex();
                }
            });
        }

        createDOM() {
            this.element = document.createElement('div');
            this.element.className = this.config.type === 'row' ? 'tulweb-row' : 'tulweb-column';
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
            // Ensure sizes sum to 100 roughly
            if (this.children.length > 0) {
                let totalSize = this.children.reduce((sum, c) => sum + (c.size || 0), 0);
                if (totalSize === 0) {
                    // Distribute equally
                    const p = 100 / this.children.length;
                    this.children.forEach(c => c.size = p);
                } else if (Math.abs(totalSize - 100) > 1) {
                    // Normalize
                    this.children.forEach(c => c.size = (c.size / totalSize) * 100);
                }
            }

            // Rebuild DOM and Splitters
            this.element.innerHTML = '';
            this.splitters.forEach(s => s.destroy());
            this.splitters = [];

            const isVertical = this.config.type === 'row';

            this.children.forEach((child, index) => {
                this.element.appendChild(child.element);
                child.updateLayout();

                if (index < this.children.length - 1) {
                    const splitter = new Splitter(isVertical, child, this.children[index + 1], this.element);
                    this.splitters.push(splitter);
                }
            });

            this.updateFlex();
        }
    }

    class RowItem extends ContainerItem { }
    class ColumnItem extends ContainerItem { }


    // --- Public Layout Manager ---

    class LayoutManager extends EventEmitter {
        constructor(config, container, options = {}) {
            super();
            this.container = container;
            this.componentFactories = {};
            this.root = null;
            this.settings = Object.assign({
                onlyResizeActiveTabs: true,
                enableMinimize: true,
                enablePreview: false
            }, config && config.settings ? config.settings : {}, options);

            // Create root DOM element
            this.rootElement = Utils.createElement('div', 'tulweb-root', container);

            // Add toast container
            this.toastContainer = Utils.createElement('div', 'tulweb-toast-container', document.body);

            this.activeStack = null;

            DragManager.init(this);

            if (config) {
                this.loadLayout(config);
            }

            // Handle window resize
            window.addEventListener('resize', () => {
                this.updateLayout();
            });

            this.initShortcuts();
        }

        registerComponent(name, factoryMethod) {
            this.componentFactories[name] = factoryMethod;
        }

        createDragSource(element, itemConfig) {
            return new DragSource(element, itemConfig, this);
        }

        loadLayout(config) {
            this.rootElement.innerHTML = '';
            if (config && config.settings) {
                this.settings = Object.assign(this.settings, config.settings);
            }
            if (!config || !config.content || config.content.length === 0) {
                this.root = null;
                this.renderEmptyState();
                return;
            }

            // Config usually wraps in Row or Column.
            this.root = this._buildObjectTree(config.content[0]);
            this.rootElement.appendChild(this.root.element);
            this.root.updateLayout();
        }

        _buildObjectTree(itemConfig) {
            let item;
            if (itemConfig.type === 'row') item = new RowItem(itemConfig, this);
            else if (itemConfig.type === 'column') item = new ColumnItem(itemConfig, this);
            else if (itemConfig.type === 'stack') item = new StackItem(itemConfig, this);
            else if (itemConfig.type === 'component') item = new ComponentItem(itemConfig, this);
            else throw new Error("Unknown type: " + itemConfig.type);

            if (itemConfig.content) {
                itemConfig.content.forEach(childConfig => {
                    item.addChild(this._buildObjectTree(childConfig), undefined, true);
                });
            }
            return item;
        }

        showContextMenu(evt, stack, child, index) {
            if (this.contextMenu) {
                if (this.contextMenu.parentElement) this.contextMenu.parentElement.removeChild(this.contextMenu);
            }
            const menu = Utils.createElement('div', 'tulweb-context-menu', document.body);
            menu.style.left = evt.clientX + 'px';
            menu.style.top = evt.clientY + 'px';

            const addOption = (text, onClick) => {
                const item = Utils.createElement('div', 'tulweb-context-item', menu);
                item.textContent = text;
                item.addEventListener('mousedown', (e) => {
                    e.stopPropagation();
                });
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    onClick();
                    closeMenu();
                });
            };

            addOption('Close Tab', () => {
                child.destroy();
            });
            addOption('Close Other Tabs', () => {
                const toClose = stack.children.filter(c => c.id !== child.id);
                toClose.forEach(c => c.destroy());
            });
            addOption('Close All Tabs', () => {
                stack.closeAll();
            });

            this.contextMenu = menu;
            const closeMenu = () => {
                if (this.contextMenu) {
                    if (this.contextMenu.parentElement) this.contextMenu.parentElement.removeChild(this.contextMenu);
                    this.contextMenu = null;
                }
                document.removeEventListener('mousedown', closeMenu);
            };
            setTimeout(() => document.addEventListener('mousedown', closeMenu), 0);
        }

        initShortcuts() {
            document.addEventListener('keydown', (e) => {
                if (e.ctrlKey || e.metaKey) {
                    if (e.key.toLowerCase() === 's') {
                        e.preventDefault();
                        const btn = document.getElementById('btn-save');
                        if (btn) btn.click();
                    }
                    if (e.key.toLowerCase() === 'w') {
                        let active = this.activeStack;
                        if (!active) {
                            const stacks = Array.from(this.rootElement.querySelectorAll('.tulweb-stack'))
                                .map(el => el.tulwebItem)
                                .filter(s => s && s instanceof StackItem && s.children.length > 0);
                            if (stacks.length > 0) active = stacks[0];
                        }
                        if (active && active.children.length > 0) {
                            e.preventDefault();
                            const idx = active.activeChildIndex;
                            const child = active.children[idx];
                            child.destroy();
                        }
                    }
                }
                if (e.altKey) {
                    if (['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                        e.preventDefault();
                        this.navigateFocus(e.key);
                    }
                }
            });
        }

        navigateFocus(key) {
            if (!this.activeStack || !this.activeStack.element) return;
            const stacks = Array.from(this.rootElement.querySelectorAll('.tulweb-stack'))
                .map(el => el.tulwebItem)
                .filter(s => s && s instanceof StackItem);

            const currentRect = this.activeStack.element.getBoundingClientRect();
            const cx = currentRect.left + currentRect.width / 2;
            const cy = currentRect.top + currentRect.height / 2;

            let bestStack = null;
            let bestDist = Infinity;

            stacks.forEach(s => {
                if (s === this.activeStack) return;
                const r = s.element.getBoundingClientRect();
                const tx = r.left + r.width / 2;
                const ty = r.top + r.height / 2;

                let valid = false;
                if (key === 'ArrowRight' && tx > cx) valid = true;
                if (key === 'ArrowLeft' && tx < cx) valid = true;
                if (key === 'ArrowDown' && ty > cy) valid = true;
                if (key === 'ArrowUp' && ty < cy) valid = true;

                if (valid) {
                    const dist = Math.pow(tx - cx, 2) + Math.pow(ty - cy, 2);
                    if (dist < bestDist) {
                        bestDist = dist;
                        bestStack = s;
                    }
                }
            });

            if (bestStack) {
                this.setActiveStack(bestStack);
            }
        }

        updateLayout() {
            if (this.root) {
                this.root.updateLayout();
            }
            this.emit('stateChanged');
        }

        toConfig() {
            return {
                settings: {
                    hasHeaders: true
                },
                dimensions: {},
                content: this.root ? [this.root.toConfig()] : []
            };
        }

        // Helper: cleans up stacks when empty, or simplifies tree
        _cleanupEmptyStack(stackItem) {
            if (this.activeStack === stackItem) {
                this.setActiveStack(null);
            }

            const parent = stackItem.parent;
            if (!parent) {
                // It's the root. If it's a stack and empty, clear root
                if (stackItem.children.length === 0) {
                    this.rootElement.innerHTML = '';
                    this.root = null;
                    this.renderEmptyState();
                }
                return;
            }

            // Remove stack from parent
            parent.removeChild(stackItem);

            // If parent is now empty, clean it up recursively
            if (parent.children.length === 0) {
                this._cleanupEmptyStack(parent);
            }
            // If parent is Row/Col and has only 1 child, simplify tree
            else if (parent.children.length === 1 && parent !== this.root) {
                const singleChild = parent.children[0];
                const grandParent = parent.parent;

                if (grandParent) {
                    const pIndex = grandParent.children.indexOf(parent);
                    singleChild.size = parent.size;
                    grandParent.replaceChild(parent, singleChild, pIndex);
                } else {
                    // Parent is root, replace root
                    this.root = singleChild;
                    this.root.parent = null;
                    this.rootElement.innerHTML = '';
                    this.rootElement.appendChild(this.root.element);
                    this.root.updateLayout();
                }
            }
        }

        showToast(message, type = 'info') {
            const toast = Utils.createElement('div', 'tulweb-toast', this.toastContainer);
            if (type === 'error') toast.classList.add('error');

            // Icon
            const icon = type === 'error' ?
                '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>' :
                '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';

            toast.innerHTML = icon + '<span>' + message + '</span>';

            setTimeout(() => {
                toast.classList.add('hiding');
                setTimeout(() => {
                    if (toast.parentElement) toast.parentElement.removeChild(toast);
                }, 300);
            }, 3000);
        }

        renderEmptyState() {
            if (this.root) return;
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
            `;
        }

        setActiveStack(stack) {
            if (this.activeStack === stack) return;

            if (this.activeStack && this.activeStack.element) {
                this.activeStack.element.classList.remove('active-stack');
                if (this.activeStack.children) {
                    const oldActive = this.activeStack.children[this.activeStack.activeChildIndex];
                    if (oldActive && oldActive._isFocused) {
                        oldActive._isFocused = false;
                        oldActive.emit('defocus');
                    }
                }
            }

            this.activeStack = stack;

            if (this.activeStack && this.activeStack.element && this.activeStack.children) {
                this.activeStack.element.classList.add('active-stack');
                const newActive = this.activeStack.children[this.activeStack.activeChildIndex];
                if (newActive && newActive._isActive && !newActive._isFocused) {
                    newActive._isFocused = true;
                    newActive.emit('focus');
                }
            }
        }
    }


    // Expose API
    return {
        LayoutManager,
        DragSource,
        utils: Utils
    };

})();
