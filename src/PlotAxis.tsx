import React, { useMemo } from 'react';
import { atom, useAtom, useAtomValue, Atom, PrimitiveAtom } from 'jotai';

import * as d3_format from 'd3-format';

import { FigureContext } from './Figure';
import { PlotContext } from './Plot';
import { Transform1D } from './transform';
import styles from "./styles.module.css";


interface AxisProps {
    label?: string | undefined
}

export function XAxis(props: AxisProps) {
    const fig = React.useContext(FigureContext);
    const plot = React.useContext(PlotContext);
    if (fig === undefined || plot == undefined) {
        throw new Error("Component 'XAxis' must be used inside a 'Plot'");
    }

    let xtransform = (typeof plot.xaxis === "string") ? useAtomValue(fig.transforms.get(plot.xaxis)!) : new Transform1D();
    let xaxis = (typeof plot.xaxis === "string") ? fig.axes.get(plot.xaxis)! : plot.xaxis;
    let yaxis = (typeof plot.yaxis === "string") ? fig.axes.get(plot.yaxis)! : plot.yaxis;

    let cross_pos = (plot.xaxis_pos == "top") ? 0.0 : 1.0;
    let sign = (plot.xaxis_pos == "top") ? -1.0 : 1.0;
    const className = (plot.xaxis_pos == "top") ? styles['top-axis'] : styles['bot-axis'];

    let fullScale = xaxis.scale;
    let scale = fullScale.applyTransform(xtransform);

    const labelOffset = xaxis.labelOffset ?? 50;

    let label: React.ReactElement | undefined = undefined;
    if (props.label) {
        label = <text className={styles["axis-label"]} transform={`translate(${scale.rangeFromUnit(0.5)}, ${sign * labelOffset})`}>
            {props.label}
        </text>;
    }

    // TODO factor some stuff out
    // TODO replace with path

    const fmt = d3_format.format(xaxis.tickFormat ?? "~g");
    const tickLength = xaxis.tickLength ?? 8;

    let ticks = scale.ticks(xaxis.ticks ?? 4).map((val) => {
        const text = fmt(val);
        const pos = scale.transform(val);
        return <g className={styles["tick"]} key={val}>
            <line x1={pos} x2={pos} y1={0} y2={sign * tickLength} stroke="inherit"/>
            <text x={pos} y={sign * tickLength} dy={`${sign*0.9}em`}>{text}</text>
        </g>;
    });

    let ax_ypos = yaxis.scale.rangeFromUnit(cross_pos);
    let [ax_start, ax_stop] = scale.range;
    return <g className={className} transform={`translate(0, ${ax_ypos})`}>
        <line x1={ax_start} x2={ax_stop} y1="0" y2="0" stroke="inherit"/>
        { ticks }
        { label }
    </g>;
}

export function YAxis(props: AxisProps) {
    const fig = React.useContext(FigureContext);
    const plot = React.useContext(PlotContext);
    if (fig === undefined || plot === undefined) {
        throw new Error("Component 'YAxis' must be used inside a 'Plot'");
    }

    let ytransform = (typeof plot.yaxis === "string") ? useAtomValue(fig.transforms.get(plot.yaxis)!) : new Transform1D();
    let xaxis = (typeof plot.xaxis === "string") ? fig.axes.get(plot.xaxis)! : plot.xaxis;
    let yaxis = (typeof plot.yaxis === "string") ? fig.axes.get(plot.yaxis)! : plot.yaxis;

    let cross_pos = (plot.yaxis_pos == "left") ? 0.0 : 1.0;
    let sign = (plot.yaxis_pos == "left") ? -1.0 : 1.0;
    const className = (plot.yaxis_pos == "left") ? styles['left-axis'] : styles['right-axis'];

    let fullScale = yaxis.scale;
    let scale = fullScale.applyTransform(ytransform);

    const labelOffset = yaxis.labelOffset ?? 90;

    let label: React.ReactElement | undefined = undefined;
    if (props.label) {
        label = <text className={styles["axis-label"]} transform={`translate(${sign * labelOffset}, ${scale.rangeFromUnit(0.5)}) rotate(${sign * -90})`}>
            {props.label}
        </text>;
    }

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

    let ax_xpos = xaxis.scale.rangeFromUnit(cross_pos);
    let [ax_start, ax_stop] = scale.range;
    return <g className={className} transform={`translate(${ax_xpos}, 0)`}>
        <line x1="0" x2="0" y1={ax_start} y2={ax_stop} stroke="inherit"/>
        { ticks }
        { label }
    </g>;
}