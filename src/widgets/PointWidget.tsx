import React from 'react';
import { PrimitiveAtom, atom, useStore } from 'jotai';

import { usePlotScales } from '../hooks';
import { useDrag, useDrawOnChange } from './hooks';
import type { Point } from './hooks';
import { CompoundStylesProps, useProps, useCompoundStyles } from '../theme';
import { clamp } from '../utils';
import styles from "./PointWidget.module.css";

export type { Point };

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

    // Derived atom resolving the mark's `d` from the position and the current scales,
    // so it recomputes when the position OR either axis scale changes (e.g. a resize).
    const markAtom = React.useMemo(() => atom((get) => {
        const [x, y] = get(props.position);
        const px = get(xaxis.scale).transform([x])[0];
        const py = get(yaxis.scale).transform([y])[0];
        return `M ${px} ${py} h 0`;
    }), [props.position, xaxis, yaxis]);

    useDrawOnChange(ref, markAtom, (elem, d) => {
        for (const path of Array.from(elem.getElementsByTagName('path'))) {
            path.setAttribute('d', d);
        }
    }, []);

    useDrag(ref, xaxis, yaxis, {
        onMove: (point) => {
            const xs = store.get(xaxis.scale);
            const ys = store.get(yaxis.scale);
            const next = props.clampToDomain ? clampToDomain(point, xs.domain, ys.domain) : point;
            store.set(props.position, next);
            props.onDrag?.(next);
        },
    }, [store, props.position, props.clampToDomain, props.onDrag]);

    const halo = get_styles('halo');
    const dot = get_styles('dot');
    return <g ref={ref} {...get_styles('root')}>
        <path className={`${halo.className}`} style={{ ...halo.style, strokeWidth: 2.0 * props.r + HANDLE_HALO_PX }} />
        <path className={`${dot.className}`} style={{ ...dot.style, strokeWidth: 2.0 * props.r }} />
    </g>;
}
