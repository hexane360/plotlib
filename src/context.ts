import React from 'react';
import { Axis } from './axis';
import { Transform1D } from './transform';
import { PrimitiveAtom } from 'jotai';

/** Data provided by `<Plot>` to all child components. */
export interface PlotContextData {
    /** Name of the active x-axis (a key in the enclosing `FigureContextData.axes`). */
    xaxis: string;
    /** Name of the active y-axis (a key in the enclosing `FigureContextData.axes`). */
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

/** Data provided by `<Figure>` to all child components. */
export interface FigureContextData<K> {
    /** Resolved axes, keyed by the names passed to `Figure.axes`. */
    axes: Map<K, Axis>;
    /** Per-axis zoom transform atoms, written by zoom interactions and read by axis and mark components. */
    transforms: Map<K, PrimitiveAtom<Transform1D>>;
    /** Allowed zoom scale factor range `[min, max]` applied to all child plots. */
    zoomExtent: [number, number];
}

/** React context supplying {@link FigureContextData} to components inside a `<Figure>`. */
export const FigureContext = React.createContext<FigureContextData<string> | null>(null);
