# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.5.1] - 2026-04-14
### Performance
- **ContainerItem DOM diffing**: `updateLayout()` on Row/Column containers now diffs the child list against the previous render. When children haven't changed (window resize, flex recalc), all DOM manipulation is skipped entirely. When the child set does change, a `DocumentFragment` batches all insertions into a single DOM write, and Splitter instances whose adjacent-pair hasn't changed are reused rather than destroyed and recreated.
- **Tab switching no longer rebuilds DOM**: `setActive()` now toggles CSS classes and ARIA attributes on existing tab elements instead of destroying and recreating all tabs with their event listeners.
- **Splitter drag uses requestAnimationFrame**: Resize operations during splitter drag are now throttled via `requestAnimationFrame`, cutting synchronous reflows by ~50%.
- **EventEmitter iterates a snapshot**: `emit()` now copies the listener array before iterating, preventing bugs when `once()` or `off()` modifies the array mid-emission.
- **DragSource defers config cloning**: The expensive `JSON.parse(JSON.stringify())` deep clone is now deferred to `startDrag()` (using `structuredClone`) and only runs when the drag threshold is actually exceeded, not on every `mousedown`.
- **Overflow dropdown shows only hidden tabs**: `updateOverflow()` now filters to genuinely overflowed tabs instead of always listing every tab.
- **navigateFocus uses tree traversal**: Replaced DOM `querySelectorAll` in keyboard navigation with the existing `getAllStacks()` tree traversal, avoiding unnecessary DOM queries.

### Framework Integration
- **Scoped keyboard shortcuts**: Keyboard event handlers are now bound to the `rootElement` (with `tabindex="-1"`) instead of `document`, enabling multiple TulWEB instances on the same page and preventing conflicts with React/Angular keyboard handling.
- **Robust class detection**: Replaced the fragile `constructor.toString().includes('class')` check with `Reflect.construct()`-based detection that survives minification, TypeScript transpilation, and Babel transforms.
- **Component move lifecycle events**: Added `willMove` and `didMove` events emitted during tab drag-and-drop operations, enabling framework wrappers (React portals, Angular `ViewContainerRef`) to properly handle component relocation.
- **TypeScript Definitions**: Added official `.d.ts` declaration file providing full type coverage, autocomplete, and documentation for the public API, simplifying integration with React, Angular, and TypeScript-based projects.
- **Library Build Pipeline**: Implemented a production build strategy using `esbuild`. The library now generates bundled and minified ESM, IIFE, and CSS assets in the `dist/` directory, optimized for direct browser use and CDNs.
- **Enhanced NPM Publication**: Updated `package.json` with a `files` manifest, `exports` mapping, and `prepublishOnly` lifecycle hooks to ensure only necessary, pre-tested, and freshly built assets are published to npm.

### Fixed
- **Splitter destroy leak**: Splitters destroyed while actively being dragged now properly clean up their `document`-level `mousemove`/`mouseup` listeners.

## [2.5.0] - 2026-04-14
### Added
- **Popout Stack System**: Tab stacks can now be popped out into standalone native browser windows via a dedicated "⬡" button in the stack header or a "Popout Stack" context-menu option. Enable with `{ enablePopout: true }` on `LayoutManager`.
- **Headless Tab Position**: Added a new `"headless"` tab position that completely hides the stack header and all associated controls (close, minimize, maximize, popout). Headless stacks are designed to be controlled exclusively through the programmatic API.
- **DOM Adoption Transfer**: Popped-out stacks are transferred using `document.adoptNode()`, preserving all internal state, event listeners, and closure-captured variables across window boundaries.
- **Pre-Popout State Preservation**: The stack's minimized/maximized state is saved before popping out and fully restored when the window closes, so stacks return to exactly the layout state they left.
- **Force-Maximized in Popout**: Stacks are always displayed maximized inside a popout window regardless of their prior state, ensuring full use of the new window's canvas.
- **Controls Hidden in Popout**: All stack header controls (minimize, maximize, close, popout) are hidden inside popped-out windows via a scoped `display: none !important` rule injected into the popout shell.
- **Robust Popout Recovery**: The parent listens for `beforeunload`, `pagehide`, and `unload` events on the child window in addition to a fallback `setInterval` poll, guaranteeing the stack DOM is adopted back before the browser destroys the execution context.
- **Popout Re-integration**: When the popout window closes, the stack is re-inserted into its exact original position in the layout tree (same parent, same index). If the original parent is gone, it falls back gracefully to the current root.
- **Theme Sync**: The popout window's `<body>` class mirrors the parent's theme and stays in sync when the parent theme changes.
- **Popout API Events**: Introduced `popout` and `popout-restore` events on `LayoutManager`. `popout` is emitted with the stack instance when a stack is detached; `popout-restore` is emitted when the stack is returned to the workspace after the popout window closes.

