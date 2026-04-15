import { LayoutManager } from '../src/tulweb.js';

document.addEventListener("DOMContentLoaded", function () {

    // Custom Factory Components for the Demo
    function TextEditorFactory(state = {}, container = null) {
        const wrapper = document.createElement("div")
        wrapper.style.height = "100%"
        wrapper.style.display = "flex"
        wrapper.style.flexDirection = "column"

        if (state.isLayoutEditor) {
            const toolbar = document.createElement("div")
            toolbar.style.padding = "8px 16px"
            toolbar.style.background = "var(--tulweb-bg-tab)"
            toolbar.style.borderBottom = "1px solid var(--tulweb-border)"
            toolbar.style.display = "flex"
            toolbar.style.justifyContent = "flex-end"
            toolbar.style.alignItems = "center"
            toolbar.style.gap = "8px"

            const label = document.createElement("span")
            label.textContent = "Live Layout Editor"
            label.style.fontSize = "11px"
            label.style.fontWeight = "600"
            label.style.color = "var(--tulweb-text-secondary)"
            label.style.textTransform = "uppercase"
            label.style.letterSpacing = "0.5px"
            label.style.marginRight = "auto"
            toolbar.appendChild(label)

            const btn = document.createElement("button")
            btn.className = "btn btn-small"
            btn.innerText = "Apply Changes"
            btn.style.padding = "4px 12px"
            btn.onclick = () => {
                try {
                    const newConfig = JSON.parse(textArea.value)
                    if (container && container.layoutManager) {
                        container.layoutManager.loadLayout(newConfig)
                        window.tulWebLogger("Layout applied from editor", "#50fa7b")
                    } else if (window.layout) {
                        window.layout.loadLayout(newConfig)
                        window.tulWebLogger("Layout applied from editor (global fallback)", "#50fa7b")
                    }
                } catch (e) {
                    window.tulWebLogger("Invalid JSON: " + e.message, "#ff5555")
                }
            }
            toolbar.appendChild(btn)
            wrapper.appendChild(toolbar)
        }

        const textArea = document.createElement("textarea")
        textArea.style.flexGrow = "1"
        textArea.style.width = "100%"
        textArea.style.background = "var(--tulweb-bg-editor)"
        textArea.style.color = "var(--tulweb-text-editor)"
        textArea.style.border = "none" /* removed border inside panel for pure seamless glass */
        textArea.style.padding = "16px"
        textArea.style.resize = "none"
        textArea.style.fontFamily = "monospace"
        textArea.style.outline = "none"
        textArea.style.borderRadius = "4px"
        textArea.value = state.text || "// Write your code here...\nfunction hello() {\n  console.log('world')\n}";

        wrapper.appendChild(textArea)

        if (container) {
            container.on('resize', () => {
                // We could react to resize here
            })
        }

        return wrapper
    }

    const activeConsoles = new Set();
    window.tulWebLogger = (msg, color = null) => {
        const style = color ? ` style="color:${color}"` : '';
        const line = `<div${style}>> ${msg}</div>`;
        activeConsoles.forEach(el => {
            el.innerHTML += line;
            el.scrollTop = el.scrollHeight;
        });
    };

    function ConsoleFactory(state = {}, container = null) {
        const el = document.createElement("div")
        el.style.height = "100%"
        el.style.background = "var(--tulweb-bg-console)"
        el.style.color = "var(--tulweb-text-console)"
        el.style.fontFamily = "monospace"
        el.style.padding = "16px"
        el.style.overflowY = "auto";

        const lines = [
            "TulWEB v2.7.0 initialized.",
            "Loading modules...",
            "[OK] Layout Manager Events",
            "[OK] Drag & Drop System",
            "System ready. Listening for resize."
        ];

        el.innerHTML = lines.map(l => `<div>> ${l}</div>`).join("");
        activeConsoles.add(el);

        if (container) {
            container.on('destroy', () => activeConsoles.delete(el));
            container.on('resize', () => {
                const rect = el.getBoundingClientRect();
                window.tulWebLogger(`Pane resized to ${rect.width.toFixed(0)}x${rect.height.toFixed(0)}`, 'var(--tulweb-text-secondary)');
            });
            container.on('init', () => {
                window.tulWebLogger('Component Lifecycle: init() fired', '#50fa7b');
            });
        }

        return el;
    }

    function DataGridFactory(state = {}, container = null) {
        const wrapper = document.createElement("div");
        wrapper.style.height = "100%";
        wrapper.style.overflow = "auto";
        wrapper.style.background = "var(--tulweb-bg-panel)";

        const table = document.createElement("table");
        table.style.width = "100%";
        table.style.borderCollapse = "collapse";
        table.style.color = "var(--tulweb-text-primary)";
        table.style.fontSize = "13px";

        const thead = document.createElement("thead");
        thead.style.background = "var(--tulweb-bg-tab)";
        thead.innerHTML = `<tr>
          <th style="padding: 10px; text-align: left; border-bottom: 1px solid var(--tulweb-border);">ID</th>
          <th style="padding: 10px; text-align: left; border-bottom: 1px solid var(--tulweb-border);">Name</th>
          <th style="padding: 10px; text-align: left; border-bottom: 1px solid var(--tulweb-border);">Status</th>
          <th style="padding: 10px; text-align: left; border-bottom: 1px solid var(--tulweb-border);">Metric</th>
      </tr>`;
        table.appendChild(thead);

        const tbody = document.createElement("tbody");
        for (let i = 1; i <= 20; i++) {
            const row = document.createElement("tr");
            row.style.borderBottom = "1px solid var(--tulweb-border)";
            const status = i % 3 === 0 ? '<span style="color: #ff5555">Error</span>' : (i % 2 === 0 ? '<span style="color: #50fa7b">Active</span>' : '<span style="color: #f1fa8c">Pending</span>');
            row.innerHTML = `
              <td style="padding: 8px 10px;">#${1000 + i}</td>
              <td style="padding: 8px 10px;">Process_${i}</td>
              <td style="padding: 8px 10px;">${status}</td>
              <td style="padding: 8px 10px;">${(Math.random() * 100).toFixed(2)}%</td>
          `;
            // Add hover effect
            row.addEventListener('mouseover', () => row.style.background = 'var(--tulweb-bg-tab-active)');
            row.addEventListener('mouseout', () => row.style.background = 'transparent');
            tbody.appendChild(row);
        }
        table.appendChild(tbody);
        wrapper.appendChild(table);

        return wrapper;
    }

    function ImageViewerFactory(state = {}, container = null) {
        const wrapper = document.createElement("div");
        wrapper.style.height = "100%";
        wrapper.style.display = "flex";
        wrapper.style.alignItems = "center";
        wrapper.style.justifyContent = "center";
        wrapper.style.background = "var(--tulweb-bg-panel)";
        wrapper.style.overflow = "hidden";

        const img = document.createElement("img");
        img.src = state.url || "https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=1200&auto=format&fit=crop";
        img.style.maxWidth = "100%";
        img.style.maxHeight = "100%";
        img.style.objectFit = "contain";

        wrapper.appendChild(img);
        return wrapper;
    }


    function GenericPanelFactory(state = {}, container = null) {
        const el = document.createElement("div");
        el.style.padding = "24px";
        el.style.color = "var(--tulweb-text-secondary)";
        el.style.overflow = "auto";
        el.style.height = "100%";

        const content = document.createElement("div");
        if (state.explanation) {
            content.innerHTML = `<h1 style="color:var(--tulweb-accent); margin-top:0; font-size: 24px; font-weight: 600;">${state.name || 'Panel'}</h1>${state.explanation}`;
        } else {
            content.innerHTML = `<h3 style="color:var(--tulweb-text-primary); margin-top:0;">${state.name || 'Panel'}</h3><p>Use the toolbar to drag new components into the layout.</p>`;
        }
        el.appendChild(content);

        const dimensionsEl = document.createElement("div");
        dimensionsEl.style.marginTop = "20px";
        dimensionsEl.style.paddingTop = "15px";
        dimensionsEl.style.borderTop = "1px solid var(--tulweb-border)";
        dimensionsEl.style.fontFamily = "monospace";
        dimensionsEl.style.fontSize = "12px";
        dimensionsEl.style.color = "var(--tulweb-accent)";
        el.appendChild(dimensionsEl);

        if (container) {
            const btn = document.createElement("button");
            btn.style.background = "var(--tulweb-bg-tab)";
            btn.style.color = "var(--tulweb-text-primary)";
            btn.style.border = "1px solid var(--tulweb-border)";
            btn.style.padding = "8px 12px";
            btn.style.borderRadius = "var(--tulweb-radius-inner)";
            btn.style.cursor = "pointer";
            btn.textContent = "Programmatic Close";

            container.on('init', () => {
                btn.addEventListener('click', () => {
                    container.destroy();
                });
                // Force an initial size update after mounting
                container.emit('resize');
            });

            container.on('resize', () => {
                const rect = container.element.getBoundingClientRect();
                dimensionsEl.innerText = `Dimensions: ${rect.width.toFixed(0)}w x ${rect.height.toFixed(0)}h`;
            });

            el.appendChild(btn);
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
            <h1>TulWEB</h1>
            <h2 style="margin-bottom: 0;">Windowing Toolkit</h2>
            <p style="color: var(--tulweb-text-secondary); font-size: 12px; margin-top: 4px;">Drag & Drop into layout</p>
        </div>

        <div>
            <h2>Components</h2>
            <div style="display: flex; flex-direction: column; gap: 8px;">
                <div class="sidebar-item" data-type="editor">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                    Code Editor
                </div>
                <div class="sidebar-item" data-type="console">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="4 17 10 11 4 5"></polyline>
                        <line x1="12" y1="19" x2="20" y2="19"></line>
                    </svg>
                    Terminal Console
                </div>
                <div class="sidebar-item" data-type="datagrid">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="3" y1="9" x2="21" y2="9"></line>
                        <line x1="9" y1="21" x2="9" y2="9"></line>
                    </svg>
                    Data Grid
                </div>
                <div class="sidebar-item" data-type="image">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                    Image Viewer
                </div>
                <div class="sidebar-item" data-type="generic">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="9" y1="3" x2="9" y2="21"></line>
                    </svg>
                    Generic Panel
                </div>
                <div class="sidebar-item" data-type="stackL">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="9" y1="3" x2="9" y2="21"></line>
                    </svg>
                    Left Stack
                </div>
                <div class="sidebar-item" data-type="stackR">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="9" y1="3" x2="9" y2="21"></line>
                    </svg>
                    Right Stack
                </div>
                <div class="sidebar-item" data-type="stackB">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="9" y1="3" x2="9" y2="21"></line>
                    </svg>
                    Bottom Stack
                </div>
                <div class="sidebar-item" data-type="stackH">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    </svg>
                    Headless Stack
                </div>
            </div>
        </div>

        <div>
            <h2>Theme</h2>
            <div class="theme-selector">
                <label class="theme-label">
                    <input type="radio" name="theme-app" class="theme-radio" value="theme-nordic" ${document.body.classList.contains('theme-nordic') ? 'checked' : ''}>
                    <span class="theme-name">Industrial Graphite</span>
                </label>
                <label class="theme-label">
                    <input type="radio" name="theme-app" class="theme-radio" value="theme-cyber" ${document.body.classList.contains('theme-cyber') ? 'checked' : ''}>
                    <span class="theme-name">Phosphor Terminal</span>
                </label>
                <label class="theme-label">
                    <input type="radio" name="theme-app" class="theme-radio" value="theme-light" ${document.body.classList.contains('theme-light') ? 'checked' : ''}>
                    <span class="theme-name">Pro Light</span>
                </label>
                <label class="theme-label">
                    <input type="radio" name="theme-app" class="theme-radio" value="theme-retro" ${document.body.classList.contains('theme-retro') ? 'checked' : ''}>
                    <span class="theme-name">90's Workstation</span>
                </label>
            </div>
        </div>

        <div>
            <h2>Presets</h2>
            <div class="btn-group">
                <button id="btn-layout-ide" class="btn btn-outline btn-small">IDE</button>
                <button id="btn-layout-dash" class="btn btn-outline btn-small">Dash</button>
                <button id="btn-layout-grid" class="btn btn-outline btn-small">Grid</button>
            </div>
        </div>

        <div>
            <h2>Actions API</h2>
            <button id="btn-add-tab" class="btn btn-outline"
                style="width: 100%; text-align: left; padding: 10px; font-size: 13px;">+ Add Tab via API</button>
        </div>

        <div class="actions">
            <h2>State</h2>
            <div class="btn-group">
                <button id="btn-save" class="btn btn-small">Save</button>
                <button id="btn-load" class="btn btn-outline btn-small">Load</button>
            </div>
            <button id="btn-reset" class="btn btn-outline" style="font-size: 12px; padding: 8px;">Reset Default</button>
            <button id="btn-install" class="btn btn-outline" style="display: none; width: 100%; margin-top: 8px; font-size: 12px; border-color: var(--tulweb-accent); color: var(--tulweb-accent); font-weight: 600;">
                📥 Install Desktop App
            </button>
        </div>
        `;

        if (container) {
            const layout = container.layoutManager;

            el.querySelectorAll('.sidebar-item').forEach(item => {
                const type = item.getAttribute('data-type');
                let config;
                if (type === 'editor') config = { type: 'component', componentName: 'editor', title: 'Code Editor', componentState: {} };
                else if (type === 'console') config = { type: 'component', componentName: 'console', title: 'Terminal Console', componentState: {} };
                else if (type === 'datagrid') config = { type: 'component', componentName: 'datagrid', title: 'Data Grid', componentState: {} };
                else if (type === 'image') config = { type: 'component', componentName: 'image', title: 'Image Viewer', componentState: {} };
                else if (type === 'stackL') config = { type: 'component', componentName: 'generic', title: 'Left Stack', componentState: { name: 'New Panel' }, tabPosition: 'left' };
                else if (type === 'stackR') config = { type: 'component', componentName: 'generic', title: 'Right Stack', componentState: { name: 'New Panel' }, tabPosition: 'right' };
                else if (type === 'stackB') config = { type: 'component', componentName: 'generic', title: 'Bottom Stack', componentState: { name: 'New Panel' }, tabPosition: 'bottom' };
                else if (type === 'stackH') config = { type: 'component', componentName: 'generic', title: 'Headless Stack', componentState: { name: 'Headless Panel' }, tabPosition: 'headless' };
                else config = { type: 'component', componentName: 'generic', title: 'Generic Panel', componentState: { name: 'New Panel' } };


                layout.createDragSource(item, config);
            });

            el.querySelector("#btn-save").addEventListener("click", () => {
                const config = layout.toConfig();
                localStorage.setItem('tulweb_saved_state_v2', JSON.stringify(config));
                window.tulWebLogger("Layout saved to workspace", "#50fa7b");
            });

            el.querySelector("#btn-load").addEventListener("click", () => {
                const saved = localStorage.getItem('tulweb_saved_state_v2');
                if (saved) {
                    layout.loadLayout(JSON.parse(saved));
                    window.tulWebLogger("Layout loaded successfully", "#50fa7b");
                } else {
                    window.tulWebLogger("No saved layout found", "#ff5555");
                }
            });

            el.querySelector("#btn-reset").addEventListener("click", () => {
                layout.loadLayout(window.tulwebLayouts.ide);
                window.tulWebLogger("Layout reset to IDE Default", "#f1fa8c");
            });

            el.querySelector("#btn-layout-ide").addEventListener("click", () => layout.loadLayout(window.tulwebLayouts.ide));
            el.querySelector("#btn-layout-dash").addEventListener("click", () => layout.loadLayout(window.tulwebLayouts.dashboard));
            el.querySelector("#btn-layout-grid").addEventListener("click", () => layout.loadLayout(window.tulwebLayouts.grid));

            el.querySelector("#btn-add-tab").addEventListener("click", () => {
                if (layout.activeStack) {
                    const newComp = layout._buildObjectTree({
                        type: 'component', componentName: 'generic', title: 'New API Tab', componentState: { name: 'API Generated' }
                    });
                    layout.activeStack.addChild(newComp);
                    window.tulWebLogger("Tab added to active stack", "#50fa7b");
                } else {
                    window.tulWebLogger("Click a tab stack to focus it first", "#ff5555");
                }
            });

            const themeSelector = el.querySelector(".theme-selector");
            themeSelector.addEventListener("change", (e) => {
                if (e.target.name === 'theme-app') {
                    document.body.className = e.target.value;
                    // Broadcast theme to any open popout windows
                    if (layout.broadcastThemeToPopouts) {
                        layout.broadcastThemeToPopouts(e.target.value);
                    }
                }
            });

            // PWA Install Logic
            const installBtn = el.querySelector("#btn-install");
            if (window.deferredPrompt) {
                installBtn.style.display = 'block';
            }

            window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                window.deferredPrompt = e;
                installBtn.style.display = 'block';
            });

            installBtn.addEventListener('click', async () => {
                if (window.deferredPrompt) {
                    window.deferredPrompt.prompt();
                    const { outcome } = await window.deferredPrompt.userChoice;
                    if (outcome === 'accepted') {
                        installBtn.style.display = 'none';
                    }
                    window.deferredPrompt = null;
                }
            });
        }

        return el;
    }

    // Pre-defined Layout Configurations
    window.tulwebLayouts = {
        ide: {
            content: [{
                type: 'row',
                content: [
                    {
                        type: 'stack',
                        size: "300px",
                        minWidth: "300px",
                        tabPosition: 'left',
                        displayMaximizeButton: false,
                        displayCloseButton: false,
                        preventEmptyClosure: true,
                        content: [
                            { type: 'component', componentName: 'sidebar', title: 'Toolkit', closeable: false }
                        ]
                    },
                    {
                        type: 'column',
                        size: 80,
                        content: [
                            {
                                type: 'stack',
                                size: 70,
                                preventEmptyClosure: true,
                                displayCloseButton: false,
                                displayMinimizeButton: false,
                                content: [
                                    {
                                        type: 'component',
                                        componentName: 'generic',
                                        title: 'How to use',
                                        componentState: {
                                            name: 'How to use the Demo',
                                            explanation: `
                                                <div style="line-height: 1.6; font-family: 'Inter', sans-serif;">
                                                    <p>Welcome to the <strong>TulWEB</strong> interactive demo. This toolkit allows you to create complex, responsive layouts with ease.</p>
                                                    
                                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px;">
                                                        <div style="background: var(--tulweb-bg-tab); padding: 12px; border-radius: 8px; border: 1px solid var(--tulweb-border);">
                                                            <h4 style="margin: 0 0 8px 0; color: var(--tulweb-accent); display: flex; align-items: center; gap: 8px;">
                                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
                                                                Layout Control
                                                            </h4>
                                                            <ul style="padding-left: 18px; font-size: 12px; margin: 0;">
                                                                <li><strong>Drag Tabs:</strong> Move tabs between stacks or create new rows/cols.</li>
                                                                <li><strong>Resize:</strong> Drag the splitters between panels to adjust sizes.</li>
                                                                <li><strong>Maximize:</strong> Use the ⛶ icon to focus on a single stack.</li>
                                                            </ul>
                                                        </div>
                                                        <div style="background: var(--tulweb-bg-tab); padding: 12px; border-radius: 8px; border: 1px solid var(--tulweb-border);">
                                                            <h4 style="margin: 0 0 8px 0; color: var(--tulweb-accent); display: flex; align-items: center; gap: 8px;">
                                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
                                                                Components
                                                            </h4>
                                                            <ul style="padding-left: 18px; font-size: 12px; margin: 0;">
                                                                <li><strong>Toolkit:</strong> Drag items from the left sidebar into the workspace.</li>
                                                                <li><strong>Presets:</strong> Quickly switch layouts using the sidebar buttons.</li>
                                                                <li><strong>Themes:</strong> Instantly switch between 4 professional themes.</li>
                                                            </ul>
                                                        </div>
                                                    </div>

                                                    <div style="margin-top: 16px; background: var(--tulweb-bg-tab); padding: 12px; border-radius: 8px; border-left: 4px solid var(--tulweb-accent);">
                                                        <h4 style="margin: 0 0 4px 0; color: var(--tulweb-text-primary); font-size: 13px;">💡 Live Editing</h4>
                                                        <p style="font-size: 12px; margin: 0;">Check the <code>layout.json</code> tab in this stack. Edit the JSON and click <strong>Apply Changes</strong> to see the layout engine update in real-time!</p>
                                                    </div>
                                                </div>
                                            `
                                        }
                                    },
                                    {
                                        type: 'component',
                                        componentName: 'generic',
                                        title: 'README.md',
                                        componentState: {
                                            name: 'Welcome to TulWEB Demo',
                                            explanation: `
                                                <div style="line-height: 1.6;">
                                                    <p>This is a live demonstration of the <strong>TulWEB Layout Manager</strong>.</p>
                                                    <p>TulWEB is designed for performance, modularity, and modern aesthetics. It supports:</p>
                                                    <ul style="padding-left: 20px;">
                                                        <li>Recursive row/column nesting</li>
                                                        <li>Mixed CSS units (px, %, etc.)</li>
                                                        <li>Full drag-and-drop lifecycle</li>
                                                        <li>Custom component factories</li>
                                                        <li>Deep state serialization</li>
                                                    </ul>
                                                </div>
                                            `
                                        }
                                    },
                                    { type: 'component', componentName: 'editor', title: 'main.js', componentState: { text: "console.log('IDE Mode');" } },
                                    { type: 'component', componentName: 'editor', title: 'layout.json', componentState: { isLayoutEditor: true, text: "" } }
                                ]
                            },
                            {
                                type: 'stack',
                                size: 30,
                                tabPosition: 'bottom',
                                preventEmptyClosure: true,
                                content: [{ type: 'component', componentName: 'console', title: 'Terminal', closeable: false }]
                            }
                        ]
                    },
                    {
                        type: 'stack',
                        size: 20,
                        tabPosition: 'right',
                        minimized: true,
                        displayCloseButton: false,
                        preventEmptyClosure: true,
                        content: [
                            { type: 'component', componentName: 'generic', title: 'Assistant', componentState: { name: 'Assistant' } },
                            { type: 'component', componentName: 'datagrid', title: 'Database', componentState: { name: 'Database' } }
                        ]
                    },
                ]
            }]
        },
        dashboard: {
            content: [{
                type: 'row',
                content: [
                    {
                        type: 'stack',
                        size: 30,
                        preventEmptyClosure: true,
                        content: [{ type: 'component', componentName: 'generic', title: 'Persistent Area', componentState: { name: 'This area will NOT vanish even if you close all tabs.' } }]
                    },
                    {
                        type: 'column',
                        size: 70,
                        content: [
                            {
                                type: 'stack',
                                size: 50,
                                content: [{ type: 'component', componentName: 'generic', title: 'Stats', componentState: { name: 'Stats' } }]
                            },
                            {
                                type: 'row',
                                size: 50,
                                content: [
                                    {
                                        type: 'stack',
                                        size: 50,
                                        content: [{ type: 'component', componentName: 'datagrid', title: 'Live Metrics' }]
                                    },
                                    {
                                        type: 'stack',
                                        size: 50,
                                        tabPosition: 'right',
                                        content: [{ type: 'component', componentName: 'image', title: 'Network Topology', componentState: { url: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=1200&auto=format" } }]
                                    }
                                ]
                            },
                            {
                                type: 'row',
                                size: 50,
                                content: [
                                    {
                                        type: 'stack',
                                        size: 30,
                                        content: [{ type: 'component', componentName: 'console', title: 'System Logs' }]
                                    },
                                    {
                                        type: 'stack',
                                        size: 70,
                                        content: [{ type: 'component', componentName: 'datagrid', title: 'User List' }]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }]
        },
        grid: {
            content: [{
                type: 'row',
                content: [
                    {
                        type: 'stack',
                        size: 20,
                        minWidth: 260,
                        tabPosition: 'left',
                        content: [{ type: 'component', componentName: 'sidebar', title: 'Toolkit' }]
                    },
                    {
                        type: 'column',
                        size: 80,
                        content: [
                            {
                                type: 'row',
                                content: [
                                    {
                                        type: 'column', size: 33.33,
                                        content: [
                                            { type: 'stack', size: 50, tabPosition: 'headless', content: [{ type: 'component', componentName: 'generic', title: 'Headless Panel', componentState: { explanation: '<p>This stack is <b>headless</b>. It has no tab bar or controls. Use the API to manage its content.</p>' } }] },
                                            { type: 'stack', size: 50, content: [{ type: 'component', componentName: 'image', title: 'Panel 2' }] }
                                        ]
                                    },
                                    {
                                        type: 'column', size: 33.33,
                                        content: [
                                            { type: 'stack', size: 50, content: [{ type: 'component', componentName: 'console', title: 'Panel 3' }] },
                                            { type: 'stack', size: 50, content: [{ type: 'component', componentName: 'editor', title: 'Panel 4' }] }
                                        ]
                                    },
                                    {
                                        type: 'column', size: 33.33,
                                        content: [
                                            { type: 'stack', size: 50, content: [{ type: 'component', componentName: 'datagrid', title: 'Panel 5' }] },
                                            { type: 'stack', size: 50, content: [{ type: 'component', componentName: 'generic', title: 'Panel 6' }] }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }]
        }
    };

    // 1. Initialize Layout Manager
    const containerWrapper = document.getElementById("layout-container");
    const layout = new LayoutManager(null, containerWrapper, { enablePopout: true });

    // Make layout globally accessible for the demo buttons
    window.layout = layout;

    // Listen to Global Events
    layout.on('saveRequested', () => {
        const config = layout.toConfig();
        localStorage.setItem('tulweb_saved_state_v2', JSON.stringify(config));
        if (window.tulWebLogger) window.tulWebLogger('Layout saved (Ctrl+S)', '#50fa7b');
    });
    layout.on('stateChanged', () => {
        if (window.tulWebLogger) window.tulWebLogger('Event: stateChanged', '#8be9fd');
    });
    layout.on('componentCreated', (comp) => {
        if (window.tulWebLogger) window.tulWebLogger('Event: componentCreated', '#50fa7b');

        const getName = () => comp.config.title || comp.config.componentName || 'Component';
        comp.on('active', () => window.tulWebLogger(`${getName()} Active`, '#bd93f9'));
        comp.on('inactive', () => window.tulWebLogger(`${getName()} Inactive`, '#ff79c6'));
        comp.on('focus', () => window.tulWebLogger(`${getName()} Focused`, '#f1fa8c'));
        comp.on('defocus', () => window.tulWebLogger(`${getName()} Unfocused`, '#6272a4'));
        comp.on('move', () => window.tulWebLogger(`${getName()} Moved`, '#8be9fd'));
        comp.on('resize', () => window.tulWebLogger(`${getName()} Resized`, 'var(--tulweb-text-secondary)'));
    });

    // Popout lifecycle events
    layout.on('popout', (stack) => {
        if (window.tulWebLogger) window.tulWebLogger(`API Event: popout (Stack: ${stack.id})`, '#bd93f9');
    });
    layout.on('popout-restore', (stack) => {
        if (window.tulWebLogger) window.tulWebLogger(`API Event: popout-restore (Stack: ${stack.id})`, '#50fa7b');
    });
    layout.on('popoutCreated', (data) => {
        if (window.tulWebLogger) window.tulWebLogger(`Popout created: ${data.popoutId}`, '#ff79c6');
    });
    layout.on('popoutReady', (data) => {
        if (window.tulWebLogger) window.tulWebLogger(`Popout ready: ${data.popoutId}`, '#50fa7b');
    });
    layout.on('popoutStateChanged', (data) => {
        if (window.tulWebLogger) window.tulWebLogger(`Popout state changed: ${data.popoutId}`, '#8be9fd');
    });
    layout.on('popoutClosed', (data) => {
        if (window.tulWebLogger) window.tulWebLogger(`Popout closed: ${data.popoutId}`, '#f1fa8c');
    });

    // 2. Register Components
    layout.registerComponent('sidebar', SidebarFactory);
    layout.registerComponent('editor', TextEditorFactory);
    layout.registerComponent('console', ConsoleFactory);
    layout.registerComponent('generic', GenericPanelFactory);
    layout.registerComponent('datagrid', DataGridFactory);
    layout.registerComponent('image', ImageViewerFactory);

    // 3. Load Initial Layout
    // Preload layout.json content for the IDE preset
    const ideLayout = window.tulwebLayouts.ide;
    const layoutEditorComp = ideLayout.content[0].content[1].content[0].content[3];
    if (layoutEditorComp && layoutEditorComp.title === 'layout.json') {
        layoutEditorComp.componentState.text = JSON.stringify(ideLayout, null, 2);
    }

    layout.loadLayout(window.tulwebLayouts.ide);

});
