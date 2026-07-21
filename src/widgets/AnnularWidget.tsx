import React from 'react';
import { PrimitiveAtom, atom, useStore } from 'jotai';

import { usePlotScales } from '../hooks';
import { useDrag, useDrawOnChange } from './hooks';
import type { Point } from './hooks';
import { clampToDomain } from './PointWidget';
import { crossPath } from './CircleWidget';
import WidgetHandle from './WidgetHandle';
import { CompoundStylesProps, useProps, useCompoundStyles } from '../theme';
import { clamp } from '../utils';
import styles from './AnnularWidget.module.css';

interface AnnularGeometry {
    /** Center, in pixels. */
    cx: number;
    cy: number;
    /** Radii, in pixels. */
    rInner: number;
    rOuter: number;
}

export interface AnnularWidgetProps extends CompoundStylesProps<'body' | 'center' | 'halo' | 'dot'> {
    /** Atom holding the ring's center (`[x, y]`) in data coordinates. Dragging the shaded band pans it. */
    center: PrimitiveAtom<Point>;
    /** Atom holding the inner radius, in **x-axis data units**. Dragging the inner handle sets it. */
    innerRadius: PrimitiveAtom<number>;
    /** Atom holding the outer radius, in **x-axis data units**. Dragging the outer handle sets it. */
    outerRadius: PrimitiveAtom<number>;
    /** Minimum `outerRadius - innerRadius` (x-axis data units) enforced while dragging either handle. Defaults to `0.0`. */
    minGap?: number;
    /** Clamp the dragged center to each axis domain. Defaults to `true`. */
    clampToDomain?: boolean;
    /** Handle marker radius in px (constant on screen, independent of zoom). Defaults to `5.0`. */
    handleR?: number;
    /** Center "+" mark half-length in px (constant on screen). Defaults to `6.0`. */
    markSize?: number;
    /** Called after every drag update (pan or resize), with the current center, inner, and outer radius. */
    onDrag?: (center: Point, innerRadius: number, outerRadius: number) => void;
}

/** Full-circle SVG subpath (as two arcs), radius `r`, centered at `(cx, cy)`. */
function circleSubpath(cx: number, cy: number, r: number): string {
    return `M ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} Z`;
}

/**
 * SVG path `d` for an annulus (ring) — an outer disk with an inner disk cut out —
 * for use with `fill-rule="evenodd"`. Degrades to a plain filled disk when
 * `rInner` is `0`.
 */
export function annularPath(cx: number, cy: number, rOuter: number, rInner: number): string {
    return `${circleSubpath(cx, cy, rOuter)} ${circleSubpath(cx, cy, rInner)}`;
}

/**
 * A draggable ring: a shaded annulus (the band between `innerRadius` and
 * `outerRadius`, both **x-axis data units**) bound to `center` (data coordinates),
 * with two `WidgetHandle`s — one per radius, both fixed directly to the right of
 * center. All three atoms are the source of truth — the widget renders their
 * current values and writes back to them (via `store.set`) during a drag.
 *
 * - Dragging the shaded band **pans**: `center` moves by the pointer's data-space
 *   delta. The hollow center is correctly excluded from hit-testing (the body is a
 *   single evenodd `<path>`), so dragging inside the hole does nothing.
 * - Dragging a handle **resizes** the corresponding radius, clamped so the two
 *   radii stay at least `minGap` apart.
 *
 * Must be rendered inside a `<Plot.Clip>` (i.e. inside the `data-plotlib-zoom`
 * group) — that's what makes it track pan/zoom for free. Both radii are genuine
 * data-space extents, so — unlike the handle/center marks, which stay a constant
 * screen size — the body scales with zoom like the plot itself, and may render
 * elliptical under a non-`fixedAspect` plot.
 */
