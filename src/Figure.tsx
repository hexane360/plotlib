import React, { useMemo } from 'react';
import { atom } from 'jotai';

import { Transform1D  } from './transform';
import { PlotScale, Pair } from './scale';
import { mapValues } from './utils';
import { AxisSpec, normalize_axis } from './axis';
import { FigureContext } from './context';
import Constrained from './layout/Constrained';
import * as layout from './layout';


interface FigureProps {
    axes: Map<string, AxisSpec>
    zoomExtent?: Pair
    width?: string
    height?: string
    margin?: layout.Length

    children?: React.ReactNode
}

export function Figure(props: FigureProps) {
    const margin = props.margin ?? "10px";

    return <Constrained width={props.width} height={props.height}>
        <layout.MarginBox left={margin} right={margin} top={margin} bottom={margin}>
            <FigureInner {...props}>
                {props.children}
            </FigureInner>
        </layout.MarginBox>
    </Constrained>;
}

function FigureInner({
    axes: inputAxes,
    zoomExtent = [1, Infinity],
    children,
}: FigureProps) {
    const parent = layout.useParent();

    const ax_keys = Array.from(inputAxes.keys());
    const ax_size_vars = layout.useVariables(ax_keys);
    const ax_sizes = ax_keys.map((k) => layout.parse_variable_length(inputAxes.get(k)!.size, parent.width));

    const size_vars = Array.from(new Set(ax_sizes.flatMap((s) => s instanceof Array ? [s[0]] : [])));
    const extra_vars = layout.useVariables(size_vars);
    const var_map = new Map(size_vars.map((v, i) => [v, extra_vars[i]]));

    const axes = useMemo(() => new Map(ax_keys.map((k, i) => [k, normalize_axis(inputAxes.get(k)!, ax_size_vars[i])])), [inputAxes]);
    const transforms = useMemo(() => mapValues(axes, () => atom(new Transform1D())), [axes]);

    layout.useConstraints(() => ax_sizes.map((size, i) =>
        new layout.Constraint(ax_size_vars[i], layout.Operator.Eq, size instanceof Array ? var_map.get(size[0])!.multiply(size[1]) : size)
    ), [inputAxes]);

    const context = useMemo(() => ({
        axes, transforms, zoomExtent
    }), [axes, transforms, zoomExtent]);

    return <FigureContext.Provider value={context}>
        {children}
    </FigureContext.Provider>;
}