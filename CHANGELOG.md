# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

