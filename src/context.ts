import React from 'react';
import { Atom, PrimitiveAtom } from 'jotai';
import { ContinuousScale, ColorLike, NumericScale } from './scale';
import { Transform1D } from './transform';
import * as layout from './layout';

// ── Normalized axis entries (internal, stored in FigureContext) ───────────────

export interface ContinuousAxisEntry {
    kind: 'continuous';
    scale: Atom<ContinuousScale>;
    transform: PrimitiveAtom<Transform1D>;
    size: layout.Variable;
    translateExtent: [number, number];
    zoomExtent: [number, number];
}

export interface ColorAxisEntry {
    kind: 'color';
    scale: Atom<NumericScale<ColorLike>>;
}

export type AxisEntry = ContinuousAxisEntry | ColorAxisEntry;

// ── Low-level type guards (exported for advanced use) ─────────────────────────

export function isContinuousAxis(e: AxisEntry): e is ContinuousAxisEntry { return e.kind === 'continuous'; }
export function isColorAxis(e: AxisEntry): e is ColorAxisEntry { return e.kind === 'color'; }

// ── Data provided by `<Figure>` to all child components ───────────────────────

/** Data provided by `<Figure>` to all child components. */
export interface FigureContextData<K extends string = string> {
    /** Resolved axis entries, keyed by the names passed to `Figure.scales`. */
    scales: Map<K, AxisEntry>;

    /** Get a continuous (spatial) axis entry by key. Throws with a useful message if missing or wrong type. */
    getContinuousAxis(key: K): ContinuousAxisEntry;
    /** Get a color axis entry by key. Throws with a useful message if missing or wrong type. */
    getColorAxis(key: K): ColorAxisEntry;
}

/** React context supplying {@link FigureContextData} to components inside a `<Figure>`. */
export const FigureContext = React.createContext<FigureContextData<string> | null>(null);

/** Data provided by `<Plot>` to all child components. */
export interface PlotContextData {
    /** Name of the active x-axis (a key in the enclosing `FigureContextData.scales`). */
    xaxis: string;
    /** Name of the active y-axis (a key in the enclosing `FigureContextData.scales`). */
    yaxis: string;
    /** Position of the x-axis decoration relative to the plot area. */
    xaxis_pos: 'bottom' | 'top';
    /** Position of the y-axis decoration relative to the plot area. */
    yaxis_pos: 'left' | 'right';
    /** Whether the x and y pixel scale factors are locked equal. */
    fixedAspect: boolean;
}

/** React context supplying {@link PlotContextData} to components inside a `<Plot>`. */
export const PlotContext = React.createContext<PlotContextData | null>(null);
