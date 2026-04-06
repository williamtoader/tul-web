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
      textArea.style.background = "var(--tulwm-bg-editor)";
      textArea.style.color = "var(--tulwm-text-editor)";
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
      el.style.background = "var(--tulwm-bg-console)";
      el.style.color = "var(--tulwm-text-console)";
      el.style.fontFamily = "monospace";
      el.style.padding = "16px";
      el.style.overflowY = "auto";
      
      const lines = [
          "TulWM v2.0 initialized.",
          "Loading modules...",
          "[OK] Layout Manager Events",
          "[OK] Drag & Drop System",
          "System ready. Listening for resize."
      ];
      
      el.innerHTML = lines.map(l => `<div>> ${l}</div>`).join("");
      
      if (container) {
          container.on('resize', () => {
               const rect = el.getBoundingClientRect();
               el.innerHTML += `<div style="color: var(--tulwm-text-secondary)">> Pane resized to ${rect.width.toFixed(0)}x${rect.height.toFixed(0)}</div>`;
               el.scrollTop = el.scrollHeight;
          });
          container.on('init', () => {
               el.innerHTML += `<div style="color: var(--tulwm-text-primary)">> Component Lifecycle: init() fired</div>`;
               el.scrollTop = el.scrollHeight;
          });
      }
      
      return el;
  }

  function GenericPanelFactory(state = {}, container = null) {
       const el = document.createElement("div");
       el.style.padding = "20px";
       el.style.color = "var(--tulwm-text-secondary)";
       el.innerHTML = `<h3 style="color:var(--tulwm-text-primary); margin-top:0;">${state.name || 'Panel'}</h3><p>Use the toolbar to drag new components into the layout.</p>`;
       if (container) {
           el.innerHTML += `<button id="btn-close-self" style="background:var(--tulwm-bg-tab); color:var(--tulwm-text-primary); border:1px solid var(--tulwm-border); padding:8px 12px; border-radius:var(--tulwm-radius-inner); cursor:pointer;">Programmatic Close</button>`;
           container.on('init', () => {
               const btn = el.querySelector('#btn-close-self');
               if (btn) btn.addEventListener('click', () => {
                    container.destroy();
               });
           });
       }
       return el;
  }

  // Initial Config
  const layoutConfig = {
      content: [{
          type: 'row',
          content: [
              {
                  type: 'stack',
                  size: 30,
                  content: [
                      {
                          type: 'component',
                          componentName: 'generic',
                          title: 'Settings',
                          componentState: { name: 'Configuration' }
                      }
                  ]
              },
              {
                  type: 'column',
                  size: 70,
                  content: [
                      {
                          type: 'stack',
                          size: 70,
                          content: [
                              {
                                  type: 'component',
                                  componentName: 'editor',
                                  title: 'main.js',
                                  componentState: { text: "import { App } from './app';\n\nApp.init();" }
                              },
                              {
                                  type: 'component',
                                  componentName: 'editor',
                                  title: 'index.html',
                                  componentState: { text: "<!DOCTYPE html>\n<html>\n<body>\n</body>\n</html>" }
                              }
                          ]
                      },
                      {
                          type: 'stack',
                          size: 30,
                          content: [
                              {
                                  type: 'component',
                                  componentName: 'console',
                                  title: 'Terminal'
                              }
                          ]
                      }
                  ]
              }
          ]
      }]
  };

  // 1. Initialize Layout Manager
  const containerWrapper = document.getElementById("layout-container");
  const layout = new TulWM.LayoutManager(null, containerWrapper);
  
  // Listen to Global Events (Phase 3 Developer API)
  layout.on('stateChanged', () => {
      console.log('Layout State Changed. New structural configuration available.');
  });
  layout.on('componentCreated', (comp) => {
      console.log(`New layout component instantiated: ${comp.id}`);
  });

  // 2. Register Components
  layout.registerComponent('editor', TextEditorFactory);
  layout.registerComponent('console', ConsoleFactory);
  layout.registerComponent('generic', GenericPanelFactory);

  // 3. Load Layout
  layout.loadLayout(layoutConfig);

  // 4. Setup Toolbar Drag Sources & Actions
  const dragItems = document.querySelectorAll('.sidebar-item');
  dragItems.forEach(item => {
       const type = item.getAttribute('data-type');
       let config;
       if (type === 'editor') config = { type: 'component', componentName: 'editor', title: 'Code Editor', componentState: {} };
       else if (type === 'console') config = { type: 'component', componentName: 'console', title: 'Terminal Console', componentState: {} };
       else config = { type: 'component', componentName: 'generic', title: 'Generic Panel', componentState: { name: 'New Panel' } };

       layout.createDragSource(item, config);
  });

  // Action Buttons
  document.getElementById("btn-save").addEventListener("click", () => {
      const config = layout.toConfig();
      localStorage.setItem('tulwm_saved_state', JSON.stringify(config));
      layout.showToast("Layout saved to workspace");
  });

  document.getElementById("btn-load").addEventListener("click", () => {
      const saved = localStorage.getItem('tulwm_saved_state');
      if (saved) {
          layout.loadLayout(JSON.parse(saved));
          layout.showToast("Layout loaded successfully");
      } else {
          layout.showToast("No saved layout found", "error");
      }
  });

  document.getElementById("btn-reset").addEventListener("click", () => {
      layout.loadLayout(layoutConfig);
      layout.showToast("Layout reset to default");
  });

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
