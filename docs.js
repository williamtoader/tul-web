const docsTopics = {
    intro: {
        title: "Introduction",
        content: `
            <div class="markdown-body">
                <h1>Welcome to TulWM</h1>
                <p><strong>TulWM</strong> (Tul Windowing Manager) is a comprehensive, pure-JavaScript windowing and layout toolkit. Unlike heavy DOM frameworks, TulWM is built to provide advanced, dockable, resizable workspaces with zero external dependencies.</p>
                
                <p>Designed for web-based IDEs, trading terminals, and massive dashboards, it handles deeply nested row/column grids and tabbed stacks seamlessly.</p>
                
                <h2>Getting Started</h2>
                <p>Installation is straightforward. Simply drop the core CSS and JS files into your project head:</p>
                <div class="code-block">
<pre><code>&lt;link rel="stylesheet" href="tulwm.css"&gt;
&lt;script src="tulwm.js"&gt;&lt;/script&gt;</code></pre>
                </div>
                
                <div class="alert info">
                    <strong>Note:</strong> Ensure you are using HTML5 doctype. TulWM relies on modern flexbox layouts and requires a defined container height.
                </div>
            </div>
        `
    },
    architecture: {
        title: "Architecture",
        content: `
            <div class="markdown-body">
                <h1>Architecture Overview</h1>
                <p>TulWM follows a strict hierarchical DOM tree mapping. The highest node is the <code>LayoutManager</code>, which orchestrates structural <code>RowItem</code>, <code>ColumnItem</code>, and <code>StackItem</code> elements, down to the leaf <code>ComponentItem</code>s.</p>
                
                <h2>Core Entities</h2>
                <ul>
                    <li><code>LayoutManager</code>: The root controller and event bus.</li>
                    <li><code>RowItem / ColumnItem</code>: Flexbox containers splitting space either horizontally or vertically using draggble splitters.</li>
                    <li><code>StackItem</code>: A tabbed container window that acts as the immediate parent for actual application panels. Features docking, maximize state, and overflow logic.</li>
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
                <p>The <code>LayoutManager</code> is the main entry point to TulWM.</p>
                
                <h2>Constructor</h2>
                <div class="code-block">
<pre><code>const layout = new TulWM.LayoutManager(initialConfig, containerElement, options);</code></pre>
                </div>
                
                <h2>Configurations / Options</h2>
                <p>Pass an optional third <code>options</code> argument (or nest inside a <code>settings</code> property on a layout JSON object) to customize engine behavior:</p>
                <ul>
                    <li><code>onlyResizeActiveTabs</code> (default: <code>true</code>): When enabled, resize events cascade strictly to the visible tab in a stack, saving performance. Background tabs skip geometry processing until they are clicked, at which point an artificial resize event is fired to synchronize them.</li>
                </ul>
                
                <h2>Public Methods</h2>
                <table class="api-table">
                    <thead><tr><th>Method</th><th>Description</th></tr></thead>
                    <tbody>
                        <tr>
                            <td><code>registerComponent(name, factoryFn)</code></td>
                            <td>Maps a raw string name to a function returning a DOM element. Essential for rendering panel internals.</td>
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
                    </tbody>
                </table>
            </div>
        `
    },
    components: {
        title: "Components",
        content: `
            <div class="markdown-body">
                <h1>Component Factories</h1>
                <p>Instead of passing rigid HTML strings, TulWM embraces a programmatic component lifecycle. A factory function is called whenever the layout calculates that a specific panel needs to mount.</p>
                
                <h2>Building a Factory</h2>
                <div class="code-block">
<pre><span class="keyword">function</span> MyWidgetFactory(state = {}, container) {
    <span class="keyword">const</span> el = document.createElement(<span class="string">'div'</span>);
    el.innerHTML = <span class="string">'&lt;h3&gt;My Panel&lt;/h3&gt;'</span>;
    
    <span class="comment">// 1. Read saved initialization state</span>
    if (state.username) {
        el.innerHTML += <span class="string">'&lt;p&gt;Hello '</span> + state.username + <span class="string">'&lt;/p&gt;'</span>;
    }

    <span class="comment">// 2. Bind to container lifecycle</span>
    container.on(<span class="string">'resize'</span>, () =&gt; {
        console.log(<span class="string">'Panel resized'</span>);
    });

    container.on(<span class="string">'destroy'</span>, () =&gt; {
        <span class="comment">// Cleanup timers, WebSockets, etc</span>
    });

    <span class="keyword">return</span> el;
}</pre>
                </div>

                <div class="alert warning">
                    <strong>Important:</strong> You must <code>return</code> a valid DOM node from your factory. Returning undefined will throw layout rendering errors.
                </div>
            </div>
        `
    },
    dnd: {
        title: "Drag & Drop API",
        content: `
            <div class="markdown-body">
                <h1>Drag & Drop Workflows</h1>
                <p>TulWM comes packed with a sophisticated, absolute-pixel drag-and-drop system designed to prevent iframe blocking and text-selection glitches.</p>

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
                <p>TulWM implements a robust <code>EventEmitter</code> architecture allowing decoupling of business logic from layout.</p>

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
                    <li><code>active</code>: Fired when the component becomes the current visible tab in its stack.</li>
                    <li><code>inactive</code>: Fired when the component is hidden because another tab in the same stack became active.</li>
                    <li><code>focus</code>: Fired when the component is active AND its parent stack becomes focused by the user.</li>
                    <li><code>defocus</code>: Fired when the component loses user focus (either because it became inactive, or a different stack received focus).</li>
                    <li><code>move</code>: Fired when the component is dragged and dropped to a relocated position in the layout.</li>
                    <li><code>resize</code>: Fired whenever the layout dimensions change for this component.</li>
                    <li><code>destroy</code>: Fired just before the component is removed from the DOM.</li>
                </ul>

                <h2>Keyboard Shortcuts</h2>
                <p>TulWM comes with out-of-the-box keyboard accessibility hooks:</p>
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
                <p>Forget !important overrides. TulWM utilizes native CSS Custom Properties for immediate repaints and seamless glassmorphism support.</p>
                
                <h2>Extending Properties</h2>
                <p>All core color logic maps to base variables. Overwrite them at the <code>body</code> or container level:</p>
                
                <div class="code-block">
<pre><span class="keyword">body.my-theme</span> {
    <span class="property">--tulwm-bg-panel</span>: rgba(10, 15, 20, 0.85);
    <span class="property">--tulwm-bg-tab</span>: rgba(15, 20, 25, 0.5);
    <span class="property">--tulwm-accent</span>: #ff0055;
    <span class="property">--tulwm-shadow-color</span>: rgba(255, 0, 85, 0.1);
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
                <p>Since TulWM exposes a pure JavaScript, programmatic component API, integrating it with frameworks like React and Angular is straightforward. You essentially use TulWM to manage the layout, and the frameworks to render inside the panels.</p>
                
                <h2>React Integration</h2>
                <p>To use React components inside TulWM, wrap your <code>React.createRoot</code> or <code>ReactDOM.render</code> calls inside a TulWM component factory.</p>
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

<span class="comment">// 2. TulWM Factory</span>
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
    }
};

document.addEventListener("DOMContentLoaded", function () {

    // Inject Markdown CSS into head programmatically for isolation
    const style = document.createElement('style');
    style.innerHTML = `
        .markdown-body {
            max-width: 800px;
            margin: 0 auto;
            color: var(--tulwm-text-primary);
            font-size: 15px;
            line-height: 1.7;
            padding-bottom: 40px;
        }
        .markdown-body h1 {
            font-size: 2.2em;
            font-weight: 600;
            letter-spacing: -0.02em;
            margin-bottom: 0.5em;
            color: var(--tulwm-text-primary);
            padding-bottom: 0.3em;
            border-bottom: 1px solid var(--tulwm-border);
        }
        .markdown-body h2 {
            font-size: 1.5em;
            font-weight: 600;
            margin-top: 1.5em;
            margin-bottom: 0.8em;
            color: var(--tulwm-text-primary);
        }
        .markdown-body p {
            margin-top: 0;
            margin-bottom: 1.2em;
            color: var(--tulwm-text-secondary);
        }
        .markdown-body ul {
            padding-left: 20px;
            margin-bottom: 1.5em;
            color: var(--tulwm-text-secondary);
        }
        .markdown-body li {
            margin-bottom: 0.4em;
        }
        .markdown-body code {
            background: var(--tulwm-bg-tab);
            padding: 0.2em 0.4em;
            border-radius: 4px;
            font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
            font-size: 0.9em;
            border: 1px solid var(--tulwm-border);
            color: var(--tulwm-accent);
        }
        .markdown-body .code-block {
            background: var(--tulwm-bg-console, #0a0a0c);
            border: 1px solid var(--tulwm-border);
            border-radius: var(--tulwm-radius-inner);
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
            color: var(--tulwm-text-console, #e2e8f0);
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
            color: var(--tulwm-text-primary);
            vertical-align: middle;
            background-color: var(--tulwm-bg-tab);
            border: 1px solid var(--tulwm-border);
            border-bottom-color: var(--tulwm-border);
            border-radius: 6px;
            box-shadow: inset 0 -1px 0 var(--tulwm-border);
        }

        .markdown-body .alert {
            padding: 16px;
            border-radius: var(--tulwm-radius-inner);
            margin: 1.5em 0;
            border-left: 4px solid var(--tulwm-accent);
            background: rgba(12, 186, 186, 0.05); /* slightly tinted */
        }
        body.theme-cyber .markdown-body .alert { background: rgba(245, 158, 11, 0.08); }
        body.theme-light .markdown-body .alert { background: rgba(37, 99, 235, 0.05); }

        .markdown-body .alert.warning {
            border-left-color: #f59e0b;
        }
        .markdown-body .alert p { margin: 0; color: var(--tulwm-text-primary); }

        .markdown-body .api-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 2em;
        }
        .markdown-body .api-table th, 
        .markdown-body .api-table td {
            text-align: left;
            padding: 12px;
            border-bottom: 1px solid var(--tulwm-border);
        }
        .markdown-body .api-table th {
            color: var(--tulwm-text-primary);
            font-weight: 600;
        }
        .markdown-body .api-table td {
            color: var(--tulwm-text-secondary);
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

    const initialLayoutConfig = {
        content: [{
            type: 'row',
            content: [
                {
                    type: 'column',
                    size: 55,
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
                    size: 45,
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
    const layout = new TulWM.LayoutManager(null, containerWrapper);
    
    // Register the documentation viewer component
    layout.registerComponent('docViewer', DocViewerFactory);
    
    // Load the initial layout tree
    try {
        layout.loadLayout(initialLayoutConfig);
    } catch (e) {
         console.error("Failed to load layout:", e);
    }

    // Setup drag sources from sidebar items
    const dragItems = document.querySelectorAll('.sidebar-item');
    dragItems.forEach(item => {
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

    // Theme selector handler
    const themeSelector = document.getElementById("theme-selector");
    if (themeSelector) {
        const checkedRadio = themeSelector.querySelector('input[name="theme"]:checked');
        if (checkedRadio) document.body.className = checkedRadio.value;
        themeSelector.addEventListener("change", (e) => {
            if (e.target.name === 'theme') {
                document.body.className = e.target.value;
            }
        });
    }
});
