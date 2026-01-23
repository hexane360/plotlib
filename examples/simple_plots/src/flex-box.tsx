import React from 'react';

import { layout, TextBox } from "plotlib";
import { useAtomValue } from 'jotai';

export function Box(props: {
    width?: layout.Variable | number | layout.Expression, height?: layout.Variable | number | layout.Expression,
    fill?: string, children?: React.ReactNode, stroke?: string, strokeWidth?: string,
}) {
    const parent = layout.useParent();
    if (!parent) throw new Error('Box must be placed in a LayoutContext');

    const [width, height, x, y] = [parent.width, parent.height, parent.x, parent.y].map((e) => layout.useExprValue(e, [e]));

    layout.useConstraints(() => [
        (props.width ? [new layout.Constraint(parent.width, layout.Operator.Eq, props.width, layout.Strength.strong)] : []),
        (props.height ? [new layout.Constraint(parent.height, layout.Operator.Eq, props.height, layout.Strength.strong)] : []),
    ].flat(), [parent.width, parent.height, props.width, props.height]);

    //console.log(`Box, w: ${width}, h: ${height} x: ${x} y: ${y}`);
    return <>
        <rect x={x} y={y} width={width} height={height} fill={props.fill ?? "red"} stroke={props.stroke} strokeWidth={props.strokeWidth}/>
        {props.children}
    </>;
}

export function FlexBox(props: {}) {
    return <layout.Constrained width={"50%"}><FlexBoxInner/></layout.Constrained>
}

export function FlexBoxInner(props: {}) {
    return <Box fill="none" stroke="black">
        <layout.FlexBox
            flexDirection='row' justifyContent='space-evenly'
            wrap={true} alignItems='center'
            columnGap="1rem" rowGap="12pt"
        >
            <Box width={100} height={80}/>
            <Box width={100} height={80}/>
            <Box width={100} height={80}/>
            <Box width={100} height={80}/>
        </layout.FlexBox>
    </Box>
}


