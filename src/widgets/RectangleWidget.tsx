import React from 'react';
import { PrimitiveAtom, atom, useStore } from 'jotai';

import { usePlotScales } from '../hooks';
import { useMultiDrag, useDrag, useDrawOnChange } from './hooks';
import type { Point, DragHandlers } from './hooks';
import { clampToDomain } from './PointWidget';
import WidgetHandle from './WidgetHandle';
import { CompoundStylesProps, useProps, useCompoundStyles } from '../theme';
import { clamp } from '../utils';
import styles from './RectangleWidget.module.css';

interface RectGeometry {
    /** Pixel-space corners resolved from `min`/`max`. NOT necessarily `px0 <= px1`
     *  (an axis scale may be reversed) — draw/hit-test code must not assume order. */
    px0: number;
    py0: number;
    px1: number;
    py1: number;
}

/** Which of the four scalar bounds a given handle's drag affects. */
type Channel = 'minX' | 'minY' | 'maxX' | 'maxY';

export interface RectangleWidgetProps extends CompoundStylesProps<'body'> {
    /** Atom holding one corner (`[x, y]`) in data coordinates. Dragging the body pans both corners together. */
    min: PrimitiveAtom<Point>;
    /** Atom holding the opposite corner (`[x, y]`) in data coordinates. */
    max: PrimitiveAtom<Point>;
    /** Minimum width (`max.x - min.x`, x-axis data units) enforced while resizing. Defaults to `0.0`. */
    minWidth?: number;
    /** Minimum height (`max.y - min.y`, y-axis data units) enforced while resizing. Defaults to `0.0`. */
    minHeight?: number;
    /** Clamp dragged corners to each axis domain. Defaults to `true`. */
    clampToDomain?: boolean;
    handleSize?: number;
    /** Called after every drag update (pan or resize), with the current `min`/`max`. */
    onDrag?: (min: Point, max: Point) => void;
}

/** Clamp `v` to `domain` (if given), tolerating an inverted domain (`domain[1] < domain[0]`). */
function clampCandidate(v: number, domain: readonly [number, number] | undefined): number {
    if (!domain) return v;
    const [a, b] = domain;
    return a <= b ? clamp(v, [a, b]) : clamp(v, [b, a]);
}

/**
 * A draggable, resizable rectangle: a `<rect>` body bound to opposite corners
 * `min`/`max` (data coordinates), with 8 invisible hit targets — 4 corners, 4
 * edges — for resizing. Both atoms are the source of truth — the widget renders
 * their current values and writes back to them (via `store.set`) during a drag.
 *
 * - Dragging the body **pans**: both corners move by the pointer's data-space delta.
 * - Dragging a corner moves both of its coordinates; dragging an edge moves one.
 *   Each is clamped against the opposite bound so the rectangle can shrink to
 *   `minWidth`/`minHeight` but never collapse or invert.
 *
 * The 8 hit targets are invisible (`WidgetHandle` in its `'invisible'` variant for
 * the corners, a transparent non-scaling-stroke line for each edge) — this widget
 * has no visible handle chrome, only the `<rect>` body.
 *
 * Must be rendered inside a `<Plot.Clip>` (i.e. inside the `data-plotlib-zoom`
 * group) — that's what makes it track pan/zoom for free. The body is a genuine
 * data-space extent, so it scales with zoom like the plot itself; the hit targets
 * stay a constant screen size.
 */
