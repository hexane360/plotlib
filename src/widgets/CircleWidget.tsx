import React from 'react';
import { PrimitiveAtom, atom, useStore } from 'jotai';

import { usePlotScales } from '../hooks';
import { useDrag, useDrawOnChange } from './hooks';
import type { Point } from './hooks';
import { clampToDomain } from './PointWidget';
import { CompoundStylesProps, useProps, useCompoundStyles } from '../theme';
import styles from './CircleWidget.module.css';

/** Screen-px added to the handle's outer ring diameter (a ~half-this-wide outline). */
const HANDLE_HALO_PX = 3.0;

interface CircleGeometry {
    /** Center, in pixels. */
    cx: number;
    cy: number;
    /** Radius, in pixels. */
    r: number;
}

export interface CircleWidgetProps extends CompoundStylesProps<'body' | 'center' | 'halo' | 'dot' | 'handle'> {
    /** Atom holding the circle's center (`[x, y]`) in data coordinates. Dragging the filled body pans it. */
    center: PrimitiveAtom<Point>;
    /**
     * Atom holding the circle's radius, in **x-axis data units**. Dragging the
     * handle — always positioned directly to the right of the center — sets it.
     */
    radius: PrimitiveAtom<number>;
    /** Minimum radius (x-axis data units) enforced while dragging the handle. Defaults to `0.0`. */
    minRadius?: number;
    /** Clamp the dragged center to each axis domain. Defaults to `true`. */
    clampToDomain?: boolean;
    /** Handle marker radius in px (constant on screen, independent of zoom). Defaults to `5.0`. */
    handleR?: number;
    /** Center "+" mark half-length in px (constant on screen). Defaults to `6.0`. */
    markSize?: number;
    /** Called after every drag update (pan or resize), with the current center and radius. */
    onDrag?: (center: Point, radius: number) => void;
}

/** SVG path `d` for a "+" mark centered at `(cx, cy)`, arms `size` px long. */
export function crossPath(cx: number, cy: number, size: number): string {
    return `M ${cx - size} ${cy} L ${cx + size} ${cy} M ${cx} ${cy - size} L ${cx} ${cy + size}`;
}

/**
 * A draggable circle: a filled body bound to `center` (data coordinates), with a
 * resize handle fixed directly to the right of center, bound to `radius` (in
 * **x-axis data units**). Both atoms are the source of truth — the widget renders
 * their current values and writes back to them (via `store.set`) during a drag.
 *
 * - Dragging the body **pans**: `center` moves by the pointer's data-space delta.
 * - Dragging the handle **resizes**: `radius` is set to the pointer's x-distance
 *   from `center` (clamped to `minRadius`).
 *
 * Must be rendered inside a `<Plot.Clip>` (i.e. inside the `data-plotlib-zoom`
 * group) — that's what makes it track pan/zoom for free. The body's radius is a
 * genuine data-space extent, so — unlike the handle/center marks, which stay a
 * constant screen size — it scales with zoom like the plot itself, and may render
 * as an ellipse under a non-`fixedAspect` plot.
 */
export default function CircleWidget(props_: CircleWidgetProps) {
    const props = useProps('CircleWidget', props_, {
        minRadius: 0.0,
        clampToDomain: true,
        handleR: 5.0,
        markSize: 6.0,
    } as const);
    const get_styles = useCompoundStyles('CircleWidget', props, styles);

    const { xaxis, yaxis } = usePlotScales();
    const store = useStore();

    const containerRef = React.useRef<SVGGElement | null>(null);
    const bodyRef = React.useRef<SVGCircleElement | null>(null);
    const handleRef = React.useRef<SVGGElement | null>(null);

    // Derived atom resolving pixel geometry from center/radius and the current
    // scales, so it recomputes on drag OR a scale change (e.g. a resize).
    const geometryAtom = React.useMemo(() => atom((get): CircleGeometry => {
        const [x, y] = get(props.center);
        const radius = get(props.radius);
        const xscale = get(xaxis.scale);
        const yscale = get(yaxis.scale);
        const cx = xscale.transform([x])[0];
        const cy = yscale.transform([y])[0];
        const r = xscale.transform([x + radius])[0] - cx;
        return { cx, cy, r };
    }), [props.center, props.radius, xaxis, yaxis]);

    // Draw imperatively, mirroring PlotManager's transform updates: a drag (or a
    // scale change) updates `geometryAtom`, and this subscription writes the new
    // geometry onto the body/center/handle elements via setAttribute — no React
    // re-render.
    useDrawOnChange(containerRef, geometryAtom, (elem, { cx, cy, r }) => {
        const body = elem.getElementsByClassName(styles.body)[0];
        body?.setAttribute('cx', String(cx));
        body?.setAttribute('cy', String(cy));
        body?.setAttribute('r', String(Math.max(r, 0.0)));

        const centerMark = elem.getElementsByClassName(styles.center)[0];
        centerMark?.setAttribute('d', crossPath(cx, cy, props.markSize));

        const handle = elem.getElementsByClassName(styles.handle)[0];
        const handleD = `M ${cx + r} ${cy} h 0`;
        for (const mark of Array.from(handle?.getElementsByTagName('path') ?? [])) {
            mark.setAttribute('d', handleD);
        }
    }, [props.markSize]);

    // Drag the body: pan `center` by the pointer's data-space delta since drag start.
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
            props.onDrag?.(next, store.get(props.radius));
        },
        onEnd: () => { panStart.current = null; },
    }, [store, props.center, props.radius, props.clampToDomain, props.onDrag]);

    // Drag the handle: set `radius` to the pointer's x-distance from center.
    useDrag(handleRef, xaxis, yaxis, {
        onMove: (point) => {
            const [cx] = store.get(props.center);
            const next = Math.max(props.minRadius, point[0] - cx);
            store.set(props.radius, next);
            props.onDrag?.(store.get(props.center), next);
        },
    }, [store, props.center, props.radius, props.minRadius, props.onDrag]);

    const body = get_styles('body');
    const center = get_styles('center');
    const halo = get_styles('halo');
    const dot = get_styles('dot');
    return <g ref={containerRef} {...get_styles('root')}>
        <circle ref={bodyRef} {...body} />
        <path {...center} />
        <g ref={handleRef} {...get_styles('handle')}>
            <path {...halo} style={{ ...halo.style, strokeWidth: 2.0 * props.handleR + HANDLE_HALO_PX }} />
            <path {...dot} style={{ ...dot.style, strokeWidth: 2.0 * props.handleR }} />
        </g>
    </g>;
}
