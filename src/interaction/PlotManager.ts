import type { Manager } from "./InteractionManager";
import { SpatialScaleEntry } from "../context";
import { Transform2D } from "../transform";
import EventListener from "./EventListener";
import { Pair, applyStyles } from "./utils";

export class PlotManager {
    readonly manager: Manager;
    readonly elem: SVGGraphicsElement;
    readonly xaxis: SpatialScaleEntry;
    readonly yaxis: SpatialScaleEntry;
    readonly fixed_aspect: boolean;

    private readonly listener: EventListener;
    private readonly unsubs: Array<() => void> = [];
    private deco_zoombox: SVGRectElement | null = null;
    private deco_zoombox_shade: SVGPathElement | null = null;

    constructor(
        manager: Manager,
        elem: SVGGraphicsElement,
        xaxis: SpatialScaleEntry,
        yaxis: SpatialScaleEntry,
        fixed_aspect: boolean,
    ) {
        this.manager = manager;
        this.elem = elem;
        this.xaxis = xaxis;
        this.yaxis = yaxis;
        this.fixed_aspect = fixed_aspect;
        this.listener = new EventListener();
        this.attach_listeners();
        this.subscribe_atoms();
        this.update_dom(manager.current_transform(this));
    }

    private attach_listeners(): void {
        this.listener.addEventListener(this.elem, "mousedown", (ev) =>
            this.manager.drag_start(this, ev as MouseEvent));
        this.listener.addEventListener(this.elem, "wheel", (ev) =>
            this.manager.wheel(this, ev as WheelEvent), { passive: false });
        this.listener.addEventListener(this.elem, "touchstart", (ev) =>
            this.manager.touch_start(this, ev as TouchEvent), { passive: false });
        this.listener.addEventListener(this.elem, "touchmove", (ev) =>
            this.manager.touch_move(this, ev as TouchEvent), { passive: false });
        this.listener.addEventListener(this.elem, "touchend", (ev) =>
            this.manager.touch_end(this, ev as TouchEvent));
        this.listener.addEventListener(this.elem, "touchcancel", (ev) =>
            this.manager.touch_end(this, ev as TouchEvent));
    }

    private subscribe_atoms(): void {
        if (this.xaxis.is_continuous()) {
            this.unsubs.push(this.manager.store.sub(this.xaxis.transform, () => this.on_axis_change('x')));
        }
        if (this.yaxis.is_continuous()) {
            this.unsubs.push(this.manager.store.sub(this.yaxis.transform, () => this.on_axis_change('y')));
        }
    }

    destroy(): void {
        this.hide_decoration();
        this.listener.removeElementListeners(this.elem);
        for (const unsub of this.unsubs) unsub();
    }

    get_zoom_group(): SVGGraphicsElement | null {
        const elem = this.elem.querySelector('[data-plotlib-zoom]');
        return elem as SVGGraphicsElement | null;
    }

    private get_deco_container(): SVGGElement | null {
        return this.elem.querySelector('[data-plotlib-decoration]');
    }

    show_decoration(start: Pair, current: Pair): void {
        const cont = this.get_deco_container();
        if (!cont) return;
        applyStyles(cont, this.manager.deco_root_styles);
        const [, w] = this.manager.store.get(this.xaxis.scale).range;
        const [, h] = this.manager.store.get(this.yaxis.scale).range;
        const x1 = Math.max(0, Math.min(start[0], current[0]));
        const y1 = Math.max(0, Math.min(start[1], current[1]));
        const x2 = Math.min(w, Math.max(start[0], current[0]));
        const y2 = Math.min(h, Math.max(start[1], current[1]));

        if (!this.deco_zoombox_shade) {
            this.deco_zoombox_shade = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            this.deco_zoombox_shade.setAttribute('fill-rule', 'evenodd');
            cont.appendChild(this.deco_zoombox_shade);
        }
        if (!this.deco_zoombox) {
            this.deco_zoombox = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            cont.appendChild(this.deco_zoombox);
        }
        applyStyles(this.deco_zoombox_shade, this.manager.deco_zoombox_shade_styles);
        applyStyles(this.deco_zoombox, this.manager.deco_zoombox_styles);

        this.deco_zoombox_shade.setAttribute('d', `M 0 0 H ${w} V ${h} H 0 Z M ${x1} ${y1} H ${x2} V ${y2} H ${x1} Z`);
        this.deco_zoombox.setAttribute('x', String(x1));
        this.deco_zoombox.setAttribute('y', String(y1));
        this.deco_zoombox.setAttribute('width', String(x2 - x1));
        this.deco_zoombox.setAttribute('height', String(y2 - y1));
    }

    hide_decoration(): void {
        this.deco_zoombox?.remove();
        this.deco_zoombox = null;
        this.deco_zoombox_shade?.remove();
        this.deco_zoombox_shade = null;
    }

    apply_transform(t: Transform2D): void {
        this.update_dom(t);
        const [xt, yt] = t.to_1d();
        if (this.xaxis.is_continuous()) this.manager.store.set(this.xaxis.transform, xt);
        if (this.yaxis.is_continuous()) this.manager.store.set(this.yaxis.transform, yt);
    }

    // Called when an axis transform atom changes from outside this plot's own interaction.
    // For fixedAspect plots, corrects the other axis to maintain the aspect ratio.
    private on_axis_change(changed: 'x' | 'y'): void {
        let t = this.manager.current_transform(this);
        if (this.fixed_aspect) {
            const method = changed === 'x' ? 'y' : 'x';
            t = this.manager.constrain_aspect(this, t, method);
            const [xt, yt] = t.to_1d();
            if (method === 'y' && this.yaxis.is_continuous()) {
                this.manager.store.set(this.yaxis.transform, yt);
            } else if (method === 'x' && this.xaxis.is_continuous()) {
                this.manager.store.set(this.xaxis.transform, xt);
            }
        }
        this.update_dom(t);
    }

    private update_dom(t: Transform2D): void {
        const group = this.get_zoom_group();
        if (group) group.setAttribute('transform', t.toString());
    }
}
