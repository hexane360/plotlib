import React from 'react';
import { useAtomValue } from 'jotai';

import * as d3_format from 'd3-format';

import { FigureContext, PlotContext } from './context';
import * as layout from './layout';
import { useCompoundStyles, CompoundStylesProps } from './theme';

export function XAxis(props: CompoundStylesProps<'root' | 'tick'>) {
    const fig = React.useContext(FigureContext);
    const plot = React.useContext(PlotContext);
    if (!fig || !plot) {
        throw new Error("Component 'XAxis' must be used inside a 'Plot'");
    }

    const parent = layout.useParent();
    const is_top = plot.xaxis_pos == 'top';
    const get_styles = useCompoundStyles('XAxis', props);

    const ref = React.useRef<SVGGElement | null>(null);
    const [_width, height] = layout.useObserveSize(ref, {sticky: false});
    layout.useConstraints(() => [
        new layout.Constraint(parent.height, layout.Operator.Ge, height),
    ], [parent.height, height]);

    let xtransform = useAtomValue(fig.transforms.get(plot.xaxis)!);
    let xaxis = fig.axes.get(plot.xaxis)!;

    const ax_pos = [
        layout.useExprValue(parent.x, [parent.x]),
        layout.useExprValue(is_top ? parent.y.plus(parent.height) : parent.y, [plot.xaxis_pos, parent.y, parent.height]),
    ];
    let sign = is_top ? -1.0 : 1.0;

    let fullScale = useAtomValue(xaxis.scale);
    let scale = fullScale.apply_transform(xtransform);

    // TODO factor some stuff out
    // TODO replace with path

    const fmt = d3_format.format(xaxis.tickFormat ?? "~g");
    const tickLength = xaxis.tickLength ?? 8;

    let tick_styles = get_styles('tick');
    let ticks = scale.ticks(xaxis.ticks ?? 4).map((val) => {
        const text = fmt(val);
        const pos = scale.transform(val);
        return <g {...tick_styles} key={val}>
            <line x1={pos} x2={pos} y1={0} y2={0 + sign * tickLength} stroke="inherit"/>
            <text x={pos} y={0 + sign * tickLength} dy={`${sign*0.9}em`}>{text}</text>
        </g>;
    });

    //let ax_ypos = useAtomValue(yaxis.scale).rangeFromUnit(cross_pos);
    let [ax_start, ax_stop] = scale.range;
    return <g ref={ref} data-pos={plot.xaxis_pos} {...get_styles('root')}  transform={`translate(${ax_pos[0]}, ${ax_pos[1]})`}>
        <line x1={ax_start} x2={ax_stop} y1={0} y2={0} stroke="inherit"/>
        { ticks }
    </g>;
}

export function YAxis(props: CompoundStylesProps<'root' | 'tick'>) {
    const fig = React.useContext(FigureContext);
    const plot = React.useContext(PlotContext);
    if (!fig || !plot) {
        throw new Error("Component 'YAxis' must be used inside a 'Plot'");
    }
    const parent = layout.useParent();
    const is_left = plot.yaxis_pos == 'left';
    const get_styles = useCompoundStyles('YAxis', props);

    const ref = React.useRef<SVGGElement | null>(null);
    const [width, _height] = layout.useObserveSize(ref, {sticky: false});
    layout.useConstraints(() => [
        new layout.Constraint(parent.width, layout.Operator.Ge, width),
    ], [parent.width, width]);

    let ytransform = useAtomValue(fig.transforms.get(plot.yaxis)!);
    let yaxis = fig.axes.get(plot.yaxis)!;

    const ax_pos = [
        layout.useExprValue(is_left ? parent.x.plus(parent.width) : parent.x, [is_left, parent.x, parent.width]),
        layout.useExprValue(parent.y, [parent.y]),
    ];
    let sign = is_left ? -1.0 : 1.0;

    let fullScale = useAtomValue(yaxis.scale);
    let scale = fullScale.apply_transform(ytransform);

    const fmt = d3_format.format(yaxis.tickFormat ?? "~g");
    const tickLength = yaxis.tickLength ?? 8;

    let tick_styles = get_styles('tick');
    let ticks = scale.ticks(yaxis.ticks ?? 4).map((val) => {
        const text = fmt(val);
        const pos = scale.transform(val);
        return <g {...tick_styles} key={val}>
            <line x1={sign * tickLength} x2={0} y1={pos} y2={pos}/>
            <text x={sign * tickLength} y={pos} dx={`${sign*0.3}em`} dy="0.4em">{text}</text>
        </g>;
    });

    let [ax_start, ax_stop] = scale.range;
    return <g ref={ref} data-pos={plot.yaxis_pos} {...get_styles('root')} transform={`translate(${ax_pos[0]}, ${ax_pos[1]})`}>
        <line x1="0" x2="0" y1={ax_start} y2={ax_stop}/>
        { ticks }
    </g>;
}