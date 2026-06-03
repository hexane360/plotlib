import React from 'react';
import { useAtomValue } from 'jotai';

import { FigureContext } from './context';
import { ProvideLayout } from './layout/context';
import * as layout from './layout';
import { useRemScale } from './layout/hooks';
import { makeId } from './utils';
import { useCompoundStyles, useProps } from './theme';
import { default as Axis, AxisBaseProps, AxisPosition } from './Axis';
import type { NumericScale } from './scale';

export interface ColorbarProps extends AxisBaseProps {
    scale: string;
    shrink?: number;
    /** Width of the colorbar. Defaults to `20`. */
    width?: layout.Length;
    /** Gap between the colorbar slot edge (adjacent to the plot) and the content. Defaults to `15`. */
    padding?: layout.Length;
    /** Number of gradient colour stops. Defaults to `20`. */
    n_stops?: number;
}

export default function Colorbar(props_: ColorbarProps) {
    const fig = React.useContext(FigureContext);
    if (!fig) throw new Error("Colorbar must be used inside a Figure");

    const {shrink, padding, ...props} = useProps('Colorbar', props_, {
        shrink: 0.6, n_stops: 20, padding: 15, width: 20,
    } as const);
    const get_styles = useCompoundStyles('Colorbar', props);

    const deco = React.useContext(layout.DecorationContext);
    const position = props.position || (deco?.position !== 'center' && deco?.position) || 'right';
    const is_vertical = position !== 'top' && position !== 'bottom';
    const flip = position === 'left' || position === 'top';

    const entry = fig.get_color_scale(props.scale);
    const color_scale = useAtomValue(entry.scale);

    const parent = layout.useParent();
    const outer_long = layout.useExprValue(
        is_vertical ? parent.height : parent.width,
        [is_vertical, parent],
    );
    const inner_long = outer_long * shrink;
    const margin: { left: layout.Length; right: layout.Length; top: layout.Length; bottom: layout.Length } = {
        left: 0, right: 0, top: 0, bottom: 0,
    };
    const margin_pos = ({
        left: 'right', right: 'left', top: 'bottom', bottom: 'top'
    } as const)[position];
    margin[margin_pos] = padding;

    return <g {...get_styles('root')}>
        <layout.MarginBox {...margin}>
            <layout.Centered>
                <ColorbarInner
                    {...props}
                    scale={color_scale}
                    is_vertical={is_vertical}
                    flip={flip}
                    position={position}
                    bar_length={inner_long}
                />
            </layout.Centered>
        </layout.MarginBox>
    </g>;
}

interface ColorbarInnerProps extends AxisBaseProps {
    position: AxisPosition;
    scale: NumericScale<unknown>;
    is_vertical: boolean;
    flip: boolean;
    width: layout.Length;
    bar_length: number;
    n_stops: number;
}

function ColorbarInner({ scale, is_vertical, flip, position, width, bar_length, n_stops, ...styleProps }: ColorbarInnerProps) {
    const parent = layout.useParent();
    const rem_scale = useRemScale();

    const short_parent = is_vertical ? parent.width : parent.height;
    const width_expr = React.useMemo(
        () => layout.expr.as_expr(layout.parse_length(width ?? 20, short_parent, rem_scale)),
        [width, short_parent, rem_scale],
    );

    layout.useConstraints(() => [
        new layout.Constraint(
            is_vertical ? parent.height : parent.width,
            layout.Operator.Eq,
            bar_length, //layout.Strength.strong,
        ),
    ], [is_vertical, parent, bar_length]);

    const [x, y, w, h, bar_width] = [
        parent.x, parent.y, parent.width, parent.height, width_expr
    ].map((v) => layout.useExprValue(v, [v]));

    const spatial_scale = scale.with_range(is_vertical ? [bar_length, 0] : [0, bar_length]);

    const gradId = React.useMemo(() => makeId('cb-grad'), []);
    const stops = React.useMemo(() =>
        Array.from({ length: n_stops + 1 }, (_, i) => {
            const t = i / n_stops;
            return <stop key={i} offset={`${t * 100}%`} stopColor={String(scale.interpolate!(t))} />;
        }),
        [scale, n_stops],
    );

    if (is_vertical) {
        return <>
            <defs>
                <linearGradient id={gradId} x1="0" y1="1" x2="0" y2="0" gradientUnits="objectBoundingBox">
                    {stops}
                </linearGradient>
            </defs>
            <rect
                x={flip ? x + w - bar_width : x} y={y}
                width={bar_width} height={bar_length}
                style={{ fill: `url(#${gradId})` }}
            />
            <ProvideLayout
                x={flip ? parent.x : parent.x.plus(width_expr)}
                y={parent.y}
                width={parent.width.minus(width_expr)}
                height={parent.height}
            >
                <Axis scale={spatial_scale} position={position} {...styleProps} />
            </ProvideLayout>
        </>;
    } else {
        return <>
            <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0" gradientUnits="objectBoundingBox">
                    {stops}
                </linearGradient>
            </defs>
            <rect
                x={x} y={flip ? y + h - bar_width : y}
                width={bar_length} height={bar_width}
                style={{ fill: `url(#${gradId})` }}
            />
            <ProvideLayout
                x={parent.x}
                y={flip ? parent.y : parent.y.plus(width_expr)}
                width={parent.width}
                height={parent.height.minus(width_expr)}
            >
                <Axis scale={spatial_scale} position={position} {...styleProps} />
            </ProvideLayout>
        </>;
    }
}