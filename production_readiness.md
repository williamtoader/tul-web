# TulWEB — Production Readiness Analysis

Assessment based on review of `tulweb.js` (1785 lines), `tulweb.css` (1075 lines), and all consuming files.

---

## 🔴 Tier 1 — Bugs & Correctness (Fix Before Any Release)

| # | Issue | Detail |
|---|-------|--------|
| 1 | **DragManager is a module-level singleton** | `const DragManager = new DragManagerClass()` is instantiated once at module load. If two `LayoutManager` instances exist on the same page, `DragManager.init()` overwrites `.layoutManager` — the first instance loses drag-and-drop silently. Either make it per-instance or guard re-init. |
| 2 | **Memory leaks on destroy** | `LayoutManager` adds global listeners (`window resize`, `document keydown`) but never removes them. If a layout is torn down and recreated (SPA navigation), listeners stack. Need a `destroy()` method on `LayoutManager`. |
| 3 | **ResizeObserver never disconnected** | `StackItem.createDOM()` creates a `ResizeObserver` but there's no `disconnect()` in the destroy path. Leaks on every stack removal. |
| 4 | **Document-level listeners leak in StackItem** | `updateOverflow()` adds a `document mousedown` listener every time the overflow button is created, but never removes it when the stack is destroyed. |
| 5 | **No `<body>` tag in index.html** | The `<body>` open tag is missing (there's a close `</body>` but no open). Browsers fix this, but it's technically invalid HTML. |

---

## 🟠 Tier 2 — API Completeness (Expected by Library Consumers)

| # | Feature | Why It Matters |
|---|---------|---------------|
| 6 | **`LayoutManager.destroy()`** | Consumers in SPAs need to cleanly tear down — remove global listeners, observers, DOM nodes, the toast container, and drag indicator elements. Currently impossible. |
| 7 | **Programmatic tab/stack manipulation API** | `addChild` exists but is internal. Need public methods: `addComponent(stackId, config)`, `removeComponent(id)`, `getComponentById(id)`, `getStacks()`. Currently consumers poke at `_buildObjectTree` directly (see `app.js` line 417). |
| 8 | **Component state get/set** | `toConfig()` serializes `componentState` from the original config, but there's no way for components to _update_ their state. A `container.setState(newState)` and `container.getState()` API would let components persist dynamic data (cursor position, scroll offset, etc.). |
| 9 | **Stack ID / Component ID in config** | Layout configs don't support user-defined IDs. This makes it impossible to target a specific stack programmatically (e.g., "add a tab to the sidebar stack"). Add optional `id` field to config items. |
| 10 | **`beforeClose` / `canClose` hook** | No way for a component to prevent closing (e.g., "unsaved changes" prompt). Need a `container.on('beforeClose', callback)` that can return `false` to cancel. |
| 11 | **Popout windows** | GoldenLayout's most requested feature. Opening a stack in a separate browser window with state sync. Complex but high-value for trading/IDE use cases. |

---

## 🟡 Tier 3 — Robustness & Edge Cases

| # | Issue | Detail |
|---|-------|--------|
| 12 | **No config validation** | `loadLayout()` and `_buildObjectTree()` throw raw errors on malformed config. Need schema validation with actionable error messages. |
| 13 | **Class detection is fragile** | `ComponentItem.renderAppContent()` uses regex `/^\s*class\s+/` to distinguish classes from functions. This breaks with minified code, transpiled classes, or `class` in a comment. Use `Reflect.construct` check or document a convention (e.g., classes must have `.isClass = true`). |
| 14 | **Splitter resize has no min-size guard for fixed units** | When both items use CSS units other than `px` or `%`, the splitter converts to `px` and resets base — this can cause jumpy behavior. |
| 15 | **Tab overflow reflow loops** | `renderTabs()` calls `updateOverflow()` inside the forEach loop (line 1065), causing O(n²) layout thrashing per tab count. Should be called once after all tabs are rendered. |
| 16 | **No debounce on window resize** | `window.addEventListener('resize', ...)` fires `updateLayout()` on every frame during resize. Should debounce or use `requestAnimationFrame`. |

---

## 🔵 Tier 4 — Accessibility (a11y)

| # | Issue | Detail |
|---|-------|--------|
| 17 | **No ARIA roles** | Tabs lack `role="tab"`, `role="tablist"`, `role="tabpanel"`, `aria-selected`, `aria-controls`. Screen readers can't navigate the layout. |
| 18 | **No keyboard tab navigation** | Can't use `Tab` / `Shift+Tab` to move between tabs within a stack. Only `Alt+Arrow` between stacks exists. |
| 19 | **Focus management** | After closing a tab, focus doesn't move to the next tab or the content area. Focus is lost to `<body>`. |
| 20 | **Splitters have no keyboard interaction** | Splitters can only be resized by mouse/touch. Need arrow key support when focused. |
| 21 | **Drop indicators lack aria-live** | Screen readers have no awareness of drag state or drop zones. |

---

## 🟣 Tier 5 — Performance & Scale

| # | Issue | Detail |
|---|-------|--------|
| 22 | **`updateLayout()` rebuilds entire DOM subtree** | `ContainerItem.updateLayout()` sets `innerHTML = ''` and re-appends all children + splitters on every change. For large layouts (50+ panels), this causes visible reflow. Use diff-based updates. |
| 23 | **No virtualization** | All component DOM trees are live even when hidden (just `display: none`). For memory-constrained apps, lazy mount/unmount on tab switch would help. |
| 24 | **Splitters recreated on every layout update** | Old splitters are destroyed and new ones created on each `updateLayout()`. Should reuse/update existing ones. |

---

## ⚪ Tier 6 — Packaging & Distribution

| # | Issue | Detail |
|---|-------|--------|
| 25 | **No npm package** | Not published to npm. Needs `package.json` with proper `exports`, `types`, and `files` fields. |
| 26 | **No TypeScript declarations** | No `.d.ts` file. Consumers using TS get zero type safety. This is a dealbreaker for many teams. Write a `tulweb.d.ts` or migrate to TypeScript. |
| 27 | **No UMD/CJS build** | Only ES module export. Need UMD for `<script>` tag usage without `type="module"`, and CJS for legacy Node/bundler setups. |
| 28 | **No minified build** | Library is served as-is (68KB). A minified + tree-shakeable build would be ~20-25KB. |
| 29 | **No CSS minification or scoping** | CSS uses global selectors that could clash with consumer styles. Consider CSS Modules, Shadow DOM, or at least a more unique prefix. |
| 30 | **No versioned changelog automation** | `CHANGELOG.md` exists but is manual. Add conventional commits + auto changelog. |

---

## 📝 Tier 7 — Documentation & Testing

| # | Feature | Detail |
|---|---------|--------|
| 31 | **No unit tests** | Zero tests. Need tests for: config parsing, tree building, serialization round-trips, drag-drop state machine, splitter resize math, edge cases (empty layout, single tab, deeply nested). |
| 32 | **No integration/E2E tests** | Playwright or Cypress tests for actual drag-drop, resize, tab switching, keyboard shortcuts. |
| 33 | **API docs are hardcoded HTML** | Documentation in `docs.js` is static HTML strings. Should be generated from JSDoc or similar. |
| 34 | **No migration guide** | If this replaces GoldenLayout or similar, a migration guide would accelerate adoption. |

---

## Suggested Priorities

If the goal is a v1.0 release, I'd suggest this order:

```
Phase 1 (Correctness)    → Items 1–5, 12–13, 15–16
Phase 2 (Usable API)     → Items 6–10
Phase 3 (Consumable)     → Items 25–28, 31
Phase 4 (Accessible)     → Items 17–20
Phase 5 (Scalable)       → Items 22–24
Phase 6 (Polished)       → Items 11, 21, 29–30, 32–34
```

> [!IMPORTANT]
> The singleton `DragManager` (#1) and the lack of `LayoutManager.destroy()` (#6) are the two items most likely to cause real bugs in production. I'd start there.

Which tier would you like to tackle first?
