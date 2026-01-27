import React, { NamedExoticComponent } from 'react';

import { XAxis, YAxis } from './PlotAxis';
import { makeId, omit } from './utils';
import classes from "./styles.module.css";
import { FigureContext, FigureContextData, PlotContext, PlotContextData } from './context';
import { useStyles, CompoundStylesProps, useCompoundStyles, Styles } from './theme';
import * as layout from './layout';
import TextBox from './TextBox';
import { Zoomer } from './zoom';
import { GridContext } from './layout/context';

interface PlotProps extends CompoundStylesProps<'root' | 'box'> {
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

const Plot = React.memo(function Plot(props: PlotProps) {
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

    const getStyles = useCompoundStyles('Plot', props);

    const grid = React.useContext(GridContext) ?? undefined;

    const xaxis_pos = props.xaxis_pos ?? 'bottom';
    const yaxis_pos = props.yaxis_pos ?? 'left';

    const show_xaxis = props.show_xaxis ?? default_show_axis(xaxis.show, xaxis_pos == 'top', grid?.row, grid?.n_rows);
    const show_yaxis = props.show_yaxis ?? default_show_axis(yaxis.show, yaxis_pos == 'left', grid?.col, grid?.n_cols);

    let ctx: PlotContextData<string> = {
        xaxis: (typeof props.xaxis === "string") ? props.xaxis : xaxis,
        yaxis: (typeof props.yaxis === "string") ? props.yaxis : yaxis,
        fixedAspect: props.fixedAspect ?? false,

        xaxis_pos: xaxis_pos,
        yaxis_pos: yaxis_pos,
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

    let inner = <PlotInner {...getStyles('box')}>{props.children}</PlotInner>;
    if (props.zoom) inner = <Zoomer>{inner}</Zoomer>;

    return <PlotContext.Provider value={ctx}>
        <layout.Decorated {...decs} {...getStyles('root')}>
            {inner}
        </layout.Decorated>
    </PlotContext.Provider>;
});

const default_show_axis = (show: boolean | "one", start: boolean, idx?: number, n_idxs?: number): boolean => 
    (show === "one")
    ? (start ? idx == 0 : n_idxs !== undefined && idx == n_idxs - 1)
    : !!show;

interface PlotInnerProps extends Styles {
    ref?: React.RefObject<SVGGElement | null>,
    children?: React.ReactNode
};

function PlotInner(props: PlotInnerProps) {
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

    return <g {...omit(props, ['children'])} transform={`translate(${x},${y})`}>
        <rect x={0} y={0} width={width} height={height}/>
        {props.children}
    </g>;
}

function PlotClip({children}: {children?: React.ReactNode}) {
    const plot = React.useContext(PlotContext);
    if (!plot) throw new Error("Plot.Clip must be called from within a PlotContext");
    const clipId = React.useMemo(() => makeId("ax-clip"), []);

    const parent = layout.useParent();
    const [width, height] = [parent.width, parent.height].map((v) => layout.useExprValue(v, [v]));

    const styles = useCompoundStyles('Plot', {})('clip');
    return <>
        <clipPath id={clipId}><rect x={0} y={0} width={width} height={height}/></clipPath>
        <g {...styles} clipPath={`url(#${clipId})`}>
            { children }
        </g>
    </>
};

const PlotZoom = ({children}: {children?: React.ReactNode}) =>
    <g className={classes["zoom"]}>{children}</g>;

export default Object.assign(Plot, {
    Clip: PlotClip,
    Zoom: PlotZoom
});