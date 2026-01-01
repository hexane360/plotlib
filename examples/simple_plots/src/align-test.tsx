import React from 'react';
import { useAtomValue } from 'jotai';

import { layout } from "plotlib";
import { TextBox } from "plotlib";

export function AlignTest(props: {width?: string, height?: string}) {
    return <layout.Constrained height={"50px"} width={"100%"}>
        <TextBox ha="center" va="center" fill="black">Test text</TextBox>
    </layout.Constrained>
}

export function Box(props: {}) {
    const parent = layout.useParent();
    if (!parent) throw new Error('Box must be placed in a LayoutContext');

    const [x, y, width, height] = layout.useVariables(['box-x', 'box-y', 'box-width', 'box-height']);

    layout.useConstraints(() => [
        new layout.Constraint(width.multiply(3.0), layout.Operator.Eq, parent.width),
        new layout.Constraint(height.multiply(3.0), layout.Operator.Eq, parent.height),
        new layout.Constraint(parent.x.plus(parent.width.divide(3.0)), layout.Operator.Eq, x),
        new layout.Constraint(parent.y.plus(parent.height.divide(3.0)), layout.Operator.Eq, y),
    ], []);

    const [currX, currY, currW, currH] = [x.atom, y.atom, width.atom, height.atom].map((v) => useAtomValue(v));
    console.log(`Box, w: ${currW}, h: ${currH}`);
    return <rect x={currX} y={currY} width={currW} height={currH} fill="red" />;
}