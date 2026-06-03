import React from 'react';
import { useAtomValue } from 'jotai';

import { FigureContext } from './context';
import { ProvideLayout } from './layout/context';
import * as layout from './layout';
import { useRemScale } from './layout/hooks';
import { makeId } from './utils';
import { CompoundStylesProps, useCompoundStyles, useProps } from './theme';
import Axis from './Axis';
import type { NumericScale } from './scale';

export interface ColorbarProps extends CompoundStylesProps<'root' | 'tick' | 'label'> {
    scale: string;
    shrink?: number;
    /** Width of the gradient bar. Defaults to `20`. */
    width?: layout.Length;
    /** Gap between the colorbar slot edge (adjacent to the plot) and the content. Defaults to `15`. */
    padding?: layout.Length;
    /** Number of gradient colour stops. Defaults to `20`. */
    nStops?: number;
    position?: 'left' | 'right' | 'top' | 'bottom';
}

interface ColorbarInnerProps {
    color_scale: NumericScale<unknown>;
    is_vertical: boolean;
    flip: boolean;
    position: 'left' | 'right' | 'top' | 'bottom';
    width?: layout.Length;
    bar_length: number;
    nStops: number;
}

function ColorbarInner({ color_scale, is_vertical, flip, position, width, bar_length, nStops }: ColorbarInnerProps) {
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
            bar_length, layout.Strength.strong,
        ),
    ], [is_vertical, parent, bar_length]);

    const [x, y, w, h, bar_width] = [
        parent.x, parent.y, parent.width, parent.height, width_expr
    ].map((v) => layout.useExprValue(v, [v]));

    const spatial_scale = color_scale.with_range(is_vertical ? [bar_length, 0] : [0, bar_length]);

    const gradId = React.useMemo(() => makeId('cb-grad'), []);
    const stops = React.useMemo(() =>
        Array.from({ length: nStops + 1 }, (_, i) => {
            const t = i / nStops;
            return <stop key={i} offset={`${t * 100}%`} stopColor={String(color_scale.interpolate!(t))} />;
        }),
        [color_scale, nStops],
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
                <Axis scale={spatial_scale} position={position} />
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
                <Axis scale={spatial_scale} position={position} />
            </ProvideLayout>
        </>;
    }
}

export default function Colorbar(props_: ColorbarProps) {
    const fig = React.useContext(FigureContext);
    if (!fig) throw new Error("Colorbar must be used inside a Figure");

    const props = useProps('Colorbar', props_, { shrink: 0.6, nStops: 20 } as const);

    const deco = React.useContext(layout.DecorationContext);
    const position = props.position || (deco?.position !== 'center' && deco?.position) || 'right';
    const is_vertical = position !== 'top' && position !== 'bottom';
    const flip = position === 'left' || position === 'top';

    const entry = fig.get_color_scale(props.scale);
    const color_scale = useAtomValue(entry.scale);
    const get_styles = useCompoundStyles('Colorbar', props_);

    const parent = layout.useParent();
    const outer_long = layout.useExprValue(
        is_vertical ? parent.height : parent.width,
        [is_vertical, parent],
    );
    const inner_long = outer_long * props.shrink;

    const p = props.padding ?? 15;
    const margin: { left: layout.Length; right: layout.Length; top: layout.Length; bottom: layout.Length } = {
        left: 0, right: 0, top: 0, bottom: 0,
    };
    if (is_vertical) margin[flip ? 'right' : 'left'] = p;
    else margin[flip ? 'bottom' : 'top'] = p;

    return <g {...get_styles('root')}>
        <layout.MarginBox {...margin}>
            <layout.Centered>
                <ColorbarInner
                    color_scale={color_scale}
                    is_vertical={is_vertical}
                    flip={flip}
                    position={position}
                    width={props.width}
                    bar_length={inner_long}
                    nStops={props.nStops}
                />
            </layout.Centered>
        </layout.MarginBox>
    </g>;
}
