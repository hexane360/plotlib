import React from 'react';

import { XAxis, YAxis } from './PlotAxis';
import { makeId } from './utils';
import classes from "./styles.module.css";
import { FigureContext, FigureContextData, PlotContext, PlotContextData } from './context';
import { useStyles, StylesProps } from './style';
import * as layout from './layout';
import { DecoratedProps } from './layout/Decorated';
import TextBox from './TextBox';
import { Zoomer } from './zoom';
import { GridContext } from './layout/context';

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
    zoom?: boolean

    show_xaxis?: boolean
    show_yaxis?: boolean

    xaxis_pos?: 'bottom' | 'top'
    yaxis_pos?: 'left' | 'right'

    children?: React.ReactNode
}

export const Plot = React.memo(function Plot(props: PlotProps) {
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

    const grid = React.useContext(GridContext) ?? undefined;

    const xaxis_pos = props.xaxis_pos ?? 'bottom';
    const yaxis_pos = props.yaxis_pos ?? 'left';

    const show_xaxis = props.show_xaxis ?? default_show_axis(xaxis.show, xaxis_pos == 'top', grid?.row, grid?.n_rows);
    const show_yaxis = props.show_yaxis ?? default_show_axis(yaxis.show, yaxis_pos == 'left', grid?.col, grid?.n_cols);
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

    const decs = React.useMemo(() => {
        let decs = {
            left: [] as React.ReactNode[], right: [] as React.ReactNode[],
            bottom: [] as React.ReactNode[], top: [] as React.ReactNode[],
        };
        if (show_yaxis) {
            if (yaxis_pos == 'left') {
                yaxis.label && decs.left.push(<TextBox key="label" rotation={-90}>{yaxis.label}</TextBox>);
                decs.left.push(<YAxis key="axis"/>)
            } else {
                decs.right.push(<YAxis key="axis"/>)
                yaxis.label && decs.right.push(<TextBox key="label" rotation={90}>{yaxis.label}</TextBox>);
            }
        }
        if (show_xaxis) {
            if (xaxis_pos == 'top') {
                xaxis.label && decs.top.push(<TextBox key="label">{xaxis.label}</TextBox>);
                decs.top.push(<XAxis key="axis"/>)
            } else {
                decs.bottom.push(<XAxis key="axis"/>)
                xaxis.label && decs.bottom.push(<TextBox key="label">{xaxis.label}</TextBox>);
            }
        }
        return decs;
    }, [show_xaxis, show_yaxis, xaxis_pos, yaxis_pos, xaxis.label, yaxis.label]);

    let inner = <PlotInner>{clippedChildren}</PlotInner>;
    if (props.zoom ?? true) {
        inner = <Zoomer>{inner}</Zoomer>;
    }

    return <PlotContext.Provider value={ctx}>
        <g>
            <layout.Decorated {...decs}>
                {inner}
            </layout.Decorated>
        </g>
    </PlotContext.Provider>;
});

const default_show_axis = (show: boolean | "one", start: boolean, idx?: number, n_idxs?: number): boolean => 
    (show === "one")
    ? (start ? idx == 0 : n_idxs !== undefined && idx == n_idxs - 1)
    : !!show;

interface PlotInnerProps { children?: React.ReactNode };

const PlotInner = React.forwardRef<SVGGElement, PlotInnerProps>(({children}, ref) => {
    const fig = React.useContext(FigureContext)!;
    const plot = React.useContext(PlotContext)!;

    const xaxis = (typeof plot.xaxis === "string") ? fig.axes.get(plot.xaxis)! : plot.xaxis;
    const yaxis = (typeof plot.yaxis === "string") ? fig.axes.get(plot.yaxis)! : plot.yaxis;

    const parent = layout.useParent();
    const [x, y, width, height] = [parent.x, parent.y, parent.width, parent.height].map((v) => layout.useExprValue(v, [v]));
    //const [x_scale, y_scale] = [xaxis.scale, yaxis.scale].map((v) => useAtomValue(v));

    layout.useConstraints(() => [
        new layout.Constraint(parent.width, layout.Operator.Eq, xaxis.size),
        new layout.Constraint(parent.height, layout.Operator.Eq, yaxis.size),
    ], [parent, xaxis, yaxis]);

    return <g ref={ref} className={classes["axis-cont"]} transform={`translate(${x},${y})`}>
        <clipPath id={plot.clipId}><rect x={0} y={0} width={width} height={height}/></clipPath>
        <rect className={classes["axis-box"]} width={width} height={height}/>
        <g className={classes["axis-clip"]} clipPath={`url(#${plot.clipId})`}>
            <g className={classes["zoom"]}>
                { children }
            </g>
        </g>
    </g>;
});

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