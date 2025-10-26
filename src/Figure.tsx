import React, { useMemo } from 'react';
import { atom, PrimitiveAtom } from 'jotai';

import { Transform1D  } from './transform';
import { PlotScale, Pair } from './scale';
import { mapValues } from './utils';
import { Axis, AxisSpec, normalize_axis } from './axis';

export interface FigureContextData<K> {
    axes: Map<K, Axis>
    transforms: Map<K, PrimitiveAtom<Transform1D>>

    zoomExtent: Pair
}

export const FigureContext = React.createContext<FigureContextData<string> | undefined>(undefined);

interface FigureProps {
    axes: Map<string, AxisSpec | PlotScale>
    zoomExtent?: Pair

    children?: React.ReactNode
}

export function Figure({
    axes: inputAxes,
    zoomExtent,
    children
}: FigureProps) {

    const axes = useMemo(() => mapValues(inputAxes, normalize_axis), [inputAxes]);
    const transforms = useMemo(() => mapValues(axes, () => atom(new Transform1D())), [axes]);

    //const currentRanges = useMemo(() => mapValues(scales, v => atom(v.range ?? null)), [scales]);

    return <FigureContext.Provider value={{
        axes,
        transforms,
        zoomExtent: zoomExtent || [1, Infinity],
    }}>
        {children}
    </FigureContext.Provider>;
}