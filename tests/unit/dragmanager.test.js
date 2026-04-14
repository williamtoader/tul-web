import { LayoutManager, DragManager } from '../../src/tulweb.js';

describe('DragManager Unit Tests', () => {
    let container;
    let layout;
    let dragManager;

    beforeEach(() => {
        container = document.createElement('div');
        layout = new LayoutManager(null, container);
        dragManager = layout.dragManager;
    });

    afterEach(() => {
        layout.destroy();
        container.innerHTML = '';
        jest.restoreAllMocks();
    });

    test('is initialized with main document', () => {
        expect(dragManager._dragDoc).toBe(document);
        expect(dragManager.isDragging).toBe(false);
        expect(dragManager.isPendingDrag).toBe(false);
    });

    test('pendDrag tracks the correct document from event target', () => {
        const mockDoc = {
            addEventListener: jest.fn(),
            removeEventListener: jest.fn()
        };
        const mockTarget = { ownerDocument: mockDoc };
        const mockEvent = { 
            target: mockTarget,
            clientX: 100,
            clientY: 100
        };

        dragManager.pendDrag(mockEvent, {}, 'tab', null, 'Test');

        expect(dragManager._dragDoc).toBe(mockDoc);
        expect(dragManager.isPendingDrag).toBe(true);
        expect(mockDoc.addEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function));
        expect(mockDoc.addEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function));
    });

    test('cancelDrag resets state and removes listeners', () => {
        const mockDoc = {
            addEventListener: jest.fn(),
            removeEventListener: jest.fn()
        };
        const mockTarget = { ownerDocument: mockDoc };
        const mockEvent = { target: mockTarget, clientX: 10, clientY: 10 };

        // Start a pending drag
        dragManager.pendDrag(mockEvent, {}, 'tab', null, 'Test');
        expect(dragManager.isPendingDrag).toBe(true);

        // Cancel it
        dragManager.cancelDrag();

        expect(dragManager.isPendingDrag).toBe(false);
        expect(mockDoc.removeEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function));
        expect(mockDoc.removeEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function));
    });

    test('findDropZone uses elementFromPoint on the correct document', () => {
        const mockDoc = {
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            elementFromPoint: jest.fn().mockReturnValue(null),
            body: document.createElement('body')
        };
        const mockTarget = { ownerDocument: mockDoc };
        const mockEvent = { target: mockTarget, clientX: 50, clientY: 50 };

        dragManager.pendDrag(mockEvent, {}, 'tab', null, 'Test');
        
        // Mock a move that triggers startDrag
        const moveEvent = { clientX: 100, clientY: 100 };
        dragManager.handlePendingMove(moveEvent);
        
        expect(dragManager.isDragging).toBe(true);
        
        // Find drop zone
        dragManager.findDropZone(moveEvent);
        expect(mockDoc.elementFromPoint).toHaveBeenCalled();
    });

    test('proxy is created in the correct document body', () => {
        const mockBody = document.createElement('div');
        const mockDoc = {
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            body: mockBody,
            createElement: (tag) => document.createElement(tag)
        };
        const mockTarget = { ownerDocument: mockDoc };
        const mockEvent = { target: mockTarget, clientX: 10, clientY: 10 };

        dragManager.pendDrag(mockEvent, {}, 'tab', null, 'Test');
        dragManager.startDrag(mockEvent, {}, 'tab', null, 'Test');

        expect(dragManager.proxy.parentElement).toBe(mockBody);
    });
});