export default function RectangleWidget(props_: RectangleWidgetProps) {
    const props = useProps('RectangleWidget', props_, {
        minWidth: 0.0,
        minHeight: 0.0,
        clampToDomain: true,
        handleSize: 12.0,
    } as const);
    const get_styles = useCompoundStyles('RectangleWidget', props, styles);

    const { xaxis, yaxis } = usePlotScales();
    const store = useStore();

    const containerRef = React.useRef<SVGGElement | null>(null);
    const bodyRef = React.useRef<SVGRectElement | null>(null);
    const minXMinYRef = React.useRef<SVGGElement | null>(null);
    const maxXMinYRef = React.useRef<SVGGElement | null>(null);
    const minXMaxYRef = React.useRef<SVGGElement | null>(null);
    const maxXMaxYRef = React.useRef<SVGGElement | null>(null);
    const minXEdgeRef = React.useRef<SVGPathElement | null>(null);
    const maxXEdgeRef = React.useRef<SVGPathElement | null>(null);
    const minYEdgeRef = React.useRef<SVGPathElement | null>(null);
    const maxYEdgeRef = React.useRef<SVGPathElement | null>(null);

    // Derived atom resolving pixel geometry from min/max and the current scales, so
    // it recomputes on drag OR a scale change (e.g. a resize).
    const geometryAtom = React.useMemo(() => atom((get): RectGeometry => {
        const [minX, minY] = get(props.min);
        const [maxX, maxY] = get(props.max);
        const xscale = get(xaxis.scale);
        const yscale = get(yaxis.scale);
        return {
            px0: xscale.transform([minX])[0],
            py0: yscale.transform([minY])[0],
            px1: xscale.transform([maxX])[0],
            py1: yscale.transform([maxY])[0],
        };
    }), [props.min, props.max, xaxis, yaxis]);

    // Body + edge hit targets are drawn directly here (a real data-space extent and
    // four line segments, respectively — corners are `WidgetHandle`s and manage
    // their own drawing). Mirrors PlotManager's transform updates: a drag (or a
    // scale change) updates `geometryAtom`, and this subscription writes the new
    // geometry via setAttribute — no React re-render.
    useDrawOnChange(containerRef, geometryAtom, (elem, { px0, py0, px1, py1 }) => {
        const rect = elem.getElementsByClassName(styles.body)[0];
        rect?.setAttribute('x', String(Math.min(px0, px1)));
        rect?.setAttribute('y', String(Math.min(py0, py1)));
        rect?.setAttribute('width', String(Math.abs(px1 - px0)));
        rect?.setAttribute('height', String(Math.abs(py1 - py0)));

        elem.getElementsByClassName(styles.minXEdge)[0]?.setAttribute('d', `M ${px0} ${py0} L ${px0} ${py1}`);
        elem.getElementsByClassName(styles.maxXEdge)[0]?.setAttribute('d', `M ${px1} ${py0} L ${px1} ${py1}`);
        elem.getElementsByClassName(styles.minYEdge)[0]?.setAttribute('d', `M ${px0} ${py0} L ${px1} ${py0}`);
        elem.getElementsByClassName(styles.maxYEdge)[0]?.setAttribute('d', `M ${px0} ${py1} L ${px1} ${py1}`);
    }, []);

    // Each corner's pixel position, read off the same geometry.
    const minXMinYAtom = React.useMemo(() => atom((get): Point => {
        const { px0, py0 } = get(geometryAtom);
        return [px0, py0];
    }), [geometryAtom]);
    const maxXMinYAtom = React.useMemo(() => atom((get): Point => {
        const { px1, py0 } = get(geometryAtom);
        return [px1, py0];
    }), [geometryAtom]);
    const minXMaxYAtom = React.useMemo(() => atom((get): Point => {
        const { px0, py1 } = get(geometryAtom);
        return [px0, py1];
    }), [geometryAtom]);
    const maxXMaxYAtom = React.useMemo(() => atom((get): Point => {
        const { px1, py1 } = get(geometryAtom);
        return [px1, py1];
    }), [geometryAtom]);

    // Drag the body: pan both corners by the pointer's data-space delta since drag start.
    const panStart = React.useRef<{ pointer: Point; min: Point; max: Point } | null>(null);
    useDrag(bodyRef, xaxis, yaxis, {
        onStart: (point) => {
            panStart.current = { pointer: point, min: store.get(props.min), max: store.get(props.max) };
        },
        onMove: (point) => {
            if (!panStart.current) return;
            const { pointer, min, max } = panStart.current;
            const dx = point[0] - pointer[0];
            const dy = point[1] - pointer[1];
            let nextMin: Point = [min[0] + dx, min[1] + dy];
            let nextMax: Point = [max[0] + dx, max[1] + dy];
            if (props.clampToDomain) {
                const xDomain = store.get(xaxis.scale).domain;
                const yDomain = store.get(yaxis.scale).domain;
                nextMin = clampToDomain(nextMin, xDomain, yDomain);
                nextMax = clampToDomain(nextMax, xDomain, yDomain);
            }
            store.set(props.min, nextMin);
            store.set(props.max, nextMax);
            props.onDrag?.(nextMin, nextMax);
        },
        onEnd: () => { panStart.current = null; },
    }, [store, props.min, props.max, props.clampToDomain, props.onDrag]);

    // One handler factory for all 8 resize targets: `channels` says which of the
    // four scalar bounds this particular handle's drag writes (a corner writes two,
    // an edge writes one). Each channel is clamped against the *opposite* bound
    // (± minWidth/minHeight) so the rectangle can shrink but never collapse or
    // invert; unaffected channels pass through unchanged.
    function makeHandler(channels: readonly Channel[]): DragHandlers {
        return {
            onMove: (point) => {
                const [minX, minY] = store.get(props.min);
                const [maxX, maxY] = store.get(props.max);
                const xDomain = props.clampToDomain ? store.get(xaxis.scale).domain : undefined;
                const yDomain = props.clampToDomain ? store.get(yaxis.scale).domain : undefined;

                let nextMinX = minX, nextMinY = minY, nextMaxX = maxX, nextMaxY = maxY;
                if (channels.includes('minX')) nextMinX = Math.min(clampCandidate(point[0], xDomain), maxX - props.minWidth);
                if (channels.includes('maxX')) nextMaxX = Math.max(clampCandidate(point[0], xDomain), minX + props.minWidth);
                if (channels.includes('minY')) nextMinY = Math.min(clampCandidate(point[1], yDomain), maxY - props.minHeight);
                if (channels.includes('maxY')) nextMaxY = Math.max(clampCandidate(point[1], yDomain), minY + props.minHeight);

                const nextMin: Point = [nextMinX, nextMinY];
                const nextMax: Point = [nextMaxX, nextMaxY];
                store.set(props.min, nextMin);
                store.set(props.max, nextMax);
                props.onDrag?.(nextMin, nextMax);
            },
        };
    }

    useMultiDrag([
        { ref: minXMinYRef, handlers: makeHandler(['minX', 'minY']) },
        { ref: maxXMinYRef, handlers: makeHandler(['maxX', 'minY']) },
        { ref: minXMaxYRef, handlers: makeHandler(['minX', 'maxY']) },
        { ref: maxXMaxYRef, handlers: makeHandler(['maxX', 'maxY']) },
        { ref: minXEdgeRef, handlers: makeHandler(['minX']) },
        { ref: maxXEdgeRef, handlers: makeHandler(['maxX']) },
        { ref: minYEdgeRef, handlers: makeHandler(['minY']) },
        { ref: maxYEdgeRef, handlers: makeHandler(['maxY']) },
    ], xaxis, yaxis, [store, props.min, props.max, props.minWidth, props.minHeight, props.clampToDomain, props.onDrag]);

    return <g ref={containerRef} {...get_styles('root')}>
        <rect ref={bodyRef} {...get_styles('body')} />

        <path ref={minXEdgeRef} className={styles.minXEdge} style={{ strokeWidth: props.handleSize }} />
        <path ref={maxXEdgeRef} className={styles.maxXEdge} style={{ strokeWidth: props.handleSize }} />
        <path ref={minYEdgeRef} className={styles.minYEdge} style={{ strokeWidth: props.handleSize }} />
        <path ref={maxYEdgeRef} className={styles.maxYEdge} style={{ strokeWidth: props.handleSize }} />

        <WidgetHandle ref={minXMinYRef} position={minXMinYAtom} r={props.handleSize} variant="invisible" className={styles.cornerNwSe} />
        <WidgetHandle ref={maxXMaxYRef} position={maxXMaxYAtom} r={props.handleSize} variant="invisible" className={styles.cornerNwSe} />
        <WidgetHandle ref={maxXMinYRef} position={maxXMinYAtom} r={props.handleSize} variant="invisible" className={styles.cornerNeSw} />
        <WidgetHandle ref={minXMaxYRef} position={minXMaxYAtom} r={props.handleSize} variant="invisible" className={styles.cornerNeSw} />
    </g>;
}
