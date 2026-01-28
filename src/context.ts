import React from 'react';
import { Axis } from './axis';
import { Transform1D } from './transform';
import { PrimitiveAtom } from 'jotai';

export interface PlotContextData {
    xaxis: string
    yaxis: string

    xaxis_pos: 'bottom' | 'top'
    yaxis_pos: 'left' | 'right'

    fixedAspect: boolean
}

export const PlotContext = React.createContext<PlotContextData | null>(null);

export interface FigureContextData<K> {
    axes: Map<K, Axis>
    transforms: Map<K, PrimitiveAtom<Transform1D>>

    zoomExtent: [number, number]
}

export const FigureContext = React.createContext<FigureContextData<string> | null>(null);