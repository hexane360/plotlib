import type { Manager } from "./InteractionManager";
import { SpatialScaleEntry } from "../context";
import { Transform2D } from "../transform";
import EventListener from "./EventListener";
import { Pair } from "./utils";
import styles from "../styles.module.css";

export class PlotManager {
    readonly manager: Manager;
    readonly elem: SVGGraphicsElement;
    readonly xaxis: SpatialScaleEntry;
    readonly yaxis: SpatialScaleEntry;
    readonly fixed_aspect: boolean;

    private readonly listener: EventListener;
    private readonly unsubs: Array<() => void> = [];

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
        this.listener.removeElementListeners(this.elem);
        for (const unsub of this.unsubs) unsub();
    }

    get_zoom_group(): SVGGraphicsElement | null {
        const elems = this.elem.getElementsByClassName(styles['Plot-zoom']);
        return elems.length > 0 ? elems[0] as SVGGraphicsElement : null;
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