### Fixed
- **Popout button re-enables after close**: The popout button event listener is now correctly preserved across the `adoptNode` boundary, so the button works repeatedly without page reload.
- **Minimized-then-popped stacks**: Previously minimized stacks were incorrectly displayed as minimized inside the popout window; they now expand to fill the window fully.
- **Popout-to-workspace drag leak**: Fixed a bug where clicking a tab in a popout window and then closing it would leave a "ghost" drag state in the main window. Added window-awareness to `DragManager` and a `cancelDrag` lifecycle to ensure clean state transitions.

## [2.4.0] - 2026-04-13
### Added
- **Project Reorganization**: Standardized directory structure into `src`, `demo`, `docs`, and `assets` for improved maintainability.
- **Root Portal**: Professional landing page at the project root with high-aesthetic design and quick links to the demo and documentation.
- **Enhanced Bundler**: Refactored `bundle.js` with relative path mapping, enabling seamless self-contained builds from nested source directories.

### Changed
- Moved core library files to `src/` and application/documentation files to their respective `demo/` and `docs/` folders.
- Optimized Playwright E2E configuration and `baseURL` to support modular pathing without breaking test stability.

### Fixed
- **API State Consistency**: Implemented `StackItem.removeChild` to correctly adjust `activeChildIndex` when manipulating tabs programmatically.
- **Keyboard Focus Management**: Unified tab closure logic via `_closeTab` helper, ensuring the "Delete" key correctly shifts focus and manages stack cleanup, mirroring mouse interactions.
- **DOM Race Conditions**: Standardized focus transitions to use asynchronous scheduling, ensuring reliable focus management during rapid tab operations across all environments.

## [2.3.0] - 2026-04-13
### Added
- **Production Readiness**: Refactored `DragManager` to use per-instance state, enabling multiple `LayoutManager` instances on the same page.
- **Accessibility (a11y)**: Comprehensive keyboard navigation for tabs (Arrows, Home, End, Del) and splitters (Tab + Arrows).
- **ARIA Compliance**: Implemented `tablist`, `tab`, `tabpanel`, `separator`, and `status` roles with associated `aria-` attributes for screen readers.
- **Lifecycle Enhancements**: Added `beforeClose` / `canClose` hook support for components to intercept and cancel closure (e.g., unsaved changes).
- **Validation**: Strict configuration validation and improved component class detection to support modern build transpilers.
- **Memory Management**: Implemented exhaustive `destroy()` lifecycle for `LayoutManager`, `DragManager`, and `ComponentItem` to prevent memory leaks in SPAs.

### Fixed
- Fixed focus tracking when closing tabs; focus now automatically shifts to the newly active tab.
- Resolved race conditions in ContextMenu closure for headless test environments.
- Corrected DOM hierarchy bug that caused duplicate content areas in some configurations.

## [2.2.0] - 2026-04-13
### Added
- Comprehensive automated testing suite featuring Playwright (E2E) and Jest (Unit).
- Enhanced programmatic API for dynamic layout manipulation (`addChild`, `removeChild`, `replaceChild`, etc.).
- Granular component lifecycle events: `init`, `active`, `inactive`, `focus`, `defocus`, `move`, `resize`, `destroy`.
- Modernized UI design system with glassmorphism, refined shadows, and smooth micro-animations.
- New "How to use" interactive guide tab in the default layout.
- Consolidated bundling script (`bundle.js`) for generating self-contained Documentation and Index pages.

