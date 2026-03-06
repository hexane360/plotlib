
export default class EventListener {
    private elemListeners: Map<Element, Array<[string, (this: Element, ev: any) => void, boolean | undefined | AddEventListenerOptions]>> = new Map();
    private docListeners: Array<[keyof DocumentEventMap, (this: Document, ev: any) => void, boolean | undefined | AddEventListenerOptions]> = [];
    private winListeners: Array<[keyof WindowEventMap, (this: Window, ev: any) => void, boolean | undefined | AddEventListenerOptions]> = [];

    // TODO easier way to do this
    addEventListener<K extends keyof HTMLElementEventMap>(
        elem: HTMLElement, type: K,
        listener: (this: Element, ev: HTMLElementEventMap[K]) => void,
        options?: boolean | AddEventListenerOptions,
    ): void;
    addEventListener<K extends keyof SVGElementEventMap>(
        elem: SVGElement, type: K,
        listener: (this: Element, ev: SVGElementEventMap[K]) => void,
        options?: boolean | AddEventListenerOptions,
    ): void;
    addEventListener<K extends keyof (HTMLElementEventMap & SVGElementEventMap)>(
        elem: HTMLElement | SVGElement, type: K,
        listener: (this: Element, ev: SVGElementEventMap[K]) => void,
        options?: boolean | AddEventListenerOptions,
    ): void;
    addEventListener<K extends keyof ElementEventMap>(
        elem: Element, type: K,
        listener: (this: Element, ev: ElementEventMap[K]) => void,
        options?: boolean | AddEventListenerOptions,
    ) {
        elem.addEventListener(type, listener, options);

        let arr = this.elemListeners.get(elem);
        if (!arr) {
            this.elemListeners.set(elem, [[type, listener, options]]);
        } else {
            arr.push([type, listener, options]);
        }
    }

    removeElementListeners(elem: Element) {
        let arr = this.elemListeners.get(elem);
        if (arr) {
            for (const [type, listener, options] of arr) {
                elem.removeEventListener(type, listener, options);
            }
            this.elemListeners.set(elem, []);
        }
    }

    addDocumentListener<K extends keyof DocumentEventMap>(
        type: K, listener: (this: Document, ev: DocumentEventMap[K]) => void,
        options?: boolean | AddEventListenerOptions,
    ) {
        document.addEventListener(type, listener, options);
        this.docListeners.push([type, listener, options]);
    }

    removeDocumentListeners() {
        for (const [type, listener, options] of this.docListeners) {
            document.removeEventListener(type, listener, options);
        }
        this.docListeners = [];
    }

    addWindowListener<K extends keyof WindowEventMap>(
        type: K, listener: (this: Window, ev: WindowEventMap[K]) => void,
        options?: boolean | AddEventListenerOptions,
    ) {
        window.addEventListener(type, listener, options);
        this.winListeners.push([type, listener, options]);
    }

    removeWindowListeners() {
        for (const [type, listener, options] of this.winListeners) {
            window.removeEventListener(type, listener, options);
        }
        this.winListeners = [];
    }
}