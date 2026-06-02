import React from "react";
import { useAtomValue } from "jotai/react";

import { FigureContext, PlotContext } from "./context";
import { useStyles, StylesProps } from "./theme";
import { omit } from "./utils";
import { DataRef, useData1D } from "./data";

interface PlotLineProps extends StylesProps, Omit<React.SVGProps<SVGPathElement>, 'className'> {
    /** X-coordinates in data space. */
    xs: DataRef
    /** Y-coordinates in data space. Must have the same length as `xs`. */
    ys: DataRef
}

export default function PlotLine(props: PlotLineProps) {
    const fig = React.useContext(FigureContext);
    const plot = React.useContext(PlotContext);
    if (!fig || !plot) {
        throw new Error("Component 'PlotLine' must be used inside a 'Plot'");
    }
    const styles = useStyles('PlotLine', props)
    let xs = useData1D(props.xs);
    let ys = useData1D(props.ys);

    const xaxis = fig.get_continuous_scale(plot.xaxis);
    const yaxis = fig.get_continuous_scale(plot.yaxis);

    if (xs.length != ys.length) {
        throw new Error("In component 'PlotLineProps': `xs` and `ys` must be the same length");
    }

    let x_scale = useAtomValue(xaxis.scale);
    let y_scale = useAtomValue(yaxis.scale);
    xs = x_scale.transform(xs, false);
    ys = y_scale.transform(ys, false);

    let path_elems: Array<string> = [];
    let drew_last = false;
    for (let i = 0; i < xs.length; i++) {
        const x = xs[i];
        const y = ys[i];
        if (!isFinite(x) || !isFinite(y)) {
            drew_last = false;
            continue
        }
        path_elems.push(
            drew_last ? `L ${x} ${y}` : `M ${x} ${y}`
        );
        drew_last = true;
    }

    // ensure single point is displayed
    if (path_elems.length == 1) {
        path_elems.push("z");
    }

    return <path d={path_elems.join(" ")} {...styles} {...omit(props, ['xs', 'ys', 'className', 'unstyled'])}/>;
}