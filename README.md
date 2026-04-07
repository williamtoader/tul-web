# TulWEB - Pure JS Windowing Toolkit

**WARNING**: This is was vibe-coded in a few hours. It is not production-ready and may have bugs. 

TulWEB is a lightweight, zero-dependency windowing toolkit designed for building complex, professional-grade tiling and stacking layouts in web applications. It provides a robust `LayoutManager` to handle nested rows, columns, and tab stacks with built-in support for drag-and-drop, resizable splitters, and dynamic themes.

![TulWEB Screenshot](./demo_ui.png) 


## Key Features

- **Pure JavaScript**: No dependencies (no jQuery, no React/Angular required, but easily integrable).
- **Flexible Layouts**: Nested rows and columns for complex interfaces.
- **Tab Stacking**: Group components into stacks with efficient tab management and overflow support.
- **Drag & Drop**: Native-feeling drag-and-drop experience for reordering tabs and splitting panels.
- **Resizable Splitters**: Intuitive resizing with double-click to reset behavior.
- **Premium Themes**: Built-in themes including Industrial Graphite, Phosphor Terminal, and Pro Light.
- **State Management**: Save and restored entire layout configurations with a simple JSON format.
- **Developer-Friendly API**: Event-based system for lifecycle management.

## Installation

Simply include the CSS and JS files in your project:

```html
<link rel="stylesheet" href="tulweb.css">
<script src="tulweb.js"></script>
```

## Quick Start

### 1. Initialize the Layout Manager

Create a container in your HTML and initialize the `LayoutManager`. You can pass an optional settings object to govern behavior.

```javascript
const container = document.getElementById("layout-container");
const layout = new TulWEB.LayoutManager(null, container, {
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

## Licensing

TulWEB is licensed under the [MIT License](LICENSE).
- No incompatible third-party components.
- Standard MIT permissions for commercial and personal use.

---

Created with focus on aesthetics and performance.
