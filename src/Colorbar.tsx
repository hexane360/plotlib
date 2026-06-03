import React from 'react';
import { useAtomValue } from 'jotai';

import { FigureContext } from './context';
import { ProvideLayout } from './layout/context';
import * as layout from './layout';
import { makeId } from './utils';
import { CompoundStylesProps, useCompoundStyles, useProps } from './theme';
import Axis from './Axis';

interface ColorbarProps extends CompoundStylesProps<'root' | 'tick' | 'label'> {
    scale: string;
    shrink?: number;
    position?: 'left' | 'right' | 'top' | 'bottom';
}

const GRAD_WIDTH = 20;
const N_STOPS = 20;

export default function Colorbar(props_: ColorbarProps) {
    const fig = React.useContext(FigureContext);
    if (!fig) throw new Error("Colorbar must be used inside a Figure");

    const props = useProps('Colorbar', props_, { shrink: 0.6 } as const);

    const deco = React.useContext(layout.DecorationContext);
    const position = props.position || (deco?.position !== 'center' && deco?.position) || 'right';
    const is_vertical = position !== 'top' && position !== 'bottom';
    const direction: 1 | -1 = (position === 'bottom' || position === 'right') ? 1 : -1;
    const flip = direction === -1;

    const entry = fig.get_color_scale(props.scale);
    const color_scale = useAtomValue(entry.scale);

    const parent = layout.useParent();
    const get_styles = useCompoundStyles('Colorbar', props_);

    const [inner_long, pad] = layout.useVariables(['cb-inner-long', 'cb-pad']);
    layout.useConstraints(() => {
        const outer_long = is_vertical ? parent.height : parent.width;
        return [
            new layout.Constraint(inner_long, layout.Operator.Eq, outer_long.multiply(props.shrink)),
            new layout.Constraint(pad.multiply(2).plus(inner_long), layout.Operator.Eq, outer_long),
        ];
    }, [is_vertical, parent, props.shrink]);

    const px = layout.useExprValue(parent.x, [parent.x]);
    const py = layout.useExprValue(parent.y, [parent.y]);
    const pw = layout.useExprValue(parent.width, [parent.width]);
    const ph = layout.useExprValue(parent.height, [parent.height]);
    const inner_long_v = layout.useExprValue(inner_long, [inner_long]);
    const pad_v = layout.useExprValue(pad, [pad]);

    const spatial_scale = color_scale.with_range(is_vertical ? [inner_long_v, 0] : [0, inner_long_v]);

    const gradId = React.useMemo(() => makeId('cb-grad'), []);
    const stops = React.useMemo(() =>
        Array.from({ length: N_STOPS + 1 }, (_, i) => {
            const t = i / N_STOPS;
            return <stop key={i} offset={`${t * 100}%`} stopColor={color_scale.interpolate!(t).toString()} />;
        }),
        [color_scale],
    );

    if (is_vertical) {
        const grad_x = flip ? px + pw - GRAD_WIDTH : px;
        const grad_y = py + pad_v;
        const axis_layout = {
            x: parent.x.plus(flip ? 0 : GRAD_WIDTH),
            y: parent.y.plus(pad),
            width: parent.width.minus(GRAD_WIDTH),
            height: inner_long,
        };
        return <g {...get_styles('root')}>
            <defs>
                <linearGradient id={gradId} x1="0" y1="1" x2="0" y2="0" gradientUnits="objectBoundingBox">
                    {stops}
                </linearGradient>
            </defs>
            <rect x={grad_x} y={grad_y} width={GRAD_WIDTH} height={inner_long_v} style={{ fill: `url(#${gradId})` }} />
            <ProvideLayout {...axis_layout}>
                <Axis scale={spatial_scale} position={position} />
            </ProvideLayout>
        </g>;
    } else {
        const grad_y = flip ? py + ph - GRAD_WIDTH : py;
        const grad_x = px + pad_v;
        const axis_layout = {
            x: parent.x.plus(pad),
            y: parent.y.plus(flip ? 0 : GRAD_WIDTH),
            width: inner_long,
            height: parent.height.minus(GRAD_WIDTH),
        };
        return <g {...get_styles('root')}>
            <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0" gradientUnits="objectBoundingBox">
                    {stops}
                </linearGradient>
            </defs>
            <rect x={grad_x} y={grad_y} width={inner_long_v} height={GRAD_WIDTH} style={{ fill: `url(#${gradId})` }} />
            <ProvideLayout {...axis_layout}>
                <Axis scale={spatial_scale} position={position} />
            </ProvideLayout>
        </g>;
    }
}
