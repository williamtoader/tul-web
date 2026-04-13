# TulWEB - Pure JS Windowing Toolkit

**WARNING**: This is was vibe-coded in a few hours. It is not production-ready and may have bugs. 

TulWEB is a lightweight, zero-dependency windowing toolkit designed for building complex, professional-grade tiling and stacking layouts in web applications. It provides a robust `LayoutManager` to handle nested rows, columns, and tab stacks with built-in support for drag-and-drop, resizable splitters, and dynamic themes.

![TulWEB Screenshot](./demo_ui.png) 


## Key Features

- **Multi-Directional Tabs**: Support for Top, Bottom, Left, and Right tab placements per stack.
- **Stack Minimization**: Collapse stacks to their tab bars with an ultra-sleek hover-based component preview.
- **Minimum Constraints**: Set `size`, `minWidth`, and `minHeight` using pixels or CSS units (e.g., `"300px"`, `"20%"`) to prevent panels from becoming unreadable during resize. Constraints are automatically bypassed during stack minimization.
- **Automated Testing**: Comprehensive E2E testing with **Playwright** and unit testing with **Jest** to ensure layout stability across all browsers.
- **Pure JavaScript**: No dependencies (no jQuery, no React/Angular required, but easily integrable).
- **Flexible Layouts**: Nested rows and columns for complex interfaces.
- **Tab Stacking**: Group components into stacks with efficient tab management and overflow support.
- **Drag & Drop**: Native-feeling drag-and-drop experience for reordering tabs and splitting panels.
- **Resizable Splitters**: Intuitive resizing with splitter constraints.
- **Premium Themes**: Built-in themes including Industrial Graphite, Phosphor Terminal, Pro Light, and Retro 90s, featuring glassmorphism and micro-animations.
- **State Management**: Save and restored entire layout configurations with a simple JSON format.
- **Developer-Friendly API**: Event-based system for lifecycle management (`init`, `active`, `focus`, `resize`, etc.) with support for both factory functions and ES6 classes.
- **Internal OO Refactor**: Library internals fully utilize ES6 classes for better maintainability and extensibility.

## Installation

Simply include the CSS and JS files in your project:

```html
<!-- Option 1: Direct File Usage -->
<link rel="stylesheet" href="tulweb.css">
<script type="module">
  import { LayoutManager } from './tulweb.js';
  const layout = new LayoutManager(null, document.body);
</script>

<!-- Option 2: NPM Installation -->
<!-- npm install tulweb -->
```

## Local Development

To run the documentation and demo locally, use the following commands:

```bash
npm install
npm start
```

### Static Build

To generate a single, self-contained HTML file of the documentation (inlining all CSS and JS), run:

```bash
npm run bundle-docs
```

This will create `docs-bundle.html` and `index-bundle.html` in the root directory.

## Automated Testing

TulWEB includes a comprehensive testing suite to ensure reliability and performance.

### E2E Testing (Playwright)

Run end-to-end tests in a real browser:
```bash
npm test
```

To open the interactive Playwright UI for debugging:
```bash
npm run test:ui
```

### Unit Testing (Jest)

Run core logic unit tests:
```bash
npm run test:unit
```

## Quick Start

### 1. Initialize the Layout Manager

Create a container in your HTML and initialize the `LayoutManager`. You can pass an optional settings object to govern behavior.

```javascript
import { LayoutManager } from './tulweb.js';

const container = document.getElementById("layout-container");
const layout = new LayoutManager(null, container, {
    onlyResizeActiveTabs: true // (Default) Only dynamically visible tabs process resize geometry
});
```

### 2. Register Your Components

Define factory functions that return DOM elements and register them with the toolkit.

```javascript
layout.registerComponent('editor', (state, container) => {
    const el = document.createElement("textarea");
    el.value = state.text || "// Hello World";
    return el;
});

// OR use a Class
class MyComponent {
    constructor(state, container) {
        this.element = document.createElement("div");
        this.element.textContent = "Class-based Component";
    }
}
layout.registerComponent('my-comp', MyComponent);
```

### 3. Load a Layout

Load a layout configuration to populate the workspace.

```javascript
const initialLayout = {
    content: [{
        type: 'row',
        content: [
            {
                type: 'stack',
                size: 30,
                content: [{ type: 'component', componentName: 'editor', title: 'File 1' }]
            },
            {
                type: 'stack',
                size: 70,
                content: [{ type: 'component', componentName: 'editor', title: 'File 2' }]
            }
        ]
    }]
};

layout.loadLayout(initialLayout);
```

## Creating Drag Sources

Turn any existing DOM element into a drag source to add new components to the workspace.

```javascript
const myButton = document.querySelector('.add-btn');
const config = { type: 'component', componentName: 'editor', title: 'New Document' };

layout.createDragSource(myButton, config);
```

## Component Lifecycle Events

TulWEB uses an internal `EventEmitter` system that allows you to hook directly into layout state changes. You can bind to these events directly on the `container` instance passed to your component factories:

- `init`: Fired once the factory binds the DOM and mounts the component.
- `active`: Fired when an inactive component becomes the visible tab in its stack.
- `inactive`: Fired when a component is hidden behind a newly selected active tab.
- `focus`: Fired when the component is the active tab **and** its parent stack receives user focus.
- `defocus`: Fired when the component loses focus (either by becoming inactive, or the focus shifting to another stack).
- `move`: Fired right after a component acts as a dragged tab and successfully drops into a new layout position.
- `resize`: Fired when a splitter is dragged, parent container changes size, or browser window resizes.
- `destroy`: Fired immediately before garbage collection.

## Themes

Apply themes by setting the class on the `<body>` element:
- `theme-nordic` (Industrial Graphite)
- `theme-cyber` (Phosphor Terminal)
- `theme-light` (Pro Light)
- `theme-retro` (90's Workstation/IRIX)

## Licensing

TulWEB is licensed under the [MIT License](LICENSE).
- No incompatible third-party components.
- Standard MIT permissions for commercial and personal use.

---

Created with focus on aesthetics and performance.
