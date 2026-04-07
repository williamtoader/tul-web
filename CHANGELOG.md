# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
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

[Unreleased]: https://github.com/williamtoader/tul-web/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/williamtoader/tul-web/compare/v0.6.0...v1.0.0
[0.6.0]: https://github.com/williamtoader/tul-web/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/williamtoader/tul-web/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/williamtoader/tul-web/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/williamtoader/tul-web/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/williamtoader/tul-web/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/williamtoader/tul-web/releases/tag/v0.1.0

