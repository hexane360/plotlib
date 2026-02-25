import { atom, Atom } from 'jotai';
import { Scale, NumericScale, ContinuousScale, linear } from './scale';
import * as layout from './layout';


/** Configuration for a single axis, passed to the `axes` map on `<Figure>`. */
export interface AxisSpec {
    /** Data range `[min, max]`. */
    domain: [number, number];
    /** Display size in the layout. Supports absolute units (`px`, `pt`, `in`, `cm`, `mm`), `%` of figure width, `rem`, and solver variables `a`–`f`. */
    size: layout.VariableLength;
    /** Pan limits. `true` clamps to `domain`, `false` disables clamping, or provide explicit `[min, max]` bounds. Defaults to `true`. */
    translateExtent?: [number, number] | boolean;
    /** Axis label text. */
    label?: string;
    /** Distance in pixels from the tick labels to the axis label. */
    labelOffset?: number;
    /** Whether to render the axis decoration. `'one'` renders only on the outermost panel in a grid. Defaults to `true`. */
    show?: boolean | 'one';
    /** Suggested tick count; passed to the tick generator as a hint. */
    ticks?: number;
    /** d3-format format string for tick labels (e.g. `'.2f'`). Defaults to `'~g'`. */
    tickFormat?: string;
    /** Tick mark length in pixels. Defaults to 8. */
    tickLength?: number;
}

/** Resolved axis object created by {@link normalize_axis}. Consumed internally by layout and rendering components. */
export interface Axis {
    /** Jotai atom holding the current {@link ContinuousScale}, recomputed when the solver variable changes. */
    scale: Atom<ContinuousScale>;
    /** Solver variable representing the pixel size of this axis. */
    size: layout.Variable;
    /** Resolved pan limits `[min, max]` in data coordinates. */
    translateExtent: [number, number];
    /** Axis label text. */
    label?: string;
    /** Distance in pixels from the tick labels to the axis label. */
    labelOffset?: number;
    /** Whether to render the axis decoration. */
    show: boolean | 'one';
    /** Suggested tick count. */
    ticks?: number;
    /** d3-format format string for tick labels. */
    tickFormat?: string;
    /** Tick mark length in pixels. */
    tickLength?: number;
}

/**
 * Resolve an {@link AxisSpec} into an {@link Axis}, binding a solver `Variable` for the display size.
 * Does not modify the input `axis`.
 */
export function normalize_axis(axis: AxisSpec, size: layout.Variable): Axis {
    const translateExtent = axis.translateExtent ?? true;

    return {
        ...axis,
        show: axis.show ?? true,
        translateExtent: translateExtent
            ? (translateExtent === true) ? axis.domain : translateExtent
            : [-Infinity, Infinity],
        scale: atom((get) => linear(axis.domain, [0, get(size.atom)])), size,
    };
}
