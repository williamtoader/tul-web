document.addEventListener("DOMContentLoaded", function () {

    // Custom Factory Components for the Demo
    function TextEditorFactory(state = {}, container = null) {
        const wrapper = document.createElement("div");
        wrapper.style.height = "100%";
        wrapper.style.display = "flex";
        wrapper.style.flexDirection = "column";

        const textArea = document.createElement("textarea");
        textArea.style.flexGrow = "1";
        textArea.style.width = "100%";
        textArea.style.background = "var(--tulweb-bg-editor)";
        textArea.style.color = "var(--tulweb-text-editor)";
        textArea.style.border = "none"; /* removed border inside panel for pure seamless glass */
        textArea.style.padding = "16px";
        textArea.style.resize = "none";
        textArea.style.fontFamily = "monospace";
        textArea.style.outline = "none";
        textArea.style.borderRadius = "4px";
        textArea.value = state.text || "// Write your code here...\nfunction hello() {\n  console.log('world');\n}";

        wrapper.appendChild(textArea);

        if (container) {
            container.on('resize', () => {
                // We could react to resize here
            });
        }

        return wrapper;
    }

    function ConsoleFactory(state = {}, container = null) {
        const el = document.createElement("div");
        el.style.height = "100%";
        el.style.background = "var(--tulweb-bg-console)";
        el.style.color = "var(--tulweb-text-console)";
        el.style.fontFamily = "monospace";
        el.style.padding = "16px";
        el.style.overflowY = "auto";

        const lines = [
            "TulWEB v1.0 initialized.",
            "Loading modules...",
            "[OK] Layout Manager Events",
            "[OK] Drag & Drop System",
            "System ready. Listening for resize."
        ];

        el.innerHTML = lines.map(l => `<div>> ${l}</div>`).join("");

        if (container) {
            container.on('resize', () => {
                const rect = el.getBoundingClientRect();
                el.innerHTML += `<div style="color: var(--tulweb-text-secondary)">> Pane resized to ${rect.width.toFixed(0)}x${rect.height.toFixed(0)}</div>`;
                el.scrollTop = el.scrollHeight;
            });
            container.on('init', () => {
                el.innerHTML += `<div style="color: var(--tulweb-text-primary)">> Component Lifecycle: init() fired</div>`;
                el.scrollTop = el.scrollHeight;
            });

            // Expose a global logger so other parts can log to the terminal
            window.tulWebLogger = (msg, color = 'var(--tulweb-text-secondary)') => {
                el.innerHTML += `<div style="color: ${color}">> ${msg}</div>`;
                el.scrollTop = el.scrollHeight;
            };
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
        el.style.padding = "20px";
        el.style.color = "var(--tulweb-text-secondary)";

        const content = document.createElement("div");
        content.innerHTML = `<h3 style="color:var(--tulweb-text-primary); margin-top:0;">${state.name || 'Panel'}</h3><p>Use the toolbar to drag new components into the layout.</p>`;
        el.appendChild(content);

        const dimensionsEl = document.createElement("div");
        dimensionsEl.style.marginTop = "15px";
        dimensionsEl.style.marginBottom = "15px";
        dimensionsEl.style.fontFamily = "monospace";
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

    // Pre-defined Layout Configurations
    window.tulwebLayouts = {
        ide: {
            content: [{
                type: 'row',
                content: [
                    {
                        type: 'stack',
                        size: 20,
                        tabPosition: 'left',
                        content: [
                            {
                                type: 'component',
                                componentName: 'generic',
                                title: 'Project Tree',
                                componentState: { name: 'Workspace' }
                            }
                        ]
                    },
                    {
                        type: 'column',
                        size: 60,
                        content: [
                            {
                                type: 'stack',
                                size: 70,
                                content: [
                                    { type: 'component', componentName: 'editor', title: 'main.js', componentState: { text: "console.log('IDE Mode');" } },
                                    { type: 'component', componentName: 'editor', title: 'index.html' }
                                ]
                            },
                            {
                                type: 'stack',
                                size: 30,
                                tabPosition: 'bottom',
                                content: [{ type: 'component', componentName: 'console', title: 'Terminal' }]
                            }
                        ]
                    },
                    {
                        type: 'stack',
                        size: 20,
                        tabPosition: 'right',
                        content: [
                            {
                                type: 'component',
                                componentName: 'generic',
                                title: 'Assistant',
                                componentState: { name: 'Assistant' }
                            }
                        ]
                    },
                ]
            }]
        },
        dashboard: {
            content: [{
                type: 'column',
                content: [
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
            }]
        },
        grid: {
            content: [{
                type: 'row',
                content: [
                    {
                        type: 'column', size: 33.33,
                        content: [
                            { type: 'stack', size: 50, content: [{ type: 'component', componentName: 'generic', title: 'Panel 1' }] },
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
            }]
        }
    };

    // 1. Initialize Layout Manager
    const containerWrapper = document.getElementById("layout-container");
    const layout = new TulWEB.LayoutManager(null, containerWrapper);

    // Make layout globally accessible for the demo buttons
    window.layout = layout;

    // Listen to Global Events (Phase 3 Developer API)
    layout.on('stateChanged', () => {
        if (window.tulWebLogger) window.tulWebLogger('Event: stateChanged (Structural layout updated)', '#8be9fd');
    });
    layout.on('componentCreated', (comp) => {
        if (window.tulWebLogger) window.tulWebLogger(`Event: componentCreated (id: ${comp.id})`, '#50fa7b');

        const getName = () => comp.config.title || comp.config.componentName || 'Component';
        comp.on('active', () => layout.showToast(`${getName()} Active`));
        comp.on('inactive', () => layout.showToast(`${getName()} Inactive`));
        comp.on('focus', () => layout.showToast(`${getName()} Focused`));
        comp.on('defocus', () => layout.showToast(`${getName()} Unfocused`));
        comp.on('move', () => layout.showToast(`${getName()} Moved`, 'info'));
        comp.on('resize', () => console.log(`${getName()} Resized`));
    });

    // 2. Register Components
    layout.registerComponent('editor', TextEditorFactory);
    layout.registerComponent('console', ConsoleFactory);
    layout.registerComponent('generic', GenericPanelFactory);
    layout.registerComponent('datagrid', DataGridFactory);
    layout.registerComponent('image', ImageViewerFactory);

    // 3. Load Initial Layout
    layout.loadLayout(window.tulwebLayouts.ide);

    // 4. Setup Toolbar Drag Sources & Actions
    const dragItems = document.querySelectorAll('.sidebar-item');
    dragItems.forEach(item => {
        const type = item.getAttribute('data-type');
        let config;
        if (type === 'editor') config = { type: 'component', componentName: 'editor', title: 'Code Editor', componentState: {} };
        else if (type === 'console') config = { type: 'component', componentName: 'console', title: 'Terminal Console', componentState: {} };
        else if (type === 'datagrid') config = { type: 'component', componentName: 'datagrid', title: 'Data Grid', componentState: {} };
        else if (type === 'image') config = { type: 'component', componentName: 'image', title: 'Image Viewer', componentState: {} };
        else config = { type: 'component', componentName: 'generic', title: 'Generic Panel', componentState: { name: 'New Panel' } };

        layout.createDragSource(item, config);
    });

    // Action Buttons
    document.getElementById("btn-save").addEventListener("click", () => {
        const config = layout.toConfig();
        localStorage.setItem('tulweb_saved_state', JSON.stringify(config));
        layout.showToast("Layout saved to workspace");
    });

    document.getElementById("btn-load").addEventListener("click", () => {
        const saved = localStorage.getItem('tulweb_saved_state');
        if (saved) {
            layout.loadLayout(JSON.parse(saved));
            layout.showToast("Layout loaded successfully");
        } else {
            layout.showToast("No saved layout found", "error");
        }
    });

    document.getElementById("btn-reset").addEventListener("click", () => {
        layout.loadLayout(window.tulwebLayouts.ide);
        layout.showToast("Layout reset to IDE Default");
    });

    // Layout Presets
    const btnIde = document.getElementById("btn-layout-ide");
    const btnDash = document.getElementById("btn-layout-dash");
    const btnGrid = document.getElementById("btn-layout-grid");

    if (btnIde) btnIde.addEventListener("click", () => layout.loadLayout(window.tulwebLayouts.ide));
    if (btnDash) btnDash.addEventListener("click", () => layout.loadLayout(window.tulwebLayouts.dashboard));
    if (btnGrid) btnGrid.addEventListener("click", () => layout.loadLayout(window.tulwebLayouts.grid));

    // API Actions
    const btnAddTab = document.getElementById("btn-add-tab");
    if (btnAddTab) {
        btnAddTab.addEventListener("click", () => {
            if (layout.activeStack) {
                const newComp = layout._buildObjectTree({
                    type: 'component', componentName: 'generic', title: 'New API Tab', componentState: { name: 'API Generated' }
                });
                layout.activeStack.addChild(newComp);
                layout.showToast("Tab added to active stack");
            } else {
                layout.showToast("Click a tab stack to focus it first", "error");
            }
        });
    }

    // Switch Theme Dynamically
    const themeSelector = document.getElementById("theme-selector");
    if (themeSelector) {
        const checkedRadio = themeSelector.querySelector('input[name="theme"]:checked');
        if (checkedRadio) document.body.className = checkedRadio.value;

        const updateTheme = (e) => {
            if (e.target.name === 'theme') {
                document.body.className = e.target.value;
            }
        };

        themeSelector.addEventListener("change", updateTheme);
    }

});
