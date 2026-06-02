import React from "react";
import { createPortal } from "react-dom";

import { InteractionContext, InteractionMode } from "./context";
import { FigureContext, FigureContextData, SpatialScaleEntry, ContinuousScaleEntry } from "../context";
import { atom, PrimitiveAtom, useStore } from "jotai";
import EventListener from "./EventListener";
import { PlotManager } from "./PlotManager";
import { Transform1D, Transform2D } from "../transform";
import { ContinuousScale } from "../scale";
import { clamp } from "../utils";
import { getEventCoords, isClose, Pair } from "./utils";
import { InteractionBar, InteractionBarStylesNames } from "./InteractionBar";
import { CompoundStylesProps } from "../theme";

type Store = ReturnType<typeof useStore>;

type DragState =
    | { kind: 'idle' }
    | { kind: 'pan'; plot: PlotManager; origin: Pair; start_transform: Transform2D }
    | { kind: 'box-zoom'; plot: PlotManager; start: Pair; current: Pair };

export interface InteractionManagerProps {
    children?: React.ReactNode
    toolbar?: boolean
    containerRef?: React.RefObject<HTMLDivElement | null>
    toolbarStyles?: CompoundStylesProps<InteractionBarStylesNames>
}

export function InteractionManager({ children, toolbar, containerRef, toolbarStyles }: InteractionManagerProps) {
    const figure = React.useContext(FigureContext);
    const store = useStore();
    if (!figure) throw new Error("InteractionManager must be called from within a FigureContext");
    const managerRef = React.useRef<Manager>(null);
    if (!managerRef.current) {
        managerRef.current = new Manager(store, figure);
    }
    managerRef.current.figure = figure;

    React.useEffect(() => {
        const m = managerRef.current!;
        return () => { m.destroy(); };
    }, []);

    const [mounted, setMounted] = React.useState(false);
    React.useLayoutEffect(() => { setMounted(true); }, []);

    const context = React.useMemo(() => ({
        add_plot: (elem: SVGGraphicsElement, xaxis: SpatialScaleEntry, yaxis: SpatialScaleEntry, fixed_aspect: boolean) =>
            managerRef.current!.add_plot(elem, xaxis, yaxis, fixed_aspect),
        remove_plot: (elem: SVGGraphicsElement) => managerRef.current!.remove_plot(elem),
        mode: managerRef.current!.mode,
        zoom_in: () => managerRef.current!.zoom_in_all(),
        zoom_out: () => managerRef.current!.zoom_out_all(),
        reset_zoom: () => managerRef.current!.reset_zoom_all(),
    }), []);

    const portalTarget = mounted ? containerRef?.current : null;

    return <InteractionContext.Provider value={context}>
        {children}
        {(toolbar ?? true) && portalTarget && createPortal(<InteractionBar {...toolbarStyles} />, portalTarget)}
    </InteractionContext.Provider>;
}

export class Manager {
    readonly store: Store;
    figure: FigureContextData;
    readonly plots: Map<SVGGraphicsElement, PlotManager>;
    readonly doc_listener: EventListener;
    readonly mode: PrimitiveAtom<InteractionMode>;
    drag: DragState = { kind: 'idle' };

    constructor(store: Store, figure: FigureContextData) {
        this.store = store;
        this.figure = figure;
        this.plots = new Map();
        this.doc_listener = new EventListener();
        this.mode = atom<InteractionMode>('pan');
    }

    destroy(): void {
        for (const plot of this.plots.values()) plot.destroy();
        this.plots.clear();
        this.doc_listener.removeDocumentListeners();
    }

    add_plot(elem: SVGGraphicsElement, xaxis: SpatialScaleEntry, yaxis: SpatialScaleEntry, fixed_aspect: boolean): void {
        const plot = new PlotManager(this, elem, xaxis, yaxis, fixed_aspect);
        this.plots.set(elem, plot);
        if (fixed_aspect) {
            plot.apply_transform(this.constrain_aspect(plot, this.current_transform(plot)));
        }
    }

