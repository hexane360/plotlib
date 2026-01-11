import React from 'react';

import { layout, TextBox } from "plotlib";

export function AlignTest(props: {}) {
    return <layout.Constrained width={"50%"}><AlignTestInner/></layout.Constrained>
}

export function AlignTestInner(props: {}) {
    const parent = layout.useParent();

    const [currX, currY, currW, currH] = [parent.x, parent.y, parent.width, parent.height].map((v) => layout.useExprValue(v, []));

    const [rotation, updateRotation] = React.useReducer((rot) => rot + 10, 0);

    React.useEffect(() => {
        const timer = setInterval(() => updateRotation(), 1000);
        return () => { clearInterval(timer); }
    }, []);

    return <>
        <rect x={currX} y={currY} width={currW} height={currH} stroke="black" fill="none"/>
        <TextBox rotation={rotation}><tspan x="0">Test long text</tspan><tspan x="0" dy="1.2em">Multiline</tspan></TextBox>
    </>
}

/*
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
*/
