import React from 'react';

import { ContinuousScale } from './scale';
import * as layout from './layout';
import { Decorated } from './layout';
import TextBox from './TextBox';
import { CompoundStylesProps, useCompoundStyles } from './theme';
import * as d3_format from 'd3-format';

export interface AxisProps extends CompoundStylesProps<'root' | 'tick' | 'label'> {
    scale: ContinuousScale;
    position: 'left' | 'right' | 'top' | 'bottom';
}

type GetStyles = (slot: 'root' | 'tick' | 'label') => object;

interface AxisLineProps {
    scale: ContinuousScale;
    position: 'left' | 'right' | 'top' | 'bottom';
    get_styles: GetStyles;
}

function AxisLine({ scale, position, get_styles }: AxisLineProps) {
    const parent = layout.useParent();

    const ref = React.useRef<SVGGElement | null>(null);
    const [mw, mh] = layout.useObserveSize(ref, { sticky: true });

    const is_vertical = position !== 'top' && position !== 'bottom';
    const direction: 1 | -1 = (position === 'bottom' || position === 'right') ? 1 : -1;

    layout.useConstraints(() => [
        new layout.Constraint(
            is_vertical ? parent.width : parent.height,
            layout.Operator.Ge,
            is_vertical ? mw : mh,
        ),
    ], [is_vertical, parent, mw, mh]);

    const px = layout.useExprValue(parent.x, [parent.x]);
    const py = layout.useExprValue(parent.y, [parent.y]);
    const pw = layout.useExprValue(parent.width, [parent.width]);
    const ph = layout.useExprValue(parent.height, [parent.height]);

    const tx = is_vertical ? (direction === 1 ? px : px + pw) : px;
    const ty = is_vertical ? py : (direction === 1 ? py : py + ph);

    const fmt = d3_format.format(scale.tickFormat ?? '~g');
    const tick_len = scale.tickLength ?? 8;
    const ticks = scale.ticks(scale.tickCount ?? 5).map(val => ({
        pos: scale.transform(val) as number,
        label: fmt(val),
    }));
    const [r0, r1] = scale.range;

    return <g ref={ref} {...get_styles('root')} data-pos={position} transform={`translate(${tx}, ${ty})`}>
        {is_vertical
            ? <line x1={0} x2={0} y1={r0} y2={r1} />
            : <line x1={r0} x2={r1} y1={0} y2={0} />
        }
        {ticks.map(({ pos, label }, index) =>
            <g key={index} {...get_styles('tick')} transform={is_vertical ? `translate(0,${pos})` : `translate(${pos},0)`}>
                {is_vertical ? <>
                    <line x1={0} x2={direction * tick_len} y1={0} y2={0} />
                    <text x={direction * (tick_len + 4)} dy="0.35em">{label}</text>
                </> : <>
                    <line x1={0} x2={0} y1={0} y2={direction * tick_len} />
                    <text y={direction * (tick_len + 4)} dy={direction === 1 ? '0.8em' : '-0.2em'}>{label}</text>
                </>}
            </g>
        )}
    </g>;
}

export default function Axis({ scale, position, ...styleProps }: AxisProps) {
    const get_styles = useCompoundStyles('Axis', styleProps);
    const is_vertical = position !== 'top' && position !== 'bottom';
    const direction: 1 | -1 = (position === 'bottom' || position === 'right') ? 1 : -1;

    const ticks = <AxisLine scale={scale} position={position} get_styles={get_styles} />;

    if (!scale.label) return ticks;

    const rotation = is_vertical ? (direction === 1 ? 90 : -90) : 0;
    const label = <TextBox {...get_styles('label')} rotation={rotation}>{scale.label}</TextBox>;

    if (position === 'right') return <Decorated right={label}>{ticks}</Decorated>;
    if (position === 'left') return <Decorated left={label}>{ticks}</Decorated>;
    if (position === 'bottom') return <Decorated bottom={label}>{ticks}</Decorated>;
    return <Decorated top={label}>{ticks}</Decorated>;
}
