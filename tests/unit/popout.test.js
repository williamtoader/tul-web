import { LayoutManager, StackItem } from '../../src/tulweb.js';

describe('PopoutManager Unit Tests', () => {
    let container;
    let layout;

    beforeAll(() => {
        // Mock BroadcastChannel for JSDOM
        global.BroadcastChannel = class {
            constructor(name) {
                this.name = name;
                this.onmessage = null;
            }
            postMessage() {}
            close() {}
        };
        
        // Mock window.open
        window.open = jest.fn().mockReturnValue({
            document: {
                open: jest.fn(),
                write: jest.fn(),
                close: jest.fn()
            },
            closed: false,
            focus: jest.fn(),
            close: jest.fn(),
            location: { href: 'about:blank' }
        });
    });

    beforeEach(() => {
        container = document.createElement('div');
        layout = new LayoutManager(null, container, { enablePopout: true });
    });

    afterEach(() => {
        if (layout) layout.destroy();
        container.innerHTML = '';
        jest.restoreAllMocks();
    });

    test('LayoutManager has PopoutManager initialized when enabled', () => {
        expect(layout.popoutManager).toBeDefined();
        expect(layout.settings.enablePopout).toBe(true);
    });

    test('popout(stack) successfully tracking location and removing from DOM', () => {
        layout.loadLayout({
            content: [{
                type: 'row',
                id: 'test-row',
                content: [
                    { type: 'stack', id: 'item-1', content: [{ type: 'component', title: 'T1' }] },
                    { type: 'stack', id: 'target-item', content: [{ type: 'component', title: 'T2' }] }
                ]
            }]
        });

        const target = layout.getStackById('target-item');
        const popoutId = layout.popoutStack(target);

        expect(popoutId).toBeDefined();
        expect(layout.getStackById('target-item')).toBeNull();
        
        const entry = layout.popoutManager.openPopouts.get(popoutId);
        expect(entry).toBeDefined();
        expect(entry.location.parentId).toBe('test-row');
        expect(entry.location.index).toBe(1);
    });

    test('re-integration restores stack to the exact same position', () => {
        layout.loadLayout({
            content: [{
                type: 'row',
                id: 'parent-row',
                content: [
                    { type: 'stack', id: 'stay-1', content: [{ type: 'component', title: 'S1' }] },
                    { type: 'stack', id: 'pop-me', content: [{ type: 'component', title: 'P1' }] },
                    { type: 'stack', id: 'stay-2', content: [{ type: 'component', title: 'S2' }] }
                ]
            }]
        });

        const target = layout.getStackById('pop-me');
        const popoutId = layout.popoutStack(target);
        
        const entry = layout.popoutManager.openPopouts.get(popoutId);
        
        // Manually trigger the "closed" handler logic
        layout.popoutManager._handlePopoutClosed(popoutId, entry.stackConfig);
        
        const restored = layout.getStackById('pop-me');
        expect(restored).not.toBeNull();
        
        const row = layout.getItemById('parent-row');
        expect(row.children.indexOf(restored)).toBe(1);
        expect(row.children[0].id).toBe('stay-1');
        expect(row.children[2].id).toBe('stay-2');
    });

    test('falls back to root if parent is no longer available', () => {
        layout.loadLayout({
            content: [{
                type: 'stack', id: 'only-stack', content: [{ type: 'component', title: 'Only' }] }
            ]
        });

        const target = layout.getStackById('only-stack');
        const popoutId = layout.popoutStack(target);
        
        const entry = layout.popoutManager.openPopouts.get(popoutId);
        
        // Layout is now empty
        expect(layout.root).toBeNull();
        
        layout.popoutManager._handlePopoutClosed(popoutId, entry.stackConfig);
        
        expect(layout.root).not.toBeNull();
        expect(layout.getStackById('only-stack')).not.toBeNull();
    });
});
