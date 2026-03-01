import React from 'react';
import { Atom, PrimitiveAtom } from 'jotai';
import { ContinuousScale, ColorLike, NumericScale, Scale, SpatialScale } from './scale';
import { Transform1D } from './transform';
import * as layout from './layout';

/** Named data atoms passed to `<Figure data={...}>`. */
export type DataMap = Record<string, Atom<any>>;

// ── Normalized axis entries (internal, stored in FigureContext) ───────────────

export interface BaseScaleEntry {
    scale: Atom<Scale<any, any>>;

    is_spatial(): this is SpatialScaleEntry;
    is_continuous(): this is ContinuousScaleEntry;
    is_color(): this is ColorScaleEntry;
}

export interface SpatialScaleEntry extends BaseScaleEntry {
    scale: Atom<SpatialScale<any>>;
    size: layout.Variable;
}

export interface ContinuousScaleEntry extends BaseScaleEntry {
    scale: Atom<ContinuousScale>;
    size: layout.Variable;
    transform: PrimitiveAtom<Transform1D>;
    translateExtent: [number, number];
    zoomExtent: [number, number];
}

export type ScaleSource = 'auto' | 'manual' | 'interaction'

export interface ColorScaleEntry extends BaseScaleEntry {
    scale: PrimitiveAtom<NumericScale<ColorLike>>;
    /** Source of domain min. Defaults to 'auto', which can be updated by the data. */
    min_source: PrimitiveAtom<ScaleSource>;
    /** Source of domain max. Defaults to 'auto', which can be updated by the data. */
    max_source: PrimitiveAtom<ScaleSource>;
}

export type ScaleEntry = SpatialScaleEntry | ContinuousScaleEntry | ColorScaleEntry;

/** Data provided by `<Figure>` to all child components. */
export interface FigureContextData<K extends string = string> {
    /** Resolved axis entries, keyed by the names passed to `Figure.scales`. */
    scales: Map<K, ScaleEntry>;
    /** Named data atoms passed to `Figure.data`. */
    data: DataMap;

    get_scale(key: K): ScaleEntry;
    /** Get a spatial scale entry by key. Throws with a useful message if missing or wrong type. */
    get_spatial_scale(key: K): SpatialScaleEntry;
    /** Get a continuous scale entry by key. Throws with a useful message if missing or wrong type. */
    get_continuous_scale(key: K): ContinuousScaleEntry;
    /** Get a color scale entry by key. Throws with a useful message if missing or wrong type. */
    get_color_scale(key: K): ColorScaleEntry;
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
