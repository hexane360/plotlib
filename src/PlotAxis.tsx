import React from 'react';
import { useAtomValue } from 'jotai';

import * as d3_format from 'd3-format';

import { FigureContext, PlotContext } from './context';
import { Transform1D } from './transform';
import * as layout from './layout';
import styles from "./styles.module.css";

export function XAxis(props: {}) {
    const fig = React.useContext(FigureContext);
    const plot = React.useContext(PlotContext);
    if (fig === undefined || plot == undefined) {
        throw new Error("Component 'XAxis' must be used inside a 'Plot'");
    }

    const parent = layout.useParent();

    const ref = React.useRef<SVGGElement | null>(null);
    const [_width, height] = layout.useObserveSize(ref, {sticky: true});
    layout.useConstraints(() => [
        new layout.Constraint(parent.height, layout.Operator.Ge, height),
    ], [parent.height]);

    let xtransform = (typeof plot.xaxis === "string") ? useAtomValue(fig.transforms.get(plot.xaxis)!) : new Transform1D();
    let xaxis = (typeof plot.xaxis === "string") ? fig.axes.get(plot.xaxis)! : plot.xaxis;

    const ax_pos = [
        layout.useExprValue(parent.x, []),
        layout.useExprValue(plot.xaxis_pos == "top" ? parent.y.plus(parent.height) : parent.y, [plot.xaxis_pos]),
    ];
    let sign = (plot.xaxis_pos == "top") ? -1.0 : 1.0;
    const className = (plot.xaxis_pos == "top") ? styles['top-axis'] : styles['bot-axis'];

    let fullScale = useAtomValue(xaxis.scale);
    let scale = fullScale.applyTransform(xtransform);

    // TODO factor some stuff out
    // TODO replace with path

    const fmt = d3_format.format(xaxis.tickFormat ?? "~g");
    const tickLength = xaxis.tickLength ?? 8;

    let ticks = scale.ticks(xaxis.ticks ?? 4).map((val) => {
        const text = fmt(val);
        const pos = scale.transform(val);
        return <g className={styles["tick"]} key={val}>
            <line x1={pos} x2={pos} y1={0} y2={0 + sign * tickLength} stroke="inherit"/>
            <text x={pos} y={0 + sign * tickLength} dy={`${sign*0.9}em`}>{text}</text>
        </g>;
    });

    //let ax_ypos = useAtomValue(yaxis.scale).rangeFromUnit(cross_pos);
    let [ax_start, ax_stop] = scale.range;
    return <g ref={ref} className={className} transform={`translate(${ax_pos[0]}, ${ax_pos[1]})`}>
        <line x1={ax_start} x2={ax_stop} y1={0} y2={0} stroke="inherit"/>
        { ticks }
    </g>;
}

export function YAxis(props: {}) {
    const fig = React.useContext(FigureContext);
    const plot = React.useContext(PlotContext);
    if (fig === undefined || plot === undefined) {
        throw new Error("Component 'YAxis' must be used inside a 'Plot'");
    }
    const parent = layout.useParent();

    const ref = React.useRef<SVGGElement | null>(null);
    const [width, _height] = layout.useObserveSize(ref, {sticky: true});
    layout.useConstraints(() => [
        new layout.Constraint(parent.width, layout.Operator.Ge, width),
    ], [parent.width, width]);

    let ytransform = (typeof plot.yaxis === "string") ? useAtomValue(fig.transforms.get(plot.yaxis)!) : new Transform1D();
    let yaxis = (typeof plot.yaxis === "string") ? fig.axes.get(plot.yaxis)! : plot.yaxis;

    const ax_pos = [
        layout.useExprValue(plot.yaxis_pos == "left" ? parent.x.plus(parent.width) : parent.x, [plot.yaxis_pos]),
        layout.useExprValue(parent.y, []),
    ];
    let sign = (plot.yaxis_pos == "left") ? -1.0 : 1.0;
    const className = (plot.yaxis_pos == "left") ? styles['left-axis'] : styles['right-axis'];

    let fullScale = useAtomValue(yaxis.scale);
    let scale = fullScale.applyTransform(ytransform);

    const fmt = d3_format.format(yaxis.tickFormat ?? "~g");
    const tickLength = yaxis.tickLength ?? 8;

    let ticks = scale.ticks(yaxis.ticks ?? 4).map((val) => {
        const text = fmt(val);
        const pos = scale.transform(val);
        return <g className={styles["tick"]} key={val}>
            <line x1={sign * tickLength} x2={0} y1={pos} y2={pos} stroke="inherit"/>
            <text x={sign * tickLength} y={pos} dx={`${sign*0.3}em`} dy="0.4em">{text}</text>
        </g>;
    });

    let [ax_start, ax_stop] = scale.range;
    return <g ref={ref} className={className} transform={`translate(${ax_pos[0]}, ${ax_pos[1]})`}>
        <line x1="0" x2="0" y1={ax_start} y2={ax_stop} stroke="inherit"/>
        { ticks }
    </g>;
}