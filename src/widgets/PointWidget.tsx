import React from 'react';
import { PrimitiveAtom, atom, useStore } from 'jotai';

import { usePlotScales } from '../hooks';
import { useDrag } from './hooks';
import type { Point } from './hooks';
import WidgetHandle from './WidgetHandle';
import { CompoundStylesProps, useProps } from '../theme';
import { clamp } from '../utils';

export type { Point };

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
 * A thin wrapper over `WidgetHandle` (the marker) + `useDrag` (the drag lifecycle):
 * it derives the marker's pixel position from `position` and the plot's scales, and
 * writes drag moves back to `position` (through `clampToDomain`).
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

    const { xaxis, yaxis } = usePlotScales();
    const store = useStore();

    const ref = React.useRef<SVGGElement | null>(null);

    // Derived atom resolving the pixel position from `position` and the current
    // scales, so it recomputes when the position OR either axis scale changes
    // (e.g. a resize).
    const pixelAtom = React.useMemo(() => atom((get): Point => {
        const [x, y] = get(props.position);
        return [get(xaxis.scale).transform([x])[0], get(yaxis.scale).transform([y])[0]];
    }), [props.position, xaxis, yaxis]);

    useDrag(ref, xaxis, yaxis, {
        onMove: (point) => {
            const xs = store.get(xaxis.scale);
            const ys = store.get(yaxis.scale);
            const next = props.clampToDomain ? clampToDomain(point, xs.domain, ys.domain) : point;
            store.set(props.position, next);
            props.onDrag?.(next);
        },
    }, [store, props.position, props.clampToDomain, props.onDrag]);

    return <WidgetHandle
        ref={ref}
        position={pixelAtom}
        r={props.r}
        classNames={props.classNames}
        unstyled={props.unstyled}
    />;
}
