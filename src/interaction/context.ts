import React from "react";
import { PrimitiveAtom, Atom } from 'jotai';
import { SpatialScaleEntry } from "../context";

export type InteractionMode = 'pan' | 'box-zoom';

export interface InteractionContextData {
    add_plot(
        ref: SVGGraphicsElement, xaxis: SpatialScaleEntry, yaxis: SpatialScaleEntry, fixed_aspect: boolean
    ): void;
    remove_plot(ref: SVGGraphicsElement): void;
    mode: PrimitiveAtom<InteractionMode>;
    zoom_in(): void;
    zoom_out(): void;
    reset_zoom(): void;
    /** Reset zoom, wait for the layout to settle, and download the figure as a self-contained SVG or rasterized PNG. */
    export_figure(kind: 'svg' | 'png'): Promise<void>;
}

export const InteractionContext = React.createContext<InteractionContextData | null>(null);