import React from 'react';
import { useAtomValue } from 'jotai';

import { XAxis, YAxis } from './PlotAxis';
import { makeId } from './utils';
import { FigureContext, PlotContext, PlotContextData } from './context';
import { CompoundStylesProps, useCompoundStyles, useProps, Styles, StylesProps } from './theme';
import * as layout from './layout';
import TextBox from './TextBox';
import { GridContext } from './layout/context';
import { usePlotInteraction } from './interaction/hooks';

interface PlotProps extends CompoundStylesProps<'root' | 'box' | 'xlabel' | 'ylabel'> {
    /** Name of the x-axis (must be a key in the enclosing `<Figure>`'s `scales` map). */
    xaxis?: string
    /** Name of the y-axis (must be a key in the enclosing `<Figure>`'s `scales` map). */
    yaxis?: string

    /** Enforce equal aspect ratio between x and y axes. Defaults to `false`. */
    fixedAspect?: boolean
    /** Enable pan/zoom interaction. Defaults to `false`. */
    zoom?: boolean

    /** Whether to render the x-axis decoration, or a factory returning a custom axis element. Defaults to the axis's `show` setting. */
    show_xaxis?: boolean | (() => React.ReactElement)
    /** Whether to render the y-axis decoration, or a factory returning a custom axis element. Defaults to the axis's `show` setting. */
    show_yaxis?: boolean | (() => React.ReactElement)

    /** Side on which to place the x-axis. Defaults to `'bottom'`. */
    xaxis_pos?: 'bottom' | 'top'
    /** Side on which to place the y-axis. Defaults to `'left'`. */
    yaxis_pos?: 'left' | 'right'

    children?: React.ReactNode
}

const Plot = React.memo(function Plot(props_: PlotProps) {
    const fig = React.useContext(FigureContext);
    const props = useProps('Plot', props_, {
        xaxis_pos: 'bottom',
        yaxis_pos: 'left',
        fixedAspect: false,
        zoom: false,
    } as const);
    if (!fig) {
        throw new Error("Component 'Plot' must be used inside a 'Figure'");
    }
    if (!props.xaxis || !props.yaxis) {
        throw new Error("Component 'Plot' must have xaxis and yaxis props defined.");
    }
    const grid = React.useContext(GridContext) ?? undefined;

    const xaxis = fig.get_spatial_scale(props.xaxis);
    const yaxis = fig.get_spatial_scale(props.yaxis);
    const xscale = useAtomValue(xaxis.scale);
    const yscale = useAtomValue(yaxis.scale);

    const get_styles = useCompoundStyles('Plot', props);

    const show_xaxis = props.show_xaxis ?? default_show_axis(xscale.show ?? true, props.xaxis_pos == 'top', grid?.row, grid?.n_rows);
    const show_yaxis = props.show_yaxis ?? default_show_axis(yscale.show ?? true, props.yaxis_pos == 'left', grid?.col, grid?.n_cols);

    let ctx: PlotContextData = {
        xaxis: props.xaxis,
        yaxis: props.yaxis,
        fixedAspect: props.fixedAspect,
        xaxis_pos: props.xaxis_pos, yaxis_pos: props.yaxis_pos,
    };

    const decs = React.useMemo(() => {
        let decs = {
            left: [] as React.ReactNode[], right: [] as React.ReactNode[],
            bottom: [] as React.ReactNode[], top: [] as React.ReactNode[],
        };
        if (show_yaxis) {
            const label = yscale.label && <TextBox key="label" rotation={-90} {...get_styles('ylabel')}>{yscale.label}</TextBox>;
            const axis = (typeof show_yaxis === 'function')
                ? React.cloneElement(show_yaxis(), {key: 'axis'})
                : <YAxis key="axis"/>;

            if (props.yaxis_pos == 'left') {
                yscale.label && decs.left.push(label);
                decs.left.push(axis);
            } else {
                decs.right.push(axis);
                yscale.label && decs.right.push(label);
            }
        }
        if (show_xaxis) {
            const label = xscale.label && <TextBox key="label" {...get_styles('xlabel')}>{xscale.label}</TextBox>;
            const axis = (typeof show_xaxis === 'function')
                ? React.cloneElement(show_xaxis(), {key: 'axis'})
                : <XAxis key="axis"/>;

            if (props.xaxis_pos == 'top') {
                xscale.label && decs.top.push(label);
                decs.top.push(axis);
            } else {
                decs.bottom.push(axis);
                xscale.label && decs.bottom.push(label);
            }
        }
        return decs;
    }, [show_xaxis, show_yaxis, props.xaxis_pos, props.yaxis_pos, xscale.label, yscale.label]);

    const inner = <PlotInner {...get_styles('box')} zoom={props.zoom}>{props.children}</PlotInner>;

    return <PlotContext.Provider value={ctx}>
        <layout.Decorated {...decs} {...get_styles('root')}>
            {inner}
        </layout.Decorated>
    </PlotContext.Provider>;
});

const default_show_axis = (show: boolean | "one", start: boolean, idx?: number, n_idxs?: number): boolean => 
    (show === "one")
    ? (start ? idx == 0 : n_idxs !== undefined && idx == n_idxs - 1)
    : !!show;

interface PlotInnerProps extends Styles {
    zoom?: boolean;
    children?: React.ReactNode
};

function PlotInner({ zoom, children, ...styleProps }: PlotInnerProps) {
    const fig = React.useContext(FigureContext)!;
    const plot = React.useContext(PlotContext)!;
    const xaxis = fig.get_spatial_scale(plot.xaxis);
    const yaxis = fig.get_spatial_scale(plot.yaxis);

    const elemRef = React.useRef<SVGGElement | null>(null);
    usePlotInteraction(elemRef, xaxis, yaxis, plot.fixedAspect, !!zoom);

    const parent = layout.useParent();
    const [x, y, width, height] = [parent.x, parent.y, parent.width, parent.height].map((v) => layout.useExprValue(v, [v]));

    layout.useConstraints(() => [
        new layout.Constraint(parent.width, layout.Operator.Eq, xaxis.size),
        new layout.Constraint(parent.height, layout.Operator.Eq, yaxis.size),
    ], [parent, xaxis, yaxis]);

    return <g ref={elemRef} {...styleProps} transform={`translate(${x},${y})`}>
        <rect x={0} y={0} width={width} height={height}/>
        {children}
        <g data-plotlib-decoration />
    </g>;
}

interface PlotClipProps extends StylesProps {
    children?: React.ReactNode
}

function PlotClip(props: PlotClipProps) {
    const plot = React.useContext(PlotContext);
    if (!plot) throw new Error("Plot.Clip must be called from within a PlotContext");
    const clipId = React.useMemo(() => makeId("ax-clip"), []);

    const parent = layout.useParent();
    const [width, height] = [parent.width, parent.height].map((v) => layout.useExprValue(v, [v]));

    const styles = useCompoundStyles('Plot', props)('clip');
    return <>
        <clipPath id={clipId}><rect x={0} y={0} width={width} height={height}/></clipPath>
        <g {...styles} clipPath={`url(#${clipId})`}>
            <g data-plotlib-zoom>
                { props.children }
            </g>
        </g>
    </>
};

export default Object.assign(Plot, {
    Clip: PlotClip,
});