    remove_plot(elem: SVGGraphicsElement): void {
        const plot = this.plots.get(elem);
        if (plot) {
            plot.destroy();
            this.plots.delete(elem);
        }
    }

    drag_start(plot: PlotManager, event: MouseEvent): void {
        if (event.button !== 0) return;
        const coords = getEventCoords(plot.elem, event) as Pair;
        if (this.store.get(this.mode) === 'pan') {
            const start_transform = this.current_transform(plot);
            const origin = start_transform.unapply(coords) as Pair;
            this.drag = { kind: 'pan', plot, origin, start_transform };
        } else {
            this.drag = { kind: 'box-zoom', plot, start: coords, current: coords };
        }
        this.doc_listener.addDocumentListener("mousemove", (ev) => this.drag_move(ev));
        this.doc_listener.addDocumentListener("mouseup", (ev) => this.drag_end(ev));
        event.stopPropagation();
        event.preventDefault();
    }

    private drag_move(event: MouseEvent): void {
        if (this.drag.kind === 'pan') {
            const { plot, origin, start_transform } = this.drag;
            const current = start_transform.unapply(getEventCoords(plot.elem, event)) as Pair;
            const delta: Pair = [current[0] - origin[0], current[1] - origin[1]];
            plot.apply_transform(this.constrain(plot, start_transform.translate(delta[0], delta[1])));
        } else if (this.drag.kind === 'box-zoom') {
            const { plot, start } = this.drag;
            const current = getEventCoords(plot.elem, event) as Pair;
            this.drag = { kind: 'box-zoom', plot, start, current };
            plot.show_decoration(start, current);
        }
        event.stopPropagation();
        event.preventDefault();
    }

    private drag_end(event: MouseEvent): void {
        if (this.drag.kind === 'box-zoom') {
            const { plot, start, current } = this.drag;
            plot.hide_decoration();
            this.apply_box_zoom(plot, start, current);
        }
        this.drag = { kind: 'idle' };
        this.doc_listener.removeDocumentListeners();
        event.stopPropagation();
        event.preventDefault();
    }

    private apply_box_zoom(plot: PlotManager, start: Pair, end: Pair): void {
        const xs = this.store.get(plot.xaxis.scale);
        const ys = this.store.get(plot.yaxis.scale);
        if (!xs.is_spatial() || !ys.is_spatial()) return;

        const [, W] = xs.range;
        const [, H] = ys.range;

        // Clamp to plot bounds — keeps zoom consistent with the displayed box
        // and ensures new_k >= old_k (box zoom can only zoom in, never out).
        const x1 = Math.max(0, Math.min(start[0], end[0]));
        const y1 = Math.max(0, Math.min(start[1], end[1]));
        const x2 = Math.min(W, Math.max(start[0], end[0]));
        const y2 = Math.min(H, Math.max(start[1], end[1]));
        if (x2 - x1 < 4 || y2 - y1 < 4) return;

        const xt = plot.xaxis.is_continuous() ? this.store.get(plot.xaxis.transform) : new Transform1D();
        const yt = plot.yaxis.is_continuous() ? this.store.get(plot.yaxis.transform) : new Transform1D();

        const new_xt = new Transform1D(xt.k * W / (x2 - x1), W * (xt.p - x1) / (x2 - x1));
        const new_yt = new Transform1D(yt.k * H / (y2 - y1), H * (yt.p - y1) / (y2 - y1));

        plot.apply_transform(this.constrain(plot, Transform2D.from_1d(new_xt, new_yt)));
    }

    wheel(plot: PlotManager, event: WheelEvent): void {
        const current = this.current_transform(plot);
        const [x, y] = getEventCoords(plot.elem, event);
        const k = Math.exp(-event.deltaY / 500.0);
        const x_zoom: readonly [number, number] = plot.xaxis.is_continuous() ? plot.xaxis.zoomExtent : [0, Infinity];
        const y_zoom: readonly [number, number] = plot.yaxis.is_continuous() ? plot.yaxis.zoomExtent : [0, Infinity];
        const totalK: Pair = [
            clamp(k * current.k[0], x_zoom),
            clamp(k * current.k[1], y_zoom),
        ];
        const [origx, origy] = current.unapply([x, y]);
        const proposed = new Transform2D(totalK, [-origx * totalK[0] + x, -origy * totalK[1] + y]);
        plot.apply_transform(this.constrain(plot, proposed));
        event.stopPropagation();
        event.preventDefault();
    }

