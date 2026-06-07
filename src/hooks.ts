import React from 'react';
import { LegendMarkComponent, PlotContext } from './context';
import { useAtomValue, useSetAtom } from 'jotai';


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