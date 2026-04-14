# TulWEB Performance & Framework Integration Review

> Full audit of the TulWEB windowing toolkit (v2.5.0) for performance bottlenecks and React/Angular integration readiness.

---

## Summary

| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| Performance | 2 | 4 | 3 | 2 |
| Framework Integration | 2 | 3 | 2 | 1 |

---

## Part 1: Performance Issues

### 🔴 CRITICAL — P1: ContainerItem.updateLayout() rebuilds the entire DOM on every call

**File:** [ContainerItem.js](file:///Users/madnerd/tul/src/core/ContainerItem.js#L54-L87)

```js
updateLayout() {
    // ...
    this.element.innerHTML = ''           // ← Nukes all children
    this.splitters.forEach(s => s.destroy())
    this.splitters = []

    this.children.forEach((child, index) => {
        this.element.appendChild(child.element)
        child.updateLayout()              // ← Recursive! Every child does the same
        // ...splitter creation...
    })
    this.updateFlex()
}
```

**Impact:** Every layout change — adding a child, removing a child, resizing, window resize — causes a **full DOM teardown and rebuild** of the entire row/column subtree. This triggers:
- Layout thrashing (read–write–read–write cycles on the DOM)
- Forced synchronous reflows on every `appendChild`
- Splitter objects created & destroyed on every call (GC pressure)

**Triggers in the current code:**
- `ContentItem.addChild()` → `updateLayout()`
- `ContentItem.removeChild()` → `updateLayout()`
- `ContentItem.replaceChild()` → `updateLayout()`
- `ContentItem.detachChild()` → `updateLayout()`
- `LayoutManager.updateLayout()` → `root.updateLayout()` (recursive)
- Window resize (debounced, but still full rebuild)

**Fix:** Diff the children instead of wiping `innerHTML`. Only create/destroy splitters that actually changed. Use a `DocumentFragment` for batch DOM insertions when rebuilding is truly needed.

```js
// Proposed approach
updateLayout() {
    this._normalizeSizes()

    const currentChildren = Array.from(this.element.children)
        .filter(el => !el.classList.contains('tulweb-splitter'))
    const desiredChildren = this.children.map(c => c.element)

    // Only rebuild if the set of children actually changed
    if (!this._childrenMatch(currentChildren, desiredChildren)) {
        this._rebuildDOM()
    }

    this.children.forEach(child => child.updateLayout())
    this.updateFlex()
}
```

---

### 🔴 CRITICAL — P2: StackItem.renderTabs() uses innerHTML on every tab switch

**File:** [StackItem.js](file:///Users/madnerd/tul/src/core/StackItem.js#L186-L277)

```js
renderTabs() {
    if (this.tabPosition === 'headless') return
    this.tabsEl.innerHTML = ''       // ← Destroys ALL tab elements
    this.children.forEach((child, index) => {
        const tab = Utils.createElement('div', 'tulweb-tab', this.tabsEl)
        // ... creates tab element from scratch
        // ... attaches 7+ event listeners per tab
    })
}
```

**Impact:** Simply clicking a tab calls `setActive()` → `renderTabs()`, which:
1. Destroys every tab DOM node (and their 7+ event listeners each)
2. Recreates them from scratch
3. Re-attaches all event listeners

For a stack with 20 tabs, that's **140+ event listener registrations per click**. Event listeners from the old nodes become garbage but are only collected when the GC runs.

**Fix:** Toggle the `.active` class on existing tabs instead of rebuilding. Only re-render tabs when the tab list itself changes (add/remove/reorder).

```js
setActive(index) {
    // ...
    // Just toggle the active class — don't rebuild
    const tabs = this.tabsEl.querySelectorAll('.tulweb-tab')
    tabs.forEach((tab, i) => {
        tab.classList.toggle('active', i === index)
        tab.setAttribute('aria-selected', i === index ? 'true' : 'false')
        tab.setAttribute('tabindex', i === index ? '0' : '-1')
    })
    this.showActiveChild()
    // ...
}
```

---

### 🟠 HIGH — P3: Cascading updateLayout() storms

**File:** [ContentItem.js](file:///Users/madnerd/tul/src/core/ContentItem.js#L28-L58)

Both `addChild()` and `removeChild()` call `this.updateLayout()`. But `updateLayout()` in `ContainerItem` recursively calls `child.updateLayout()` on every child. When operations are batched (e.g., closing all tabs, restoring from popout), this creates an **exponential cascade**.

Example chain from `StackItem.closeAll()`:
```
closeAll() → child.destroy()
  → parent.removeChild() → updateLayout() [full rebuild]
    → [next child] → destroy()
      → parent.removeChild() → updateLayout() [full rebuild again]
```

**Fix:** Add a batching mechanism — defer layout updates until the batch completes:

```js
batchUpdate(fn) {
    this._layoutDeferred = true
    fn()
    this._layoutDeferred = false
    this.updateLayout()
}
```

---

### 🟠 HIGH — P4: Splitter drag fires updateFlex() per pixel without requestAnimationFrame

**File:** [Splitter.js](file:///Users/madnerd/tul/src/ui/Splitter.js#L121-L193)

```js
_onMouseMove(e) {
    // ... calculations ...
    this.prevItem.updateFlex()    // Triggers reflow
    this.nextItem.updateFlex()    // Triggers another reflow
}
```

**Impact:** On a 60Hz display, `mousemove` fires ~60 times/sec, but can fire even more. Each call:
1. Sets multiple style properties (flex, width, height, minWidth, minHeight) — triggering style recalc
2. Calls `emit('resize')` on both items (via `updateFlex()` → `ContentItem.updateFlex()`)
3. Forces two synchronous reflows

**Fix:** Throttle with `requestAnimationFrame`:
```js
_onMouseMove(e) {
    if (this._rafPending) return
    this._rafPending = true
    requestAnimationFrame(() => {
        this._rafPending = false
        this._applyResize(e)
    })
}
```

---

### 🟠 HIGH — P5: EventEmitter iterates listener array during emit without copy

**File:** [EventEmitter.js](file:///Users/madnerd/tul/src/utils/EventEmitter.js#L20-L28)

```js
emit(event, ...args) {
    let result = true
    if (this._listeners[event]) {
        for (const cb of this._listeners[event]) {  // ← iterates live array
            if (cb(...args) === false) result = false
        }
    }
    return result
}
```

**Impact:** If a listener calls `off()` or `once()` unregisters itself during emit, the live array is mutated mid-iteration. This can cause:
- Skipped listeners
- Subtle race conditions during drag/drop and popout lifecycle

The `once()` implementation removes via `off()` inside the callback, which modifies the array while `emit` is iterating it.

**Fix:** Iterate a snapshot:
```js
emit(event, ...args) {
    const listeners = this._listeners[event]
    if (!listeners) return true
    const snapshot = [...listeners]  // ← copy
    let result = true
    for (const cb of snapshot) {
        if (cb(...args) === false) result = false
    }
    return result
}
```

---

### 🟠 HIGH — P6: updateOverflow() always sets `hiddenTabs = this.children`

**File:** [StackItem.js](file:///Users/madnerd/tul/src/core/StackItem.js#L279-L320)

```js
updateOverflow() {
    // ...
    // Keep all tabs in dropdown for convenience jumping
    this.hiddenTabs = this.children   // ← Always ALL children, never just hidden ones
}
```

This means the dropdown always renders **every** tab, not just the overflowed ones. It also keeps a reference to the live children array, meaning `hiddenTabs` is always identical to `children` — a redundant allocation/reference that misleads the code's intent.

**Fix:** Filter to only truly hidden tabs:
```js
const containerEnd = isVertical ? containerRect.bottom : containerRect.right
this.hiddenTabs = this.children.filter((child, i) => {
    const tab = tabs[i]
    if (!tab) return true
    const rect = tab.getBoundingClientRect()
    return isVertical ? rect.bottom > containerEnd : rect.right > containerEnd
})
```

---

### 🟡 MEDIUM — P7: `document` global listeners leak in Splitter.destroy()

**File:** [Splitter.js](file:///Users/madnerd/tul/src/ui/Splitter.js#L207-L213)

```js
destroy() {
    this.element.removeEventListener('mousedown', this._onMouseDown)
    this.element.removeEventListener('dblclick', this._onDblClick)
    // ❌ Missing: does NOT remove document-level mousemove/mouseup listeners
    // if the splitter is destroyed while actively being dragged
}
```

**Impact:** If a splitter is destroyed mid-drag (e.g., a child closes while user is resizing), the `mousemove` and `mouseup` handlers on `document` are never cleaned up — they become orphaned listeners that reference a destroyed splitter.

**Fix:** Call `_onMouseUp()` in `destroy()` or explicitly remove document listeners:
```js
destroy() {
    if (this.isDragging) {
        this._onMouseUp()
    }
    this.element.removeEventListener('mousedown', this._onMouseDown)
    this.element.removeEventListener('dblclick', this._onDblClick)
    // ...
}
```

---

### 🟡 MEDIUM — P8: `navigateFocus()` queries the entire DOM every invocation

**File:** [LayoutManager.js](file:///Users/madnerd/tul/src/LayoutManager.js#L180-L217)

```js
navigateFocus(key) {
    const stacks = Array.from(this.rootElement.querySelectorAll('.tulweb-stack'))
        .map(el => el.tulwebItem)
        .filter(s => s && s instanceof StackItem)
    // ...getBoundingClientRect() on every stack for distance calc
}
```

**Impact:** Every Alt+Arrow keystroke does a full DOM query + multiple `getBoundingClientRect()` calls. This is also done in `handleGlobalKeydown` for Ctrl+W. For complex layouts with many stacks, this becomes a noticeable hitch.

**Fix:** Use `getAllStacks()` which uses the tree traversal instead of DOM queries:
```js
navigateFocus(key) {
    const stacks = this.getAllStacks()
    // ...
}
```

---

### 🟡 MEDIUM — P9: DragSource deep-clones config with JSON.parse(JSON.stringify()) on every mousedown

**File:** [DragSource.js](file:///Users/madnerd/tul/src/ui/DragSource.js#L8-L11)

```js
const startHandler = (e) => {
    const configCopy = JSON.parse(JSON.stringify(this.itemConfig))
    // ...
}
```

**Impact:** `JSON.parse(JSON.stringify())` is the slowest possible way to deep-clone an object. This runs on every `mousedown` event on drag sources — even if the drag never starts (user just clicks).

**Fix:** Defer the clone to `startDrag()` (after the drag threshold is met), and use `structuredClone()` or a manual shallow copy (configs are flat objects):
```js
const startHandler = (e) => {
    this.layoutManager.dragManager.pendDrag(e, this.itemConfig, 'external', null, this.itemConfig.title)
}
// Clone inside startDrag() only when drag actually begins
```

---

### 🟢 LOW — P10: `backdrop-filter: blur()` on every stack element

**File:** [tulweb.css](file:///Users/madnerd/tul/src/tulweb.css#L268-L269)

```css
.tulweb-stack {
    backdrop-filter: blur(var(--tulweb-blur));
    -webkit-backdrop-filter: blur(var(--tulweb-blur));
}
```

**Impact:** `backdrop-filter` is GPU-composited but expensive — it requires rendering the element's backdrop to an offscreen buffer, blurring it, then compositing. With many stacks visible, this can cause jank on lower-end devices.

**Fix:** Consider only applying blur on the active stack or making it opt-in via a `--tulweb-blur: 0px` override for performance-sensitive deployments. The retro theme already does `--tulweb-blur: 0px`.

---

### 🟢 LOW — P11: Toast container appended to `document.body` regardless of Shadow DOM

**File:** [LayoutManager.js](file:///Users/madnerd/tul/src/LayoutManager.js#L29)

```js
this.toastContainer = Utils.createElement('div', 'tulweb-toast-container', document.body)
```

Similarly, the DragManager appends indicators to `document.body` ([DragManager.js:39](file:///Users/madnerd/tul/src/managers/DragManager.js#L39)).

**Impact:** Minor perf concern but primarily an integration issue — these elements leak outside the library's container.

---

## Part 2: Framework Integration Issues

### 🔴 CRITICAL — F1: Imperative DOM mutation conflicts with React/Angular change detection

**The core problem:** TulWEB mutates the DOM directly via `element.innerHTML`, `appendChild()`, `removeChild()`, and style property assignments. React and Angular both expect to **own** the DOM subtree they manage.

**Specific conflicts:**

| Framework | Conflict |
|-----------|----------|
| **React** | React's reconciler will be confused when TulWEB removes or moves DOM nodes that React created inside a component panel. React stores a reference to the DOM node and expects it to remain in place. |
| **Angular** | Angular's `NgZone` won't detect TulWEB's DOM changes (they happen outside Angular's zone). Template bindings and `*ngIf`/`*ngFor` will not update. `ChangeDetectionStrategy.OnPush` components will not re-render. |

**Impact:** Components rendered inside TulWEB panels that are managed by React/Angular will:
- Lose state when tabs are moved (drag/drop)
- Break when panels are popped out (`document.adoptNode()` moves the React root)
- Fail to update when Angular re-runs change detection
- Potentially memory-leak because framework cleanup never runs

**Fix — Recommended wrapper pattern:**

```jsx
// React wrapper example
function TulWebPanel({ layoutManager, componentName, children }) {
    const containerRef = useRef(null)
    const rootRef = useRef(null)

    useEffect(() => {
        layoutManager.registerComponent(componentName, (state, component) => {
            const container = document.createElement('div')

            // Create a React root inside the container TulWEB manages
            rootRef.current = createRoot(container)
            rootRef.current.render(children)

            // Listen for TulWEB lifecycle
            component.on('destroy', () => {
                rootRef.current?.unmount()
                rootRef.current = null
            })

            component.on('resize', () => {
                // Notify React children of size change
            })

            return container
        })

        return () => rootRef.current?.unmount()
    }, [])

    return null
}
```

**Library-side improvements needed:**
1. The factory function pattern in `ComponentItem.renderAppContent()` is actually good for integration — it defers DOM creation. But the library needs to **guarantee** it won't touch the subtree the factory returns.
2. Add a `component.getContainerElement()` API so frameworks know exactly where to mount.

---

### 🔴 CRITICAL — F2: No programmatic mount/unmount lifecycle for components

**File:** [ComponentItem.js](file:///Users/madnerd/tul/src/core/ComponentItem.js#L18-L49)

The component factory is called once (`renderAppContent()`), but there is **no corresponding unmount hook** beyond the generic `destroy` event. The component lifecycle is:

```
create → init → [active/inactive, focus/defocus, resize] → beforeClose → destroy
```

**Missing for frameworks:**
- **`willMove` / `didMove`** — Before/after a component is moved to a new stack (drag/drop). React portals or Angular's `ViewContainerRef.move()` need this.
- **`willAdopt` / `didAdopt`** — Before/after `document.adoptNode()` during popout. This is destructive to framework bindings.
- **`suspend` / `resume`** — For when a tab becomes inactive. React 18+ concurrent features and Angular's `OnPush` need to know when to pause/resume.
- **Synchronous `beforeDestroy`** — The current `beforeClose` can return `false` to cancel, but frameworks need a guaranteed synchronous cleanup hook that always runs.

**Fix:** Add explicit lifecycle events:
```js
// In ComponentItem
moveToStack(newStack) {
    this.emit('willMove', { source: this.parent, target: newStack })
    // ... move logic ...
    this.emit('didMove', { source: oldParent, target: newStack })
}
```

---

### 🟠 HIGH — F3: State management is internal and opaque

**File:** [ComponentItem.js](file:///Users/madnerd/tul/src/core/ComponentItem.js#L52-L59)

```js
setState(state) {
    this.config.componentState = Object.assign({}, this.config.componentState, state)
    this.layoutManager.emit('stateChanged')
}
```

**Problem for frameworks:**
1. `setState()` uses `Object.assign` (shallow merge) — not compatible with React's immutable state model
2. No way to **subscribe** to state changes on a specific component
3. `stateChanged` on LayoutManager is too broad — it fires for every state change across every component (tab switches, resizes, etc.), making it useless for targeted updates
4. No way to distinguish between layout state changes and user state changes

**Fix:** 
- Add a `component.on('stateChanged', callback)` event
- Consider making `setState` accept a callback or return a promise
- Separate layout events (`layoutChanged`) from component state events

---

### 🟠 HIGH — F4: `document.adoptNode()` in popout breaks React/Angular

**File:** [PopoutManager.js](file:///Users/madnerd/tul/src/managers/PopoutManager.js#L107-L120)

```js
const performTransfer = () => {
    childWindow.document.adoptNode(stack.element)
    destContainer.appendChild(stack.element)
}
```

**Impact:** `document.adoptNode()` physically moves a DOM subtree to a new document. This:
- Disconnects React's fiber tree from the DOM (React doesn't support cross-document moves)
- Breaks Angular's `ComponentRef` and `ViewContainerRef` bindings
- Invalidates all `MutationObserver` subscriptions
- Resets all `IntersectionObserver` observations
- All framework-managed event listeners bound to the old document become dead

**Fix:** Instead of adopting framework-managed DOM, provide a `PopoutRenderer` hook:
```js
layoutManager.on('popoutCreated', ({ popoutId, window: popoutWindow }) => {
    // Framework re-renders into the new window
    const root = createRoot(popoutWindow.document.getElementById('tulweb-popout-root'))
    root.render(<PopoutContent />)
})
```

Or allow frameworks to register a `transferStrategy`:
```js
layoutManager.registerTransferStrategy('react', {
    beforeAdopt(stack, targetDoc) {
        // Unmount React tree
    },
    afterAdopt(stack, targetDoc) {
        // Re-mount React tree in new document
    }
})
```

---

### 🟠 HIGH — F5: Global event listeners make multiple instances impossible

**File:** [LayoutManager.js](file:///Users/madnerd/tul/src/LayoutManager.js#L50-L55)

```js
window.addEventListener('resize', this._onWindowResize)
document.addEventListener('keydown', this._onKeyDown)
```

**File:** [DragManager.js](file:///Users/madnerd/tul/src/managers/DragManager.js#L39-L48)
```js
this.indicator = Utils.createElement('div', 'tulweb-drop-indicator', document.body)
this.tabIndicator = Utils.createElement('div', 'tulweb-tab-drop-indicator', document.body)
```

**File:** [ContextMenu.js](file:///Users/madnerd/tul/src/ui/ContextMenu.js#L6)
```js
this.element = Utils.createElement('div', 'tulweb-context-menu', document.body)
```

**Impact:** 
- Multiple TulWEB instances on the same page will conflict (competing keyboard shortcuts, indicators appended to body)
- React/Angular apps often mount/unmount components — each mount creates new global listeners without guaranteed cleanup
- The `Ctrl+W` handler calls `preventDefault()` globally, blocking the browser's close-tab behavior even when TulWEB isn't focused

**Fix:**
1. Scope keyboard events to the container element instead of `document`:
   ```js
   this.rootElement.setAttribute('tabindex', '-1')
   this.rootElement.addEventListener('keydown', this._onKeyDown)
   ```
2. Append overlay elements (indicators, context menus) to `this.rootElement` or a dedicated overlay container, not `document.body`
3. Add a `scoped: true` option for framework consumers

---

### 🟡 MEDIUM — F6: No way to integrate with framework routing

**Impact:** In React Router or Angular Router apps, the "active component" in a panel might need to change based on route. There's no API to:
- Map routes to components/tabs
- Programmatically activate a tab by component name or ID
- Serialize/restore layout state to/from URL parameters

**Fix:** Expose navigation primitives:
```js
layoutManager.activateComponent(componentId)
layoutManager.activateComponentByName(name)
layoutManager.getActiveComponent()  // returns ComponentItem
```

The `getItemById()` and `setActive()` methods exist but aren't composed into a convenient top-level API.

---

### 🟡 MEDIUM — F7: Class detection in ComponentItem is fragile

**File:** [ComponentItem.js](file:///Users/madnerd/tul/src/core/ComponentItem.js#L28-L29)

```js
const isClass = typeof factory === 'function' &&
    (factory.isClass || (factory.prototype && factory.prototype.constructor.toString().includes('class')))
```

**Impact:** `constructor.toString().includes('class')` is:
- Broken by minification/uglification (which rewrites `class` to function syntax)
- Doesn't work with transpiled TypeScript classes
- Doesn't work with Babel's class transform

**Fix:** Use `factory.isClass` exclusively (explicit opt-in) or detect via `Reflect.construct`:
```js
function isClass(fn) {
    try {
        Reflect.construct(String, [], fn)
        return true
    } catch (e) {
        return false
    }
}
```

Or better yet, remove the class/function distinction entirely — always treat factories as plain functions and let consumers wrap classes themselves.

---

### 🟢 LOW — F8: No TypeScript definitions

**Impact:** React and Angular projects are overwhelmingly TypeScript. Without `.d.ts` files, consumers get no autocomplete, no type checking, and must write their own declarations.

**Fix:** Add a `types/tulweb.d.ts` with type declarations for the public API. This doesn't require converting the source to TypeScript — just maintaining a declaration file.

---

## Part 3: Quick Wins (Easy Fixes, High Impact)

| # | Fix | Effort | Impact |
|---|-----|--------|--------|
| 1 | **Don't re-render tabs on `setActive()`** — just toggle CSS classes | Small | 🔴 Eliminates the biggest per-interaction bottleneck |
| 2 | **Snapshot listeners in `emit()`** | Tiny | 🟠 Prevents subtle bugs during drag/popout |
| 3 | **Add `requestAnimationFrame` to splitter drag** | Tiny | 🟠 Halves reflow work during resize |
| 4 | **Defer DragSource config clone to `startDrag()`** | Tiny | 🟡 Removes wasted work on every click |
| 5 | **Scope keyboard handlers to root element** | Small | 🟠 Enables multi-instance and framework compat |
| 6 | **Add `willMove`/`didMove` events** | Small | 🔴 Unblocks framework integration for drag/drop |
| 7 | **Add `destroy` lifecycle guarantee** | Small | 🟠 Prevents memory leaks in React/Angular |

---

## Part 4: Recommended Architecture Changes for Framework Integration

### Option A: Wrapper Libraries (Non-Breaking)

Create thin wrapper packages (`@tulweb/react`, `@tulweb/angular`) that:
1. Handle mounting/unmounting React/Angular components inside TulWEB panels
2. Proxy TulWEB lifecycle events to framework lifecycle hooks
3. Manage state synchronization between TulWEB and the framework's state management

This is the approach used by [GoldenLayout](https://github.com/nicknisi/golden-layout-react), [ag-Grid](https://www.ag-grid.com/), and [Allotment](https://github.com/johnwalley/allotment).

### Option B: Headless Core (Breaking, Long-Term)

Separate the layout engine (tree, sizing, serialization) from the DOM renderer. Provide:
- A **headless core** that manages the layout tree and emits structural events
- A **vanilla renderer** (current behavior)
- A **React renderer** using portals and context
- An **Angular renderer** using dynamic components

This follows the pattern of [Lexical](https://lexical.dev/) and [TanStack Table](https://tanstack.com/table).

### Recommendation

**Start with Option A** (wrapper libraries) — it's non-breaking and covers 90% of use cases. The current factory-function pattern in `registerComponent()` is actually a solid foundation for this approach. The main blockers are the lifecycle gaps (F2) and the popout adoption issue (F4).
