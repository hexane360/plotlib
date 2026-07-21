import React from 'react';
import { ContinuousScaleEntry, FigureContext, LegendMarkComponent, PlotContext } from './context';
import { useAtomValue, useSetAtom } from 'jotai';
import { ContinuousScale } from './scale';


export function useRegisterLegend(
    get: () => {mark: LegendMarkComponent, label: string | undefined},
    deps: any[]
) {
    const plot = React.useContext(PlotContext);
    if (!plot) {
        throw new Error("Hook 'useRegisterLegend' must be used inside a 'Plot'");
    }

    const key = React.useId();
    const setLegends = useSetAtom(plot.legends);

    React.useLayoutEffect(() => {
        const {mark, label} = get();
        setLegends({type: 'set', value: [key, [mark, label]]});
        return () => setLegends({type: 'delete', value: key});
    }, [setLegends, ...deps]);
}

export function useLegends(): MapIterator<[LegendMarkComponent, string?]> {
    const plot = React.useContext(PlotContext);
    if (!plot) {
        throw new Error("Hook 'useLegends' must be used inside a 'Plot'");
    }

    return useAtomValue(plot.legends).values();
}

/** The active plot's continuous x/y axis entries, plus their resolved scales. */
export interface PlotScales {
    xaxis: ContinuousScaleEntry;
    yaxis: ContinuousScaleEntry;
    xscale: ContinuousScale;
    yscale: ContinuousScale;
}

/**
 * Resolve the enclosing `Plot`'s x/y axes to their `ContinuousScaleEntry`s and
 * current (reactive) scales. Shared by mark/widget components that need to map
 * between data and pixel coordinates (e.g. `PointWidget`).
 */
export function usePlotScales(): PlotScales {
    const fig = React.useContext(FigureContext);
    const plot = React.useContext(PlotContext);
    if (!fig || !plot) {
        throw new Error("Hook 'usePlotScales' must be used inside a 'Plot'");
    }

    const xaxis = fig.get_continuous_scale(plot.xaxis);
    const yaxis = fig.get_continuous_scale(plot.yaxis);
    const xscale = useAtomValue(xaxis.scale);
    const yscale = useAtomValue(yaxis.scale);

    return { xaxis, yaxis, xscale, yscale };
}