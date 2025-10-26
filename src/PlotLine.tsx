import React from "react";

import { FigureContext } from "./Figure";
import { PlotContext } from "./Plot";
import styles from "./styles.module.css";


interface PlotLineProps extends React.SVGProps<SVGPathElement> {
    xs: Array<number>
    ys: Array<number>
}

export function PlotLine(props: PlotLineProps) {
    const fig = React.useContext(FigureContext);
    const plot = React.useContext(PlotContext);
    if (fig === undefined || plot === undefined) {
        throw new Error("Component 'PlotLineProps' must be used inside a 'Plot'");
    }

    let xaxis = (typeof plot.xaxis === "string") ? fig.axes.get(plot.xaxis)! : plot.xaxis;
    let yaxis = (typeof plot.yaxis === "string") ? fig.axes.get(plot.yaxis)! : plot.yaxis;

    if (props.xs.length != props.ys.length) {
        throw new Error("In component 'PlotLineProps': `xs` and `ys` must be the same length");
    }

    let path_elems: Array<string> = [];
    let drew_last = false;
    for (let i = 0; i < props.xs.length; i++) {
        const x = xaxis.scale.transform(props.xs[i], false);
        const y = yaxis.scale.transform(props.ys[i], false);
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

    const { xs, ys, ...rest } = props;

    const svgProps: React.SVGProps<SVGPathElement> = {
        fill: "none",
        ...(rest as React.SVGProps<SVGPathElement>),
    };

    return <path d={path_elems.join(" ")} className={styles["plot-line"]} {...svgProps}/>;
}