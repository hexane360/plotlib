import React from 'react';
import { useAtomValue } from 'jotai';

import * as layout from './layout';
import { FigureContext, PlotContext } from './context';
import { useProps } from './theme';
import { default as Axis, AxisBaseProps } from './Axis';

export interface SpatialAxisProps extends AxisBaseProps { }

export default function SpatialAxis(props_: SpatialAxisProps) {
    const fig = React.useContext(FigureContext);
    const plot = React.useContext(PlotContext);
    if (!fig || !plot) throw new Error("SpatialAxis must be used inside a Plot");

    const props = useProps('SpatialAxis', props_, { } as const);

    const deco = React.useContext(layout.DecorationContext);
    const position = props.position || (deco?.position !== 'center' && deco?.position) || 'right';

    const axis_key = (position !== 'top' && position !== 'bottom') ? plot.yaxis : plot.xaxis;
    const entry = fig.get_continuous_scale(axis_key);
    const transform = useAtomValue(entry.transform);
    const full_scale = useAtomValue(entry.scale);
    const scale = full_scale.apply_transform(transform);

    return <Axis {...props} scale={scale} position={position} />;
}
