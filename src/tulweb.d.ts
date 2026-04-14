export class EventEmitter {
    on(event: string, callback: (...args: any[]) => void): void;
    off(event: string, callback: (...args: any[]) => void): void;
    once(event: string, callback: (...args: any[]) => void): void;
    emit(event: string, ...args: any[]): boolean;
}

export type LayoutItemType = 'row' | 'column' | 'stack' | 'component';

export interface ItemConfig {
    type: LayoutItemType;
    id?: string;
    size?: number | string;
    minWidth?: number | string;
    minHeight?: number | string;
    content?: ItemConfig[];
    title?: string;
    componentName?: string;
    componentState?: any;
    closeable?: boolean;
    tabPosition?: 'top' | 'bottom' | 'left' | 'right' | 'headless';
    minimized?: boolean;
    isMaximized?: boolean;
    displayMinimizeButton?: boolean;
    displayMaximizeButton?: boolean;
    displayCloseButton?: boolean;
    displayPopoutButton?: boolean;
    preventEmptyClosure?: boolean;
}

export interface LayoutConfig {
    settings?: {
        onlyResizeActiveTabs?: boolean;
        enableMinimize?: boolean;
        enablePreview?: boolean;
        enablePopout?: boolean;
        hasHeaders?: boolean;
    };
    content: ItemConfig[];
}

export class ContentItem extends EventEmitter {
    config: ItemConfig;
    layoutManager: LayoutManager;
    parent: ContentItem | null;
    children: ContentItem[];
    element: HTMLElement | null;
    size: number | string | null;
    minWidth: number | string;
    minHeight: number | string;
    id: string;

    constructor(config: ItemConfig, layoutManager: LayoutManager);
    addChild(child: ContentItem, index?: number, skipLayout?: boolean): void;
    removeChild(child: ContentItem): boolean;
    replaceChild(oldChild: ContentItem, newChild: ContentItem, index: number): void;
    detachChild(child: ContentItem): boolean;
    updateLayout(): void;
    updateFlex(): void;
    getMinWidthPx(): number;
    getMinHeightPx(): number;
    destroy(): boolean;
    toConfig(): ItemConfig;
}

export class ComponentItem extends ContentItem {
    type: 'component';
    isCloseable: boolean;
    instance: any;
    constructor(config: ItemConfig, layoutManager: LayoutManager);
    renderAppContent(): void;
    setState(state: any): void;
    getState(): any;
}

export class StackItem extends ContentItem {
    type: 'stack';
    activeChildIndex: number;
    isMinimized: boolean;
    isMaximized: boolean;
    tabPosition: 'top' | 'bottom' | 'left' | 'right' | 'headless';

    constructor(config: ItemConfig, layoutManager: LayoutManager);
    setActive(index: number): void;
    toggleMinimize(): void;
    toggleMaximize(): void;
    closeAll(): void;
}

export class ContainerItem extends ContentItem {
    constructor(config: ItemConfig, layoutManager: LayoutManager);
}

export class RowItem extends ContainerItem {}
export class ColumnItem extends ContainerItem {}

export class DragSource {
    constructor(element: HTMLElement, itemConfig: ItemConfig, layoutManager: LayoutManager);
}

export class PopoutManager {
    count: number;
    constructor(layoutManager: LayoutManager);
    popout(stack: StackItem): string | null;
    closePopout(popoutId: string): void;
    closeAll(): void;
    broadcastThemeChange(bodyClass: string): void;
    destroy(): void;
}

export class LayoutManager extends EventEmitter {
    container: HTMLElement;
    root: ContentItem | null;
    rootElement: HTMLElement;
    settings: {
        onlyResizeActiveTabs: boolean;
        enableMinimize: boolean;
        enablePreview: boolean;
        enablePopout: boolean;
    };

    constructor(config: LayoutConfig, container: HTMLElement, options?: any);
    registerComponent(name: string, factoryMethod: (state: any, container: ComponentItem) => any): void;
    createDragSource(element: HTMLElement, itemConfig: ItemConfig): DragSource;
    loadLayout(config: LayoutConfig): void;
    updateLayout(): void;
    toConfig(): LayoutConfig;
    setActiveStack(stack: StackItem | null): void;
    getComponentById(id: string): ComponentItem | null;
    getStackById(id: string): StackItem | null;
    getItemById(id: string): ContentItem | null;
    getAllStacks(): StackItem[];
    addComponent(stackId: string | null, config: ItemConfig): ComponentItem;
    removeComponent(id: string): boolean;
    popoutStack(stack: StackItem): string | null;
    closeAllPopouts(): void;
    closePopout(popoutId: string): void;
    broadcastThemeToPopouts(bodyClass: string): void;
    showToast(message: string, type?: 'info' | 'success' | 'warning' | 'error'): void;
    destroy(): void;
}

export const utils: {
    createElement(tag: string, className?: string, parent?: HTMLElement): HTMLElement;
    generateId(): string;
    getRelativePos(evt: MouseEvent | TouchEvent, elem: HTMLElement): any;
    parseSize(size: number | string): { value: number, unit: string };
    resolveToPixels(size: number | string, totalPixels: number): number;
};
