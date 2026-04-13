const docsTopics = {
    intro: {
        title: "Introduction",
        content: `
            <div class="markdown-body">
                <h1>Welcome to TulWEB</h1>
                <p><strong>TulWEB</strong> (Tul Windowing Manager) is a comprehensive, pure-JavaScript windowing and layout toolkit. Unlike heavy DOM frameworks, TulWEB is built to provide advanced, dockable, resizable workspaces with zero external dependencies.</p>
                
                <p>Designed for web-based IDEs, trading terminals, and massive dashboards, it handles deeply nested row/column grids and tabbed stacks seamlessly.</p>
                
                <h2>Getting Started</h2>
                <p>Installation is straightforward. Simply drop the core CSS and JS files into your project head:</p>
                <div class="code-block">
<pre><code>&lt;link rel="stylesheet" href="tulweb.css"&gt;
&lt;script type="module"&gt;
  import { LayoutManager } from './tulweb.js';
  const layout = new LayoutManager(null, document.body);
&lt;/script&gt;</code></pre>
                </div>
                
                <p>Alternatively, if you are using a build system or Node.js:</p>
                <div class="code-block">
<pre><code>npm install tulweb</code></pre>
                </div>
                
                <div class="alert info">
                    <strong>Note:</strong> Ensure you are using HTML5 doctype. TulWEB relies on modern flexbox layouts and requires a defined container height.
                </div>
            </div>
        `
    },
    architecture: {
        title: "Architecture",
        content: `
            <div class="markdown-body">
                <h1>Architecture Overview</h1>
                <p>TulWEB follows a strict hierarchical DOM tree mapping. The highest node is the <code>LayoutManager</code>, which orchestrates structural <code>RowItem</code>, <code>ColumnItem</code>, and <code>StackItem</code> elements, down to the leaf <code>ComponentItem</code>s.</p>
                
                <h2>Core Entities</h2>
                <ul>
                    <li><code>LayoutManager</code>: The root controller and event bus.</li>
                    <li><code>RowItem / ColumnItem</code>: Flexbox containers splitting space either horizontally or vertically using draggable splitters.</li>
                    <li><code>StackItem</code>: A tabbed container window that acts as the immediate parent for actual application panels. Features docking, maximize state, <strong>minimization/preview</strong>, and <strong>configurable tab orientation</strong>.</li>
                    <li><code>ComponentItem</code>: A lightweight wrapper around your custom JavaScript DOM logic.</li>
                </ul>

                <h2>JSON State Representation</h2>
                <p>The entire layout is reducible to a deterministic JSON object. This means reconstructing sessions is natively supported via <code>layout.toConfig()</code> and <code>layout.loadLayout(config)</code>.</p>
            </div>
        `
    },
    layoutManager: {
        title: "LayoutManager API",
        content: `
            <div class="markdown-body">
                <h1>LayoutManager API</h1>
                <p>The <code>LayoutManager</code> is the main entry point to TulWEB.</p>
                
                <h2>Constructor</h2>
                <div class="code-block">
<pre><code>const layout = new LayoutManager(initialConfig, containerElement, options);</code></pre>
                </div>
                
                <h2>Configurations / Options</h2>
                <p>Pass an optional third <code>options</code> argument (or nest inside a <code>settings</code> property on a layout JSON object) to customize engine behavior:</p>
                <ul>
                    <li><code>onlyResizeActiveTabs</code> (default: <code>true</code>): When enabled, resize events cascade strictly to the visible tab in a stack, saving performance. Background tabs skip geometry processing until they are clicked, at which point an artificial resize event is fired to synchronize them.</li>
                    <li><code>tabPosition</code> (default: <code>'top'</code>): Sets global tab position for all stacks if not overridden in item config. Supports <code>'top'</code>, <code>'bottom'</code>, <code>'left'</code>, <code>'right'</code>.</li>
                </ul>
                
                <h2>Public Methods</h2>
                <table class="api-table">
                    <thead><tr><th>Method</th><th>Description</th></tr></thead>
                    <tbody>
                        <tr>
                            <td><code>registerComponent(name, method)</code></td>
                            <td>Maps a raw string name to a <strong>Factory Function</strong> or <strong>ES6 Class</strong>. Provides maximum flexibility for building panel internals.</td>
                        </tr>
                        <tr>
                            <td><code>loadLayout(config)</code></td>
                            <td>Clears the existing tree and parses a JSON layout tree into active DOM nodes.</td>
                        </tr>
                        <tr>
                            <td><code>toConfig()</code></td>
                            <td>Synchronously scrapes the current UI tree and builds a JSON structure mapping components and stack geometries.</td>
                        </tr>
                        <tr>
                            <td><code>createDragSource(elem, cfg)</code></td>
                            <td>Attaches native drag listeners to any external DOM element, turning it into a draggable tab placeholder.</td>
                        </tr>
                        <tr>
                            <td><code>showToast(msg, type)</code></td>
                            <td>Fires an integrated toast notification to the screen overlay.</td>
                        </tr>
                        <tr>
                            <td><code>maximizeStack(stack)</code></td>
                            <td>Forces a stack to occupy the full layout container dimensions.</td>
                        </tr>
                        <tr>
                            <td><code>minimizeStack(stack)</code></td>
                            <td>Collapses a stack to its tab bar, enabling a hover-preview mode.</td>
                        </tr>
                    </tbody>
                </table>

                <h2>Content Item Configuration</h2>
                <p>Properties available to <code>row</code>, <code>column</code>, <code>stack</code>, and <code>component</code> items:</p>
                <table class="api-table">
                    <thead><tr><th>Property</th><th>Description</th></tr></thead>
                    <tbody>
                        <tr><td><code>size</code></td><td>Flex weight (number) or CSS unit (e.g., <code>"300px"</code>, <code>"25%"</code>). Numbers distribute space proportionally among siblings, while CSS units fix the item size.</td></tr>
                        <tr><td><code>minWidth</code></td><td>Minimum width. Supports numbers (pixels) or CSS units (e.g., <code>"300px"</code>, <code>"20%"</code>). Automatically bypassed when stack is minimized.</td></tr>
                        <tr><td><code>minHeight</code></td><td>Minimum height. Supports numbers (pixels) or CSS units (e.g., <code>"300px"</code>, <code>"20%"</code>). Automatically bypassed when stack is minimized.</td></tr>
                        <tr><td><code>tabPosition</code></td><td>Override global tab orientation for a specific stack (<code>top</code>, <code>bottom</code>, <code>left</code>, <code>right</code>).</td></tr>
                        <tr><td><code>minimized</code></td><td>Boolean. If true, the stack starts in a collapsed state.</td></tr>
                        <tr><td><code>displayMinimizeButton</code></td><td>Boolean (default: <code>true</code>). Shows/hides the minimize button in the stack header.</td></tr>
                        <tr><td><code>displayMaximizeButton</code></td><td>Boolean (default: <code>true</code>). Shows/hides the maximize button in the stack header.</td></tr>
                        <tr><td><code>displayCloseButton</code></td><td>Boolean (default: <code>true</code>). Shows/hides the entire stack close button and its separator.</td></tr>
                        <tr><td><code>preventEmptyClosure</code></td><td>Boolean (default: <code>false</code>). If <code>true</code>, the stack will NO longer auto-remove itself if all the tabs inside it are closed.</td></tr>
                    </tbody>
                </table>

                <h2>Component Configuration</h2>
                <p>Properties specific to <code>component</code> items:</p>
                <table class="api-table">
                    <thead><tr><th>Property</th><th>Description</th></tr></thead>
                    <tbody>
                        <tr><td><code>closeable</code></td><td>Boolean (default: <code>true</code>). If <code>false</code>, the close button (×) is removed from the tab, and 'Close' options are hidden from the context menu.</td></tr>
                    </tbody>
                </table>
            </div>
        `
    },
    components: {
        title: "Components",
        content: `
            <div class="markdown-body">
                <h1>Component Registration</h1>
                <p>Instead of passing rigid HTML strings, TulWEB embraces a programmatic component lifecycle. Components can be registered as either traditional <strong>Factory Functions</strong> or modern <strong>ES6 Classes</strong>.</p>
                
                <h2>1. Factory Functions</h2>
                <p>A factory function is called whenever the layout mounts a specific panel. It must return a DOM node.</p>
                <div class="code-block">
<pre><span class="keyword">function</span> MyWidgetFactory(state = {}, container) {
    <span class="keyword">const</span> el = document.createElement(<span class="string">'div'</span>);
    el.innerHTML = <span class="string">'&lt;h1&gt;Factory Component&lt;/h1&gt;'</span>;
    
    <span class="comment">// Access saved state</span>
    if (state.name) el.innerHTML += <span class="string">'&lt;p&gt;'</span> + state.name + <span class="string">'&lt;/p&gt;'</span>;

    <span class="comment">// Hooks</span>
    container.on(<span class="string">'resize'</span>, () =&gt; console.log(<span class="string">'Resized'</span>));

    <span class="keyword">return</span> el;
}
layout.registerComponent(<span class="string">'myWidget'</span>, MyWidgetFactory);</pre>
                </div>

                <h2>2. ES6 Classes</h2>
                <p>For more complex state management, you can define your components as classes. The constructor receives <code>(state, container)</code>. The instance should either be a DOM node itself or provide an <code>.element</code> property.</p>
                <div class="code-block">
<pre><span class="keyword">class</span> MyModernWidget {
    <span class="keyword">constructor</span>(state, container) {
        this.<span class="property">state</span> = state;
        this.<span class="property">container</span> = container;
        
        <span class="comment">// Create root element</span>
        this.<span class="property">element</span> = document.createElement(<span class="string">'div'</span>);
        this.<span class="property">element</span>.innerHTML = <span class="string">'&lt;h1&gt;Class Component&lt;/h1&gt;'</span>;

        <span class="comment">// Listen to events</span>
        container.on(<span class="string">'active'</span>, () =&gt; this.onActivate());
    }

    onActivate() {
        console.log(<span class="string">'Component became active'</span>);
    }
}
layout.registerComponent(<span class="string">'modernWidget'</span>, MyModernWidget);</pre>
                </div>

                <div class="alert warning">
                    <strong>Important:</strong> You must <code>return</code> a valid DOM node from your factory, or provide a valid <code>.element</code> (or be a DOM node) in your class instance. Returning undefined will throw layout rendering errors.
                </div>
            </div>
        `
    },
    dnd: {
        title: "Drag & Drop API",
        content: `
            <div class="markdown-body">
                <h1>Drag & Drop Workflows</h1>
                <p>TulWEB comes packed with a sophisticated, absolute-pixel drag-and-drop system designed to prevent iframe blocking and text-selection glitches.</p>

                <h2>Internal Dragging</h2>
                <p>Users can instinctively drag tabs from headers and drop them onto the center of another window (to dock into the stack), or onto the edges (top, right, bottom, left) to execute a quadrant split. The system automatically recalculates parent boundaries.</p>

                <h2>External Dragging</h2>
                <p>You can create external catalog lists (like in this very demo) to let users drag new tools directly into the workspace.</p>
                
                <div class="code-block">
<pre><span class="comment">// The source element</span>
<span class="keyword">const</span> btn = document.getElementById(<span class="string">'new-terminal-btn'</span>);

<span class="comment">// The config to inject upon dropping</span>
<span class="keyword">const</span> config = {
    <span class="property">type</span>: <span class="string">'component'</span>,
    <span class="property">componentName</span>: <span class="string">'terminal'</span>,
    <span class="property">title</span>: <span class="string">'Local Bash'</span>
};

<span class="comment">// Bind</span>
layout.createDragSource(btn, config);</pre>
                </div>
            </div>
        `
    },
    events: {
        title: "Events & Shortcuts",
        content: `
            <div class="markdown-body">
                <h1>Events & Shortcuts</h1>
                <p>TulWEB implements a robust <code>EventEmitter</code> architecture allowing decoupling of business logic from layout.</p>

                <h2>Global Layout Events</h2>
                <p>Bind to the LayoutManager instance:</p>
                <ul>
                    <li><code>stateChanged</code>: Fired whenever tabs are rearranged or sizes change.</li>
                    <li><code>componentCreated</code>: Fired right when a new <code>ComponentItem</code> instantiates, before its factory runs.</li>
                </ul>

                <h2>Component Lifecycle Events</h2>
                <p>Bind directly to the <code>ComponentItem</code> instance (passed as 'container' to your factory) to react to visibility and focus state changes:</p>
                <ul>
                    <li><code>init</code>: Fired immediately after the factory logic completes and the DOM is initially rendered.</li>
                    <li><code>beforeClose</code>: <strong>(Cancelable)</strong> Fired before the component is destroyed. If a listener returns <code>false</code>, the destruction is aborted.</li>
                    <li><code>active</code>: Fired when the component becomes the current visible tab in its stack.</li>
                    <li><code>inactive</code>: Fired when the component is hidden because another tab in the same stack became active.</li>
                    <li><code>focus</code>: Fired when the component is active AND its parent stack becomes focused by the user.</li>
                    <li><code>defocus</code>: Fired when the component loses user focus (either because it became inactive, or a different stack received focus).</li>
                    <li><code>move</code>: Fired when the component is dragged and dropped to a relocated position in the layout.</li>
                    <li><code>resize</code>: Fired whenever the layout dimensions change for this component.</li>
                    <li><code>destroy</code>: Fired just before the component is removed from the DOM.</li>
                </ul>

                <h2>Keyboard Shortcuts</h2>
                <p>TulWEB comes with out-of-the-box keyboard accessibility hooks:</p>
                <table class="api-table">
                    <tbody>
                        <tr><td><kbd>Ctrl/Cmd</kbd> + <kbd>S</kbd></td><td>Triggers "btn-save" click internally if present.</td></tr>
                        <tr><td><kbd>Ctrl/Cmd</kbd> + <kbd>W</kbd></td><td>Closes the currently active tab in the focused stack.</td></tr>
                        <tr><td><kbd>Alt</kbd> + <kbd>Arrow Keys</kbd></td><td>Spatially navigates focus between different panel stacks.</td></tr>
                    </tbody>
                </table>
            </div>
        `
    },
    theming: {
        title: "Theming",
        content: `
            <div class="markdown-body">
                <h1>Theming Engine</h1>
                <p>Forget !important overrides. TulWEB utilizes native CSS Custom Properties for immediate repaints and seamless glassmorphism support.</p>
                
                <h2>Extending Properties</h2>
                <p>All core color logic maps to base variables. Overwrite them at the <code>body</code> or container level:</p>
                
                <div class="code-block">
<pre><span class="keyword">body.my-theme</span> {
    <span class="property">--tulweb-bg-panel</span>: rgba(10, 15, 20, 0.85);
    <span class="property">--tulweb-bg-tab</span>: rgba(15, 20, 25, 0.5);
    <span class="property">--tulweb-accent</span>: #ff0055;
    <span class="property">--tulweb-shadow-color</span>: rgba(255, 0, 85, 0.1);
}</pre>
                </div>

                <h2>Included Themes</h2>
                <ul>
                    <li><code>theme-nordic</code>: The default sleek, dark bluish-grey.</li>
                    <li><code>theme-cyber</code>: A retro crt-terminal vibe with amber phosphors.</li>
                    <li><code>theme-light</code>: Maximum contrast for well-lit environments and data density.</li>
                    <li><code>theme-retro</code>: A 90's workstation OS (IRIX/CDE) theme with bevels and high-contrast navy.</li>
                </ul>
            </div>
        `
    },
    reactAngular: {
        title: "React & Angular Integration",
        content: `
            <div class="markdown-body">
                <h1>React & Angular Integration</h1>
                <p>Since TulWEB exposes a pure JavaScript, programmatic component API, integrating it with frameworks like React and Angular is straightforward. You essentially use TulWEB to manage the layout, and the frameworks to render inside the panels.</p>
                
                <h2>React Integration</h2>
                <p>To use React components inside TulWEB, wrap your <code>React.createRoot</code> or <code>ReactDOM.render</code> calls inside a TulWEB component factory.</p>
                <div class="code-block">
<pre><span class="keyword">import</span> { createRoot } <span class="keyword">from</span> <span class="string">'react-dom/client'</span>;
<span class="keyword">import</span> MyReactApp <span class="keyword">from</span> <span class="string">'./MyReactApp'</span>;

<span class="keyword">function</span> ReactPanelFactory(state = {}, container) {
    <span class="keyword">const</span> el = document.createElement(<span class="string">'div'</span>);
    el.style.height = <span class="string">'100%'</span>;
    
    <span class="keyword">const</span> root = createRoot(el);
    root.render(&lt;MyReactApp state={state} /&gt;);
    
    container.on(<span class="string">'destroy'</span>, () =&gt; {
        root.unmount();
    });
    
    <span class="keyword">return</span> el;
}

layout.registerComponent(<span class="string">'reactPanel'</span>, ReactPanelFactory);</pre>
                </div>

                <h2>Angular Integration</h2>
                <p>For Angular, you can dynamically create and mount components using Custom Elements (Angular Elements), which provides a seamless wrapper.</p>
                <div class="code-block">
<pre><span class="comment">// 1. Build an Angular Element</span>
<span class="keyword">import</span> { createCustomElement } <span class="keyword">from</span> <span class="string">'@angular/elements'</span>;

<span class="keyword">export</span> <span class="keyword">class</span> AppModule {
  <span class="keyword">constructor</span>(injector) {
    <span class="keyword">const</span> el = createCustomElement(MyAngularComponent, { injector });
    customElements.define(<span class="string">'my-angular-component'</span>, el);
  }
}

<span class="comment">// 2. TulWEB Factory</span>
<span class="keyword">function</span> AngularPanelFactory(state = {}, container) {
    <span class="keyword">const</span> el = document.createElement(<span class="string">'my-angular-component'</span>);
    
    <span class="comment">// Pass state if the element supports it via properties</span>
    if (state.taskId) {
        el.taskId = state.taskId;
    }
    
    <span class="keyword">return</span> el;
}

layout.registerComponent(<span class="string">'angularPanel'</span>, AngularPanelFactory);</pre>
                </div>
            </div>
        `
    },
    testing: {
        title: "Automated Testing",
        content: `
            <div class="markdown-body">
                <h1>Automated Testing</h1>
                <p>TulWEB is hardened with a multi-layered testing strategy to guarantee UI consistency and core logic integrity across releases.</p>

                <h2>1. E2E Testing with Playwright</h2>
                <p>We use Playwright to simulate real user interactions—dragging tabs, resizing panels, and switching themes—in Chromium, Firefox, and WebKit.</p>
                <div class="code-block">
<pre><span class="comment">// Run all E2E tests</span>
npm test

<span class="comment">// Run with UI for debugging</span>
npm run test:ui</pre>
                </div>

                <h2>2. Unit Testing with Jest</h2>
                <p>Core logic, such as configuration parsing, utility functions, and the <code>EventEmitter</code>, are tested using Jest in a JSDOM environment.</p>
                <div class="code-block">
<pre><span class="comment">// Run unit tests</span>
npm run test:unit</pre>
                </div>

                <h2>Testing Philosophy</h2>
                <ul>
                    <li><strong>Visual Consistency:</strong> Playwright captures screenshots to detect regression in theme rendering.</li>
                    <li><strong>State Integrity:</strong> Tests verify that <code>toConfig()</code> always produces a valid, resumable state.</li>
                    <li><strong>Event Accuracy:</strong> Unit tests ensure that lifecycle events (<code>init</code>, <code>resize</code>, etc.) fire with precise timing.</li>
                </ul>
            </div>
        `
    },
    production: {
        title: "Production Readiness",
        content: `
            <div class="markdown-body">
                <h1>Production Readiness</h1>
                <p>TulWEB v2.3.0 introduced critical features to transform the toolkit from a prototype into a production-grade library.</p>
                
                <h2>1. Memory Management</h2>
                <p>The <code>LayoutManager</code> and its children now implement a strict <code>destroy()</code> lifecycle. This ensures that in Single Page Applications (SPAs), navigating away from a layout view completely cleans up global event listeners, ResizeObservers, and DOM elements.</p>
                
                <h2>2. Isolation & Multi-Instance</h2>
                <p>The drag-and-drop orchestration has been refactored from a global singleton into a per-instance <code>DragManager</code>. This allows you to host multiple <code>LayoutManager</code> instances on the same page (e.g., in a dashboard with separate floating docks) without state interference.</p>

                <h2>3. Configuration Validation</h2>
                <p>The <code>loadLayout()</code> method now performs basic validation of the input configuration, catching structural errors before they cause deep runtime failures.</p>
                
                <h2>4. Full Accessibility (a11y)</h2>
                <p>TulWEB is now fully navigable via keyboard. Tabs and splitters support standard ARIA patterns, allowing users with visual or motor impairments to effectively manage complex layouts.</p>
            </div>
        `
    }
};