export default function AnnularWidget(props_: AnnularWidgetProps) {
    const props = useProps('AnnularWidget', props_, {
        minGap: 0.0,
        clampToDomain: true,
        handleR: 5.0,
        markSize: 6.0,
    } as const);
    const get_styles = useCompoundStyles('AnnularWidget', props, styles);

    const { xaxis, yaxis } = usePlotScales();
    const store = useStore();

    const containerRef = React.useRef<SVGGElement | null>(null);
    const bodyRef = React.useRef<SVGPathElement | null>(null);
    const innerHandleRef = React.useRef<SVGGElement | null>(null);
    const outerHandleRef = React.useRef<SVGGElement | null>(null);

    // Derived atom resolving pixel geometry from center/radii and the current
    // scales, so it recomputes on drag OR a scale change (e.g. a resize).
    const geometryAtom = React.useMemo(() => atom((get): AnnularGeometry => {
        const [x, y] = get(props.center);
        const innerRadius = get(props.innerRadius);
        const outerRadius = get(props.outerRadius);
        const xscale = get(xaxis.scale);
        const yscale = get(yaxis.scale);
        const cx = xscale.transform([x])[0];
        const cy = yscale.transform([y])[0];
        const rInner = xscale.transform([x + innerRadius])[0] - cx;
        const rOuter = xscale.transform([x + outerRadius])[0] - cx;
        return { cx, cy, rInner, rOuter };
    }), [props.center, props.innerRadius, props.outerRadius, xaxis, yaxis]);

    // Body + center mark are drawn directly here (real data-space extents and a
    // fixed-position mark, respectively — neither is a `WidgetHandle`-shaped drag
    // target). Mirrors PlotManager's transform updates: a drag (or a scale change)
    // updates `geometryAtom`, and this subscription writes the new geometry via
    // setAttribute — no React re-render.
    useDrawOnChange(containerRef, geometryAtom, (elem, { cx, cy, rInner, rOuter }) => {
        const body = elem.getElementsByClassName(styles.body)[0];
        body?.setAttribute('d', annularPath(cx, cy, Math.max(rOuter, 0.0), Math.max(rInner, 0.0)));

        const centerMark = elem.getElementsByClassName(styles.center)[0];
        centerMark?.setAttribute('d', crossPath(cx, cy, props.markSize));
    }, [props.markSize]);

    // Each handle's pixel position: always directly right of center, by
    // construction (both radii are in x-axis data units, so `x + radius` is
    // due-right of `x`).
    const innerHandleAtom = React.useMemo(() => atom((get): Point => {
        const { cx, cy, rInner } = get(geometryAtom);
        return [cx + rInner, cy];
    }), [geometryAtom]);
    const outerHandleAtom = React.useMemo(() => atom((get): Point => {
        const { cx, cy, rOuter } = get(geometryAtom);
        return [cx + rOuter, cy];
    }), [geometryAtom]);

    // Drag the band: pan `center` by the pointer's data-space delta since drag start.
    const panStart = React.useRef<{ pointer: Point; center: Point } | null>(null);
    useDrag(bodyRef, xaxis, yaxis, {
        onStart: (point) => {
            panStart.current = { pointer: point, center: store.get(props.center) };
        },
        onMove: (point) => {
            if (!panStart.current) return;
            const { pointer, center } = panStart.current;
            let next: Point = [center[0] + (point[0] - pointer[0]), center[1] + (point[1] - pointer[1])];
            if (props.clampToDomain) {
                next = clampToDomain(next, store.get(xaxis.scale).domain, store.get(yaxis.scale).domain);
            }
            store.set(props.center, next);
            props.onDrag?.(next, store.get(props.innerRadius), store.get(props.outerRadius));
        },
        onEnd: () => { panStart.current = null; },
    }, [store, props.center, props.innerRadius, props.outerRadius, props.clampToDomain, props.onDrag]);

    // Drag the inner handle: set `innerRadius` to the pointer's x-distance from
    // center, kept between 0 and `outerRadius - minGap`.
    useDrag(innerHandleRef, xaxis, yaxis, {
        onMove: (point) => {
            const [cx] = store.get(props.center);
            const outerRadius = store.get(props.outerRadius);
            const next = clamp(point[0] - cx, [0.0, outerRadius - props.minGap]);
            store.set(props.innerRadius, next);
            props.onDrag?.(store.get(props.center), next, outerRadius);
        },
    }, [store, props.center, props.innerRadius, props.outerRadius, props.minGap, props.onDrag]);

    // Drag the outer handle: set `outerRadius` to the pointer's x-distance from
    // center, kept at least `innerRadius + minGap`.
    useDrag(outerHandleRef, xaxis, yaxis, {
        onMove: (point) => {
            const [cx] = store.get(props.center);
            const innerRadius = store.get(props.innerRadius);
            const next = Math.max(point[0] - cx, innerRadius + props.minGap);
            store.set(props.outerRadius, next);
            props.onDrag?.(store.get(props.center), innerRadius, next);
        },
    }, [store, props.center, props.innerRadius, props.outerRadius, props.minGap, props.onDrag]);

    return <g ref={containerRef} {...get_styles('root')}>
        <path ref={bodyRef} {...get_styles('body')} fillRule="evenodd" />
        <path {...get_styles('center')} />
        <WidgetHandle
            ref={innerHandleRef}
            position={innerHandleAtom}
            r={props.handleR}
            classNames={props.classNames}
            unstyled={props.unstyled}
        />
        <WidgetHandle
            ref={outerHandleRef}
            position={outerHandleAtom}
            r={props.handleR}
            classNames={props.classNames}
            unstyled={props.unstyled}
        />
    </g>;
}
