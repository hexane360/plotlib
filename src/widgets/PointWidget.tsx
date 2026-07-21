import React from 'react';
import { PrimitiveAtom, atom, useStore } from 'jotai';

import { usePlotScales } from '../hooks';
import { CompoundStylesProps, useProps, useCompoundStyles } from '../theme';
import EventListener from '../interaction/EventListener';
import { getEventCoords } from '../interaction/utils';
import { clamp } from '../utils';
import styles from "./PointWidget.module.css";

export type Point = readonly [number, number];

/** Screen-px added to the dot diameter for the background halo (a ~half-this-wide ring). */
const HANDLE_HALO_PX = 3.0;

export interface PointWidgetProps extends CompoundStylesProps<'halo' | 'dot'> {
    /** Atom holding the point position (`[x, y]`) in data coordinates. Read to render, written on drag. */
    position: PrimitiveAtom<Point>;
    /** Handle radius in px (constant on screen, independent of zoom). Defaults to `6.0`. */
    r?: number;
    /** Clamp the dragged position to each axis domain. Defaults to `true`. */
    clampToDomain?: boolean;
    /** Called after each drag update (in addition to writing the atom). Optional. */
    onDrag?: (p: Point) => void;
}

export function clampToDomain(
    p: Point,
    xdomain: readonly [number, number],
    ydomain: readonly [number, number],
): Point {
    const clamp_axis = (v: number, [a, b]: readonly [number, number]) =>
        a <= b ? clamp(v, [a, b]) : clamp(v, [b, a]);
    return [clamp_axis(p[0], xdomain), clamp_axis(p[1], ydomain)];
}

/**
 * A draggable point handle, bound to a Jotai atom holding its position in data
 * coordinates. The atom is the single source of truth: `PointWidget` renders at
 * its current value and writes back to it (via `store.set`) during a drag.
 *
 * Must be rendered inside a `<Plot.Clip>` (i.e. inside the `data-plotlib-zoom`
 * group) — that's what makes it track pan/zoom for free. Placed outside the
 * clip, it still renders, but won't move with the plot.
 */
export default function PointWidget(props_: PointWidgetProps) {
    const props = useProps('PointWidget', props_, {
        r: 6.0,
        clampToDomain: true,
    } as const);
    const get_styles = useCompoundStyles('PointWidget', props, styles);

    const { xaxis, yaxis } = usePlotScales();
    const store = useStore();

    const ref = React.useRef<SVGGElement | null>(null);

    const markAtom = React.useMemo(() => atom((get) => {
        const [x, y] = get(props.position);
        const px = get(xaxis.scale).transform([x])[0];
        const py = get(yaxis.scale).transform([y])[0];
        return `M ${px} ${py} h 0`;
    }), [props.position, xaxis, yaxis]);

    const drawMark = React.useCallback(() => {
        if (!ref.current) return;
        const d = store.get(markAtom);
        for (const path of Array.from(ref.current.getElementsByTagName('path'))) {
            path.setAttribute('d', d);
        }
    }, [store, markAtom]);

    React.useLayoutEffect(() => {
        drawMark();
        return store.sub(markAtom, drawMark);
    }, [markAtom, drawMark]);

    React.useEffect(() => {
        const elem = ref.current;
        if (!elem) return;

        const listener = new EventListener();

        const update = (src: MouseEvent | Touch) => {
            const [px, py] = getEventCoords(elem, src);
            const xs = store.get(xaxis.scale);
            const ys = store.get(yaxis.scale);
            let point: Point = [xs.untransform([px])[0], ys.untransform([py])[0]];
            if (props.clampToDomain) point = clampToDomain(point, xs.domain, ys.domain);

            store.set(props.position, point);
            props.onDrag?.(point);
        };

        const end_drag = () => listener.removeWindowListeners();

        listener.addEventListener(elem, 'mousedown', (down_ev) => {
            down_ev.stopPropagation();
            down_ev.preventDefault();
            listener.addWindowListener('mousemove', (move_ev) => update(move_ev));
            listener.addWindowListener('mouseup', end_drag);
        });

        listener.addEventListener(elem, 'touchstart', (start_ev) => {
            start_ev.stopPropagation();
            start_ev.preventDefault();
            // First touch only; multi-touch is out of scope.
            listener.addWindowListener('touchmove', (move_ev) => update(move_ev.touches[0]), { passive: false });
            listener.addWindowListener('touchend', end_drag);
            listener.addWindowListener('touchcancel', end_drag);
        }, { passive: false });

        return () => {
            listener.removeElementListeners(elem);
            listener.removeWindowListeners();
        };
    }, [store, xaxis, yaxis, props.position, props.clampToDomain, props.onDrag]);

    const halo = get_styles('halo');
    const dot = get_styles('dot');
    return <g ref={ref} {...get_styles('root')}>
        <path className={`${halo.className}`} style={{ ...halo.style, strokeWidth: 2.0 * props.r + HANDLE_HALO_PX }} />
        <path className={`${dot.className}`} style={{ ...dot.style, strokeWidth: 2.0 * props.r }} />
    </g>;
}
