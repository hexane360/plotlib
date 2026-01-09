import React from 'react';

import { Axis, AxisSpec, normalize_axis } from './axis';
import { XAxis, YAxis } from './PlotAxis';
import { makeId } from './utils';
import classes from "./styles.module.css";
import { FigureContext, FigureContextData, PlotContext, PlotContextData } from './context';
import { useStyles, StylesProps } from './style';
import { useAtomValue } from 'jotai/react';
import * as layout from './layout';

interface PlotProps extends StylesProps {
    xaxis?: string
    yaxis?: string

    fixedAspect?: boolean /* = false*/
    /*width: number
    height: number
    xDomain?: [number, number]
    yDomain?: [number, number]
    margins?: [number, number, number, number]
    */

    show_xaxis?: boolean
    show_yaxis?: boolean

    xaxis_pos?: 'bottom' | 'top'
    yaxis_pos?: 'left' | 'right'

    children?: React.ReactNode
}

export const Plot = React.memo(function Plot (props: PlotProps) {
    console.log("Redrawing Plot");

    const fig = React.useContext(FigureContext);
    if (fig === undefined) {
        throw new Error("Component 'Plot' must be used inside a 'Figure'");
    }

    if (!props.xaxis || !props.yaxis) {
        throw new Error("Component 'Plot' must have xaxis and yaxis props defined.");
    }

    let xaxis = fig.axes.get(props.xaxis);
    let yaxis = fig.axes.get(props.yaxis);
    if (!xaxis) throw new Error("Invalid xaxis passed to component 'Plot'");
    if (!yaxis) throw new Error("Invalid yaxis passed to component 'Plot'");

    const xaxis_pos = props.xaxis_pos ?? 'bottom';
    const yaxis_pos = props.yaxis_pos ?? 'left';

    const show_xaxis = props.show_xaxis ?? !!xaxis.show;
    const show_yaxis = props.show_yaxis ?? !!yaxis.show;
    let clippedChildren: React.ReactNode[] = [];
    let children: React.ReactNode[] = [];

    React.Children.forEach(props.children, child => {
        // TODO this is a huge hack
        if (child && typeof child === 'object' && 'type' in child) {
            if (typeof child.type === 'function' && child.type.name == "Scalebar") {
                children.push(child);
                return;
            }
        }
        clippedChildren.push(child);
    });

    const clipId = React.useMemo(() => makeId("ax-clip"), []);

    let ctx: PlotContextData<string> = {
        xaxis: (typeof props.xaxis === "string") ? props.xaxis : xaxis,
        yaxis: (typeof props.yaxis === "string") ? props.yaxis : yaxis,
        fixedAspect: props.fixedAspect ?? false,

        xaxis_pos: xaxis_pos,
        yaxis_pos: yaxis_pos,
        clipId: clipId,
    };

    return <layout.Centered min={30}>
        <PlotContext.Provider value={ctx}>
            <layout.Decorated
                left={() => show_yaxis && yaxis_pos == 'left' ? [<YAxis label={yaxis.label} key="yaxis"/>] : []}
                right={() => show_yaxis && yaxis_pos == 'right' ? [<YAxis label={yaxis.label} key="yaxis"/>] : []}
                bottom={() => show_xaxis && xaxis_pos == 'bottom' ? [<XAxis label={xaxis.label} key="xaxis"/>] : []}
                top={() => show_xaxis && xaxis_pos == 'top' ? [<XAxis label={xaxis.label} key="xaxis"/>] : []}
            >
                <PlotInner>{clippedChildren}</PlotInner>
            </layout.Decorated>
        </PlotContext.Provider>
    </layout.Centered>;
});

function PlotInner({children}: {children?: React.ReactNode}) {
    const fig = React.useContext(FigureContext)!;
    const plot = React.useContext(PlotContext)!;

    const xaxis = (typeof plot.xaxis === "string") ? fig.axes.get(plot.xaxis)! : plot.xaxis;
    const yaxis = (typeof plot.yaxis === "string") ? fig.axes.get(plot.yaxis)! : plot.yaxis;

    const parent = layout.useParent();
    const [x, y, width, height] = [parent.x, parent.y, parent.width, parent.height].map((v) => layout.useExprValue(v, [v]));
    const [x_scale, y_scale] = [xaxis.scale, yaxis.scale].map((v) => useAtomValue(v));

    layout.useConstraints(() => [
        new layout.Constraint(parent.width, layout.Operator.Eq, xaxis.size),
        new layout.Constraint(parent.height, layout.Operator.Eq, yaxis.size),
    ], [parent, xaxis, yaxis]);

    return <g className={classes["axis-cont"]} transform={`translate(${x},${y})`}>
        <clipPath id={plot.clipId}><rect x={0} y={0} width={width} height={height}/></clipPath>
        <rect className={classes["axis-box"]} width={width} height={height}/>
        <g className={classes["axis-clip"]} clipPath={`url(#${plot.clipId})`}>
            <g className={classes["zoom"]}>
                { children }
            </g>
        </g>
    </g>;
}

/*
function calc_axis_size(
    axis: Axis,
    pos: 'bottom' | 'top' | 'left' | 'right',
): number {
    // todo be smarter here
    if (['bottom', 'top'].includes(pos)) {
        return 60;
    }
    return 150;
}

interface PlotDims {
    width: number
    height: number
    totalWidth: number
    totalHeight: number
    viewBox: [number, number, number, number]
}

function calc_plot_dims(
    fig: FigureContextData<string>,
    xaxis: Axis, yaxis: Axis,
    show_xaxis: boolean, show_yaxis: boolean,
    xaxis_pos: 'bottom' | 'top', yaxis_pos: 'left' | 'right',
    margins?: [number, number, number, number]
): PlotDims {
    let [xscale, yscale] = [xaxis.scale, yaxis.scale].map((v) => useAtomValue(v));

    const [width, height] = [xscale.rangeSize(), yscale.rangeSize()];

    let marginTop: number, marginRight: number, marginBottom: number, marginLeft: number;

    if (margins) {
        [marginTop, marginRight, marginBottom, marginLeft] = margins;
    } else {
        [marginTop, marginRight, marginBottom, marginLeft] = [15, 15, 15, 15];
        if (show_xaxis) {
            const axis_size = calc_axis_size(xaxis, xaxis_pos);
            if (xaxis_pos == 'bottom')
                marginBottom += axis_size;
            else
                marginTop += axis_size;
        }
        if (show_yaxis) {
            const axis_size = calc_axis_size(yaxis, yaxis_pos);
            if (yaxis_pos == 'left')
                marginLeft += axis_size;
            else
                marginRight += axis_size;
        }
    }

    const totalWidth = width + marginLeft + marginRight;
    const totalHeight = height + marginBottom + marginTop; 
    const viewBox: [number, number, number, number] = [-marginLeft, -marginTop, totalWidth, totalHeight];

    return {
        width: width, height: height,
        totalWidth: totalWidth, totalHeight: totalHeight,
        viewBox: viewBox,
    }
}
*/