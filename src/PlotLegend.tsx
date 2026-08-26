import React from "react";

import { CompoundStylesProps, useProps, useCompoundStyles, Styles } from "./theme";
import { FigureContext, PlotContext, LegendMarkComponent } from "./context";
import * as layout from "./layout";
import { useRemScale } from "./layout/hooks";
import { useLegends } from "./hooks";
import TextBox from "./TextBox";
import styles from "./PlotLegend.module.css";

type VertLocation = 'upper' | 'lower' | 'center';
type HorzLocation = 'left' | 'right' | 'center';
export type Location = `${VertLocation} ${HorzLocation}`;

interface PlotLegendProps extends CompoundStylesProps<'root' | 'box' | 'label'> {
    location?: Location
    /** Margin between legend and plot edge (default `10px`) */
    margin?: layout.Length
    /** Padding between legend box and contents (default `10px`) */
    padding?: layout.Length
    /** Width of each entry's mark (default `20px`) */
    markWidth?: layout.Length
    /** Height of each entry's mark (default `5px`) */
    markHeight?: layout.Length
    /** Gap between entry rows (default `10px`) */
    rowGap?: layout.Length
    /** Gap between a mark and its label (default `10px`) */
    columnGap?: layout.Length
}

export default function PlotLegend(props_: PlotLegendProps) {
    const fig = React.useContext(FigureContext);
    const plot = React.useContext(PlotContext);
    if (!fig || !plot) {
        throw new Error("Component 'PlotLegend' must be used inside a 'Plot'");
    }

    const {
        location, padding, markWidth, markHeight, rowGap, columnGap, ...props
    } = useProps('PlotLegend', props_, {
        location: 'upper right',
        margin: 10,
        padding: 10,
        markWidth: 20,
        markHeight: 5,
        rowGap: 10,
        columnGap: 10,
    } as const);
    const getStyles = useCompoundStyles('PlotLegend', props, styles);

    const parent = layout.useParent();

    const [width, height] = layout.useVariables(['legend-width', 'legend-height']);
    layout.useConstraints(() => [
        new layout.Constraint(width, layout.Operator.Ge, 0),
        new layout.Constraint(height, layout.Operator.Ge, 0),
    ], []);

    const rem_scale = useRemScale();
    const margin = layout.parse_length(props.margin, parent.width, rem_scale);
    const mark_width = layout.parse_length(markWidth, parent.width, rem_scale);
    const mark_height = layout.parse_length(markHeight, parent.height, rem_scale);
    const [x, y] = align(parent, width, height, margin, location);

    // filter blank legends
    const legends = useLegends().filter((v) => v[1]).toArray() as [LegendMarkComponent, string][];

    return <g {...getStyles('root')}>
        {/*
          * No free space is forwarded: the legend is an overlay pinned to a corner by `align`,
          * so the plot's slack isn't room it can expand into — growing would overlap the plot
          * rather than consume space. It sizes purely to its own content.
          */}
        <layout.ProvideLayout x={x} y={y} width={width} height={height} x_space={0} y_space={0}>
            <LegendBox {...getStyles('box')}/>
            <layout.MarginBox left={padding} right={padding} top={padding} bottom={padding}>
                <layout.Grid n_cols={2} columnGap={columnGap} rowGap={rowGap}>
                    {...legends.flatMap(([mark, label]) => [
                        <LegendMark mark={mark} width={mark_width} height={mark_height}/>,
                        <TextBox {...getStyles('label')}>{label}</TextBox>
                    ])}
                </layout.Grid>
            </layout.MarginBox>
        </layout.ProvideLayout>
    </g>
}


function LegendBox(props: Partial<Styles>) {
    const parent = layout.useParent();
    const [x, y, width, height] = [
        parent.x, parent.y, parent.width, parent.height
    ].map((e) => layout.useExprValue(e, [e]));

    return <rect {...props} x={x} y={y} width={width} height={height} />;
}


interface LegendMarkProps {
    mark: LegendMarkComponent
    width: number | layout.Expression
    height: number | layout.Expression
}

function LegendMark({mark, width, height}: LegendMarkProps) {
    const parent = layout.useParent();

    layout.useConstraints(() => [
        new layout.Constraint(parent.width, layout.Operator.Eq, width),
        new layout.Constraint(parent.height, layout.Operator.Eq, height),
    ], [parent.width, parent.height, width, height]);

    return mark({});
}


function align(
    parent: layout.LayoutContextData,
    width: layout.Variable | layout.Expression,
    height: layout.Variable | layout.Expression,
    margin: layout.Expression | number,
    location: Location,
): [layout.Expression, layout.Expression] {
    let x = undefined, y = undefined;

    let [vert_loc, horz_loc] = location.toLowerCase().split(' ');

    y = (vert_loc == 'upper') ? parent.y.plus(margin) :
        (vert_loc == 'center') ? parent.y.plus(parent.height.minus(height).divide(2.0)) :
        (vert_loc == 'lower') ? parent.y.plus(parent.height).minus(height).minus(margin) : undefined;

    x = (horz_loc == 'left') ? parent.x.plus(margin) :
        (horz_loc == 'center') ? parent.x.plus(parent.width.minus(width).divide(2.0)) :
        (horz_loc == 'right') ? parent.x.plus(parent.width).minus(width).minus(margin) : undefined;

    if (x === undefined || y === undefined) {
        throw new Error(`Invalid location '${location}'. Expected a location like 'upper right', 'lower center', 'center left', etc.`);
    }

    return [x, y];
}