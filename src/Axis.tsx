import React from 'react';

import { ContinuousScale } from './scale';
import * as layout from './layout';
import { Decorated } from './layout';
import TextBox from './TextBox';
import { CompoundStylesProps, useCompoundStyles } from './theme';
import * as d3_format from 'd3-format';

export type AxisPosition = 'left' | 'right' | 'top' | 'bottom';

export interface AxisBaseProps extends CompoundStylesProps<'root' | 'ticks' | 'label'> {
    position?: AxisPosition;
}

export interface AxisProps extends AxisBaseProps {
    scale: ContinuousScale;
}

interface AxisSpineProps extends AxisProps {
    get_styles: (slot: 'root' | 'ticks' | 'label') => object;
}

function AxisSpine({ scale, position, get_styles }: AxisSpineProps) {
    const parent = layout.useParent();
    const ref = React.useRef<SVGGElement | null>(null);
    const [inner_w, inner_h] = layout.useObserveSize(ref, { sticky: true });

    const is_vertical = position !== 'top' && position !== 'bottom';
    const direction: 1 | -1 = (position === 'bottom' || position === 'right') ? 1 : -1;

    layout.useConstraints(() => [
        new layout.Constraint(
            is_vertical ? parent.width : parent.height,
            layout.Operator.Ge,
            is_vertical ? inner_w : inner_h,
        ),
        // hug constraint
        new layout.Constraint(
            is_vertical ? parent.width : parent.height,
            layout.Operator.Le, 0, layout.Strength.weak,
        ),
    ], [is_vertical, parent, inner_w, inner_h]);

    const [x, y, w, h] = [
        parent.x, parent.y, parent.width, parent.height,
    ].map((v) => layout.useExprValue(v, [v]));

    const tx = position === 'left' ? x + w : x;
    const ty = position === 'top' ? y + h : y;

    const fmt = d3_format.format(scale.tickFormat ?? '~g');
    const tick_len = scale.tickLength ?? 8;
    const ticks = scale.ticks(scale.tickCount ?? 5).map(val => ({
        pos: scale.transform(val) as number,
        label: fmt(val),
    }));
    const [r0, r1] = scale.range;

    return <g ref={ref} {...get_styles('ticks')} transform={`translate(${tx}, ${ty})`}>
        {is_vertical
            ? <line x1={0} x2={0} y1={r0} y2={r1} />
            : <line x1={r0} x2={r1} y1={0} y2={0} />
        }
        {ticks.map(({ pos, label }, index) =>
            <g key={index} transform={is_vertical ? `translate(0,${pos})` : `translate(${pos},0)`}>
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

export default function Axis({ scale, position, ...props }: AxisProps) {
    const get_styles = useCompoundStyles('Axis', props);
    position ??= 'right';
    const is_vertical = position !== 'top' && position !== 'bottom';
    const direction: 1 | -1 = (position === 'bottom' || position === 'right') ? 1 : -1;

    const ticks = <AxisSpine scale={scale} position={position} get_styles={get_styles} />;

    if (!scale.label) return <g data-pos={position} {...get_styles('root')}>{ticks}</g>;

    const label = is_vertical
       ? <layout.CenteredY><TextBox {...get_styles('label')} rotation={direction * 90}>{scale.label}</TextBox></layout.CenteredY>
       : <layout.CenteredX><TextBox {...get_styles('label')} rotation={0}>{scale.label}</TextBox></layout.CenteredX>;
    return <Decorated data-pos={position} {...get_styles('root')} {...{[position]: label}}>{ticks}</Decorated>;
}
