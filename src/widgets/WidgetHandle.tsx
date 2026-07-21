import React from 'react';
import { Atom } from 'jotai';
import clsx from 'clsx';

import { useDrawOnChange } from './hooks';
import type { Point } from './hooks';
import { CompoundStylesProps, useProps, useCompoundStyles } from '../theme';
import styles from './WidgetHandle.module.css';

/** Screen-px added to the dot's diameter for the halo behind it. */
const HALO_PX = 3.0;

export interface WidgetHandleProps extends CompoundStylesProps<'halo' | 'dot'> {
    /**
     * Ref to the marker's root `<g>`. `WidgetHandle` draws into this element itself
     * (via `useDrawOnChange`); exposing it lets a caller (`PointWidget`,
     * `CircleWidget`'s resize handle) attach `useDrag` to that same element.
     */
    ref: React.RefObject<SVGGElement | null>;
    /** Pixel-space position (already resolved through the enclosing plot's scales). */
    position: Atom<Point>;
    /** Marker radius in px (constant on screen, independent of zoom). Defaults to `6.0`. */
    r?: number;
    /**
     * `'dot'` (default): an accent-colored dot with a background-colored halo — used
     * by both `PointWidget` and `CircleWidget`'s resize handle. `'invisible'`: a
     * single transparent mark, no halo — a fixed-screen-size, non-visual hit target
     * (e.g. `RectangleWidget`'s corner handles). SVG still hit-tests a `transparent`
     * stroke, unlike `none`.
     */
    variant?: 'dot' | 'invisible';

    className?: string;
}

/**
 * A constant-screen-size marker — an accent dot, or an invisible hit target, per
 * `variant` — drawn as two stacked zero-length, non-scaling-stroke paths so neither
 * shrinks nor grows under zoom. Positioned imperatively from `position` (pixel
 * coordinates) via `useDrawOnChange`, bypassing React re-renders on every update.
 *
 * Purely presentational: `WidgetHandle` does not itself wire up dragging. Callers
 * attach `useDrag` to the same `ref` they pass in, so the drag hit-target and the
 * drawn marker are the same (untransformed) element.
 */
export default function WidgetHandle(props_: WidgetHandleProps) {
    const props = useProps('WidgetHandle', props_, { r: 6.0, variant: 'dot' } as const);
    const get_styles = useCompoundStyles('WidgetHandle', props, styles);

    useDrawOnChange(props.ref, props.position, (elem, [px, py]) => {
        const d = `M ${px} ${py} h 0`;
        for (const path of Array.from(elem.getElementsByTagName('path'))) {
            path.setAttribute('d', d);
        }
    }, []);

    const halo = get_styles('halo');
    const dot = get_styles('dot');
    return <g ref={props.ref} {...get_styles('root', props.className)} {...(props.variant == 'invisible' && {'data-invisible': true})}>
        <path {...halo} style={{ ...halo.style, strokeWidth: 2.0 * props.r + HALO_PX }}/>
        <path {...dot} style={{ ...dot.style, strokeWidth: 2.0 * props.r }}/>
    </g>;
}
