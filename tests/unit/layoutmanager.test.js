import { LayoutManager } from '../../tulweb.js';

describe('LayoutManager', () => {
    let container;

    beforeEach(() => {
        container = document.createElement('div');
        container.id = 'layout-container';
        document.body.appendChild(container);
    });

    afterEach(() => {
        document.body.innerHTML = '';
        jest.restoreAllMocks();
    });

    test('initializes with a container', () => {
        const layout = new LayoutManager(null, container);
        expect(layout.container).toBe(container);
        expect(container.querySelector('.tulweb-root')).not.toBeNull();
    });

    test('registers components correctly', () => {
        const layout = new LayoutManager(null, container);
        const factory = () => document.createElement('div');
        layout.registerComponent('test', factory);
        expect(layout.componentFactories['test']).toBe(factory);
    });

    test('emits events', () => {
        const layout = new LayoutManager(null, container);
        const spy = jest.fn();
        layout.on('test-event', spy);
        layout.emit('test-event', 'payload');
        expect(spy).toHaveBeenCalledWith('payload');
    });

    test('once() listener fires only once', () => {
        const layout = new LayoutManager(null, container);
        const spy = jest.fn();
        layout.once('test-event', spy);
        layout.emit('test-event');
        layout.emit('test-event');
        expect(spy).toHaveBeenCalledTimes(1);
    });

    test('loads a simple layout', () => {
        const config = {
            content: [{
                type: 'stack',
                content: []
            }]
        };
        const layout = new LayoutManager(config, container);
        expect(layout.root).not.toBeNull();
        expect(layout.root.type).toBe('stack');
    });

    test('toConfig() returns valid structure', () => {
        const layout = new LayoutManager(null, container);
        const config = layout.toConfig();
        expect(config).toHaveProperty('settings');
        expect(config).toHaveProperty('content');
    });
});