    constrain(plot: PlotManager, t: Transform2D): Transform2D {
        if (plot.fixed_aspect) t = this.constrain_aspect(plot, t);

        const xs = this.store.get(plot.xaxis.scale);
        const ys = this.store.get(plot.yaxis.scale);
        if (!xs.is_spatial() || !ys.is_spatial()) return t;

        const current_extent = [t.invert().xlim(xs.range), t.invert().ylim(ys.range)];
        const x_extent = plot.xaxis.is_continuous()
            ? (xs as ContinuousScale).transform(plot.xaxis.translateExtent) as [number, number]
            : [-Infinity, Infinity] as [number, number];
        const y_extent = plot.yaxis.is_continuous()
            ? (ys as ContinuousScale).transform(plot.yaxis.translateExtent) as [number, number]
            : [-Infinity, Infinity] as [number, number];

        const x0 = current_extent[0][0] - x_extent[0];
        const x1 = current_extent[0][1] - x_extent[1];
        const y0 = current_extent[1][0] - y_extent[0];
        const y1 = current_extent[1][1] - y_extent[1];

        return t.pretranslate(
            x1 > x0 ? (x0 + x1) / 2.0 : Math.min(0, x0) + Math.max(0, x1),
            y1 > y0 ? (y0 + y1) / 2.0 : Math.min(0, y0) + Math.max(0, y1),
        );
    }

    constrain_aspect(plot: PlotManager, t: Transform2D, method: 'x' | 'y' | 'shrink' = 'shrink'): Transform2D {
        const xs = this.store.get(plot.xaxis.scale);
        const ys = this.store.get(plot.yaxis.scale);
        if (!xs.is_continuous() || !ys.is_continuous()) return t;
        const kx = Math.abs(xs.scale_factor() * t.k[0]);
        const ky = Math.abs(ys.scale_factor() * t.k[1]);
        if (isClose(kx, ky)) return t;
        const [c_x, c_y] = t.unapply([xs.range_from_unit(0.5), ys.range_from_unit(0.5)]);
        const scale: Pair =
            method === 'x' ? [ky / kx, 1.0] :
            method === 'y' ? [1.0, kx / ky] :
            [Math.min(1.0, ky / kx), Math.min(1.0, kx / ky)];
        return t.compose(new Transform2D(scale, [c_x * (1 - scale[0]), c_y * (1 - scale[1])]));
    }

    current_transform(plot: PlotManager): Transform2D {
        const xt = plot.xaxis.is_continuous() ? this.store.get(plot.xaxis.transform) : new Transform1D();
        const yt = plot.yaxis.is_continuous() ? this.store.get(plot.yaxis.transform) : new Transform1D();
        return Transform2D.from_1d(xt, yt);
    }

    private zoom_axis(entry: ContinuousScaleEntry, factor: number): void {
        const scale = this.store.get(entry.scale);
        const t = this.store.get(entry.transform);
        const center = scale.range_from_unit(0.5);
        const new_k = clamp(factor * t.k, entry.zoomExtent);
        const orig = t.unapply(center);
        this.store.set(entry.transform, new Transform1D(new_k, -orig * new_k + center));
    }

    zoom_in_all(): void {
        for (const entry of this.figure.scales.values()) {
            if (entry.is_continuous()) this.zoom_axis(entry, 2.0);
        }
    }

    zoom_out_all(): void {
        for (const entry of this.figure.scales.values()) {
            if (entry.is_continuous()) this.zoom_axis(entry, 0.5);
        }
    }

    reset_zoom_all(): void {
        for (const entry of this.figure.scales.values()) {
            if (entry.is_continuous()) {
                this.store.set(entry.transform, new Transform1D());
            }
        }
    }
}
