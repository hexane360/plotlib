import React from "react";

import { InteractionContext, InteractionMode } from "./context"
import { FigureContext, FigureContextData, SpatialScaleEntry } from "../context";
import { atom, PrimitiveAtom, useStore } from "jotai";
import EventListener from "./EventListener";

type Store = ReturnType<typeof useStore>;

export interface InteractionManagerProps {
    ref: React.RefObject<SVGSVGElement>
    children?: React.ReactNode
}

export function InteractionManager({ref, children}: InteractionManagerProps) {
    const figure = React.useContext(FigureContext);
    const store = useStore();
    if (!figure) throw new Error("InteractionManager must be called from within a FigureContext");
    const manager = React.useRef<Manager>(null);
    if (!manager.current) {
        manager.current = new Manager(store, figure);
    }
    manager.current!.figure = figure;

    React.useEffect(() => {
        manager.current!.mount(ref.current);
        return () => { manager.current?.unmount(); };
    }, [ref]);

    const context = React.useMemo(() => ({
        add_plot: (elem: SVGGraphicsElement, xaxis: SpatialScaleEntry, yaxis: SpatialScaleEntry) => manager.current!.add_plot(elem, xaxis, yaxis),
        remove_plot: (elem: SVGGraphicsElement) => manager.current!.remove_plot(elem),
        mode: manager.current!.mode,
    }), []);
    return <InteractionContext.Provider value={context}>{children}</InteractionContext.Provider>;
}

class Manager {
    readonly store: Store
    figure: FigureContextData
    svg_elem?: SVGSVGElement
    plots: Map<SVGGraphicsElement, PlotManager>;
    readonly listener: EventListener;
    readonly mode: PrimitiveAtom<InteractionMode>;

    constructor(store: Store, figure: FigureContextData) {
        this.store = store;
        this.figure = figure;
        this.plots = new Map();
        this.listener = new EventListener();
        this.mode = atom<InteractionMode>('pan');
    }

    mount(elem: SVGSVGElement) {
        if (this.svg_elem) this.unmount();
        this.svg_elem = elem;
    }

    unmount() {
        this.svg_elem = undefined;
    }

    add_plot(elem: SVGGraphicsElement, xaxis: SpatialScaleEntry, yaxis: SpatialScaleEntry) {
        this.plots.set(elem, new PlotManager(this, elem, xaxis, yaxis));
    }

    remove_plot(elem: SVGGraphicsElement) {
        this.plots.delete(elem);
        this.listener.removeElementListeners(elem);
    }
}

class PlotManager {
    readonly manager: Manager
    readonly elem: SVGGraphicsElement
    readonly xaxis: SpatialScaleEntry;
    readonly yaxis: SpatialScaleEntry;

    constructor(manager: Manager, elem: SVGGraphicsElement, xaxis: SpatialScaleEntry, yaxis: SpatialScaleEntry) {
        this.manager = manager;
        this.elem = elem;
        this.xaxis = xaxis;
        this.yaxis = yaxis;
    }
}