import { LayoutManager } from './tulweb.js';

document.addEventListener("DOMContentLoaded", function () {

    // Inject Markdown CSS into head programmatically for isolation
    const style = document.createElement('style');
    style.innerHTML = `
        .markdown-body {
            max-width: 800px;
            margin: 0 auto;
            color: var(--tulweb-text-primary);
            font-size: 15px;
            line-height: 1.7;
            padding-bottom: 40px;
        }
        .markdown-body h1 {
            font-size: 2.2em;
            font-weight: 600;
            letter-spacing: -0.02em;
            margin-bottom: 0.5em;
            color: var(--tulweb-text-primary);
            padding-bottom: 0.3em;
            border-bottom: 1px solid var(--tulweb-border);
        }
        .markdown-body h2 {
            font-size: 1.5em;
            font-weight: 600;
            margin-top: 1.5em;
            margin-bottom: 0.8em;
            color: var(--tulweb-text-primary);
        }
        .markdown-body p {
            margin-top: 0;
            margin-bottom: 1.2em;
            color: var(--tulweb-text-secondary);
        }
        .markdown-body ul {
            padding-left: 20px;
            margin-bottom: 1.5em;
            color: var(--tulweb-text-secondary);
        }
        .markdown-body li {
            margin-bottom: 0.4em;
        }
        .markdown-body code {
            background: var(--tulweb-bg-tab);
            padding: 0.2em 0.4em;
            border-radius: 4px;
            font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
            font-size: 0.9em;
            border: 1px solid var(--tulweb-border);
            color: var(--tulweb-accent);
        }
        .markdown-body .code-block {
            background: var(--tulweb-bg-console, #0a0a0c);
            border: 1px solid var(--tulweb-border);
            border-radius: var(--tulweb-radius-inner);
            padding: 16px;
            margin-bottom: 1.5em;
            overflow-x: auto;
            box-shadow: inset 0 2px 8px rgba(0,0,0,0.2);
        }
        .markdown-body .code-block pre {
            margin: 0;
            font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
            font-size: 14px;
            line-height: 1.5;
            color: var(--tulweb-text-console, #e2e8f0);
        }
        .markdown-body .code-block code {
            background: transparent;
            padding: 0;
            border: none;
            color: inherit;
        }
        
        /* Syntax highlighting mocks */
        .markdown-body .keyword { color: #ff7b72; }
        .markdown-body .string { color: #a5d6ff; }
        .markdown-body .property { color: #d2a8ff; }
        .markdown-body .comment { color: #8b949e; font-style: italic; }

        .markdown-body kbd {
            display: inline-block;
            padding: 3px 5px;
            font-size: 11px;
            line-height: 10px;
            color: var(--tulweb-text-primary);
            vertical-align: middle;
            background-color: var(--tulweb-bg-tab);
            border: 1px solid var(--tulweb-border);
            border-bottom-color: var(--tulweb-border);
            border-radius: 6px;
            box-shadow: inset 0 -1px 0 var(--tulweb-border);
        }

        .markdown-body .alert {
            padding: 16px;
            border-radius: var(--tulweb-radius-inner);
            margin: 1.5em 0;
            border-left: 4px solid var(--tulweb-accent);
            background: rgba(12, 186, 186, 0.05); /* slightly tinted */
        }
        body.theme-cyber .markdown-body .alert { background: rgba(245, 158, 11, 0.08); }
        body.theme-light .markdown-body .alert { background: rgba(37, 99, 235, 0.05); }

        .markdown-body .alert.warning {
            border-left-color: #f59e0b;
        }
        .markdown-body .alert p { margin: 0; color: var(--tulweb-text-primary); }

        .markdown-body .api-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 2em;
        }
        .markdown-body .api-table th, 
        .markdown-body .api-table td {
            text-align: left;
            padding: 12px;
            border-bottom: 1px solid var(--tulweb-border);
        }
        .markdown-body .api-table th {
            color: var(--tulweb-text-primary);
            font-weight: 600;
        }
        .markdown-body .api-table td {
            color: var(--tulweb-text-secondary);
        }
    `;
    document.head.appendChild(style);

    function DocViewerFactory(state = {}, container = null) {
        const el = document.createElement("div");
        el.style.padding = "30px 40px";
        el.style.height = "100%";
        el.style.overflowY = "auto";
        el.style.boxSizing = "border-box";

        if (state.topic && docsTopics[state.topic]) {
            el.innerHTML = docsTopics[state.topic].content;
        } else {
            el.innerHTML = `<div class="markdown-body"><p>Select a topic from the sidebar.</p></div>`;
        }

        return el;
    }

    function SidebarFactory(state = {}, container = null) {
        const el = document.createElement("div");
        el.className = "app-sidebar";
        el.style.width = "100%";
        el.style.height = "100%";
        el.style.borderRight = "none";
        el.style.boxShadow = "none";
        el.style.background = "transparent";

        el.innerHTML = `
        <div>
            <h1>TulWEB Docs</h1>
            <p style="color: var(--tulweb-text-secondary); font-size: 13px; margin: 0; line-height: 1.4;">Drag chapters
                into the workspace to read side-by-side.</p>
        </div>

        <div class="app-sidebar-scroll">
            <div style="margin-bottom: 24px;">
                <h2>Core Concepts</h2>
                <div class="sidebar-item-container">
                    <div class="sidebar-item" data-topic="intro">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2">
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                        </svg>
                        Introduction
                    </div>
                    <div class="sidebar-item" data-topic="architecture">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2">
                            <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                            <polyline points="2 17 12 22 22 17"></polyline>
                            <polyline points="2 12 12 17 22 12"></polyline>
                        </svg>
                        Architecture
                    </div>
                    <div class="sidebar-item" data-topic="dnd">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M16 12l-4-4-4 4M12 8v8"></path>
                        </svg>
                        Drag & Drop
                    </div>
                    <div class="sidebar-item" data-topic="production">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                        </svg>
                        Production Readiness
                    </div>
                </div>
            </div>

            <div style="margin-bottom: 24px;">
                <h2>API Reference</h2>
                <div class="sidebar-item-container">
                    <div class="sidebar-item" data-topic="layoutManager">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="3" y1="9" x2="21" y2="9"></line>
                            <line x1="9" y1="21" x2="9" y2="9"></line>
                        </svg>
                        LayoutManager
                    </div>
                    <div class="sidebar-item" data-topic="components">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2">
                            <polyline points="16 18 22 12 16 6"></polyline>
                            <polyline points="8 6 2 12 8 18"></polyline>
                        </svg>
                        Components
                    </div>
                    <div class="sidebar-item" data-topic="events">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2">
                            <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                        </svg>
                        Events & Shortcuts
                    </div>
                </div>
            </div>

            <div style="margin-bottom: 24px;">
                <h2>Customization</h2>
                <div class="sidebar-item-container">
                    <div class="sidebar-item" data-topic="theming">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2">
                            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                        </svg>
                        Theming Engine
                    </div>
                </div>
            </div>

            <div>
                <h2>Integrations</h2>
                <div class="sidebar-item-container">
                    <div class="sidebar-item" data-topic="reactAngular">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                        </svg>
                        React & Angular
                    </div>
                    <div class="sidebar-item" data-topic="testing">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                        Automated Testing
                    </div>
                </div>
            </div>
        </div>

        <div>
            <h2>Select Theme</h2>
            <div class="theme-selector">
                <label class="theme-label">
                    <input type="radio" name="theme-docs" class="theme-radio" value="theme-nordic" ${document.body.classList.contains('theme-nordic') ? 'checked' : ''}>
                    <span class="theme-name">Industrial Graphite</span>
                </label>
                <label class="theme-label">
                    <input type="radio" name="theme-docs" class="theme-radio" value="theme-cyber" ${document.body.classList.contains('theme-cyber') ? 'checked' : ''}>
                    <span class="theme-name">Phosphor Terminal</span>
                </label>
                <label class="theme-label">
                    <input type="radio" name="theme-docs" class="theme-radio" value="theme-light" ${document.body.classList.contains('theme-light') ? 'checked' : ''}>
                    <span class="theme-name">Pro Light</span>
                </label>
                <label class="theme-label">
                    <input type="radio" name="theme-docs" class="theme-radio" value="theme-retro" ${document.body.classList.contains('theme-retro') ? 'checked' : ''}>
                    <span class="theme-name">90's Workstation</span>
                </label>
            </div>
        </div>

        <div class="nav-links">
            <a href="index.html" class="nav-link">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="19" y1="12" x2="5" y2="12"></line>
                    <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
                To Example
            </a>
        </div>
        `;

        if (container) {
            const layout = container.layoutManager;

            el.querySelectorAll('.sidebar-item').forEach(item => {
                const topic = item.getAttribute('data-topic');
                if (topic && docsTopics[topic]) {
                    const config = {
                        type: 'component',
                        componentName: 'docViewer',
                        title: docsTopics[topic].title,
                        componentState: { topic: topic }
                    };
                    layout.createDragSource(item, config);
                }
            });

            const themeSelector = el.querySelector(".theme-selector");
            themeSelector.addEventListener("change", (e) => {
                if (e.target.name === 'theme-docs') {
                    document.body.className = e.target.value;
                }
            });
        }

        return el;
    }

    const initialLayoutConfig = {
        content: [{
            type: 'row',
            content: [
                {
                    type: 'stack',
                    size: 30,
                    minWidth: 260,
                    tabPosition: 'left',
                    content: [{ type: 'component', componentName: 'sidebar', title: 'Toolkit' }]
                },
                {
                    type: 'column',
                    size: 45,
                    content: [
                        {
                            type: 'stack',
                            size: 100,
                            content: [
                                { type: 'component', componentName: 'docViewer', title: docsTopics.intro.title, componentState: { topic: 'intro' } },
                                { type: 'component', componentName: 'docViewer', title: docsTopics.architecture.title, componentState: { topic: 'architecture' } }
                            ]
                        }
                    ]
                },
                {
                    type: 'column',
                    size: 35,
                    content: [
                        {
                            type: 'stack',
                            size: 50,
                            content: [
                                { type: 'component', componentName: 'docViewer', title: docsTopics.layoutManager.title, componentState: { topic: 'layoutManager' } },
                                { type: 'component', componentName: 'docViewer', title: docsTopics.components.title, componentState: { topic: 'components' } }
                            ]
                        },
                        {
                            type: 'stack',
                            size: 50,
                            content: [
                                { type: 'component', componentName: 'docViewer', title: docsTopics.theming.title, componentState: { topic: 'theming' } },
                                { type: 'component', componentName: 'docViewer', title: docsTopics.reactAngular.title, componentState: { topic: 'reactAngular' } },
                                { type: 'component', componentName: 'docViewer', title: docsTopics.dnd.title, componentState: { topic: 'dnd' } },
                                { type: 'component', componentName: 'docViewer', title: docsTopics.events.title, componentState: { topic: 'events' } }
                            ]
                        }
                    ]
                }
            ]
        }]
    };

    const containerWrapper = document.getElementById("layout-container");
    const layout = new LayoutManager(null, containerWrapper);

    // Register the documentation viewer component
    layout.registerComponent('sidebar', SidebarFactory);
    layout.registerComponent('docViewer', DocViewerFactory);

    // Load the initial layout tree
    try {
        layout.loadLayout(initialLayoutConfig);
    } catch (e) {
        console.error("Failed to load layout:", e);
    }

});
