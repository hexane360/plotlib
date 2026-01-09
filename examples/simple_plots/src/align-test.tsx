import React from 'react';
import { useAtomValue } from 'jotai';

import { layout } from "plotlib";

export function AlignTest(props: {}) {
    return <layout.Constrained width={"50%"}><AlignTestInner/></layout.Constrained>
}

export function AlignTestInner(props: {}) {
    const parent = layout.useParent();

    return <layout.Centered><layout.Decorated
        left={() => [<Box width={20} fill="red"/>, <Box width={20} fill="blue"/>]}
        bottom={() => <Box height={20} fill="blue"/>}
        top={() => <Box height={20} fill="blue"/>}
    >
        <Box width={parent.width.multiply(0.5)} height={100}/>
    </layout.Decorated></layout.Centered>;
}

export function Box(props: {width?: layout.Variable | number | layout.Expression, height?: layout.Variable | number | layout.Expression, fill?: string}) {
    const parent = layout.useParent();
    if (!parent) throw new Error('Box must be placed in a LayoutContext');

    const [width, height, x, y] = [parent.width, parent.height, parent.x, parent.y].map((e) => layout.expr_atom(e));

    layout.useConstraints(() => [
        (props.width ? [new layout.Constraint(parent.width, layout.Operator.Eq, props.width)] : []),
        (props.height ? [new layout.Constraint(parent.height, layout.Operator.Eq, props.height)] : []),
    ].flat(), [props.width, props.height]);

    const [currX, currY, currW, currH] = [x, y, width, height].map((v) => useAtomValue(v));
    console.log(`Box, w: ${currW}, h: ${currH} x: ${currX} y: ${currY}`);
    return <rect x={currX} y={currY} width={currW} height={currH} fill={props.fill ?? "red"} />;
}
