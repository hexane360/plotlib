import React from 'react';
import { Axis } from './axis';
import { Transform1D } from './transform';
import { PrimitiveAtom } from 'jotai';

export interface PlotContextData<K> {
    xaxis: K | Axis
    yaxis: K | Axis

    xaxis_pos: 'bottom' | 'top'
    yaxis_pos: 'left' | 'right'

    fixedAspect: boolean
    clipId: string
}

export const PlotContext = React.createContext<PlotContextData<string> | undefined>(undefined);

export interface FigureContextData<K> {
    axes: Map<K, Axis>
    transforms: Map<K, PrimitiveAtom<Transform1D>>

    zoomExtent: [number, number]
}

export const FigureContext = React.createContext<FigureContextData<string> | undefined>(undefined);