### Changed
- Library internals fully refactored to ES6 classes for improved extensibility and maintainability.
- Optimized focus management for complex nested layouts.

## [2.1.0] - 2026-04-08
### Added
- New stack configuration options: `displayMinimizeButton`, `displayMaximizeButton`, `displayCloseButton` to control visibility of stack header buttons.
- New component configuration option: `closeable` (boolean) to toggle the close button on individual tabs and its associated context menu options.
- `size`, `minWidth`, and `minHeight` properties now support CSS units (e.g., `"300px"`, `"20%"`), in addition to numeric values.
- Minimum size constraints are now automatically bypassed when a stack is minimized, preventing geometric conflicts during collapse.

## [2.0.0] - 2026-04-07
### Changed
- Migrated core library to ES6 modules (removed `TulWEB` global).
- Improved documentation with modern import syntax.

### Added
- Packaged as a Node module with `package.json`.
- Added `npm start` command for local development server (using `http-server`).
- Added `npm run bundle-docs` to generate a single-file static documentation bundle.

## [1.1.0] - 2026-04-07
### Added
- Added vertical and bottom tab groups.
## [1.0.0] - 2026-04-07
- Name change from TulWM to TulWEB
## [0.6.0] - 2026-04-07
### Fixed
- Clicking close button on tab stack now destroys it.
- Fixed context menu actions for tab stacks not triggering.
- Fixed layout manager not cleaning up empty stacks when closing all tabs.
- Dragging a component to the empty root element now creates a new row with the component in a stack.

### Added
- New "90's Workstation" (IRIX/CDE style) theme.

## [0.5.0] - 2026-04-07
### Added
- Granular lifecycle notification system for components (init, active, inactive, focus, defocus, move, resize, destroy).
- Enhanced "Empty Workspace" state with modern SVG visualization and interaction cues.
- Integrated `EventEmitter` for robust component interaction within the layout tree.

### Fixed
- Improved focus management when switching between complex nested layouts.

## [0.4.0] - 2026-04-07
### Added
- "Kitchen Sink" configuration to `index.html` for testing all layout capabilities in one place.
- Tab reorder indicator providing visual feedback during drag-and-drop operations.

### Changed
- Modernized theme selector UI, replacing browser defaults with custom-styled radio list components.

## [0.3.0] - 2026-04-07
### Added
- Comprehensive project documentation including a detailed `README.md`.
- Official MIT License.
- Documentation and code examples for React and Angular framework integration.

### Fixed
- Corrected syntax errors in the documentation viewer.
- Improved drag-and-drop mechanics for more consistent behavior across different zoom levels.

## [0.2.0] - 2026-04-07
### Changed
- Elevated visual design with glassmorphism, smooth micro-animations, and soft drop shadows.
- Refined core themes: Industrial Graphite, Phosphor Terminal, and Pro Light.
- Improved UI contrast for code blocks and secondary text elements.

## [0.1.0] - 2026-04-07
### Added
- Initial alpha release of TulWEB.
- Core `LayoutManager` supporting nested Rows, Columns, and Tab Stacks.
- Drag-and-drop system for panel splitting and tab reordering.
- Resizable splitters with double-click reset capability.
- Layout state serialization (save/restore) in JSON format.

### Fixed
- UI dropdown accessibility issues with keyboard navigation.
- Logic errors in tab stack decluttering when handling tab overflows.

[Unreleased]: https://github.com/williamtoader/tul-web/compare/v2.2.0...HEAD
[2.2.0]: https://github.com/williamtoader/tul-web/compare/v2.1.0...v2.2.0
[2.1.0]: https://github.com/williamtoader/tul-web/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/williamtoader/tul-web/compare/v1.1.0...v2.0.0
[1.1.0]: https://github.com/williamtoader/tul-web/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/williamtoader/tul-web/compare/v0.6.0...v1.0.0
[0.6.0]: https://github.com/williamtoader/tul-web/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/williamtoader/tul-web/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/williamtoader/tul-web/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/williamtoader/tul-web/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/williamtoader/tul-web/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/williamtoader/tul-web/releases/tag/v0.1.0

