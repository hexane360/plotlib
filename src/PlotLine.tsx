import React from "react";
import { useAtomValue } from "jotai/react";

import { FigureContext, PlotContext } from "./context";
import { useStyles, StylesProps } from "./theme";
import { omit } from "./utils";

interface PlotLineProps extends StylesProps, Omit<React.SVGProps<SVGPathElement>, 'className'> {
    /** X-coordinates in data space. */
    xs: Array<number>
    /** Y-coordinates in data space. Must have the same length as `xs`. */
    ys: Array<number>
}

export default function PlotLine(props: PlotLineProps) {
    const fig = React.useContext(FigureContext);
    const plot = React.useContext(PlotContext);
    if (!fig || !plot) {
        throw new Error("Component 'PlotLine' must be used inside a 'Plot'");
    }
    const styles = useStyles('PlotLine', props)
    const xaxis = fig.getContinuousAxis(plot.xaxis);
    const yaxis = fig.getContinuousAxis(plot.yaxis);

    if (props.xs.length != props.ys.length) {
        throw new Error("In component 'PlotLineProps': `xs` and `ys` must be the same length");
    }

    let x_scale = useAtomValue(xaxis.scale);
    let y_scale = useAtomValue(yaxis.scale);

    let path_elems: Array<string> = [];
    let drew_last = false;
    for (let i = 0; i < props.xs.length; i++) {
        const x = x_scale.transform(props.xs[i], false);
        const y = y_scale.transform(props.ys[i], false);
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