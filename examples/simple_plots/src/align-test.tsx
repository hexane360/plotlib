import React from 'react';
import { useAtomValue } from 'jotai';

import { layout } from "plotlib";
import { TextBox } from "plotlib";
import { LayoutContext } from '../../../dist/layout';

export function AlignTest(props: {width?: string, height?: string}) {
    //<Decorated.Left><Box width={30}/></Decorated.Left>
    //<Decorated.Top><Box height={30}/></Decorated.Top>

    return <layout.Constrained>
        <Decorated
            left={() => [<Box width={20} fill="red"/>, <Box width={20} fill="blue"/>]}
            bottom={() => <Box height={20} fill="blue"/>}
            top={() => <Box height={20} fill="blue"/>}
        >
            <Box width={100} height={100}/>
        </Decorated>
    </layout.Constrained>
}

export function Box(props: {width?: number, height?: number, fill?: string}) {
    const parent = layout.useParent();
    if (!parent) throw new Error('Box must be placed in a LayoutContext');

    const width = layout.as_variable(parent.width, 'box-width');
    const height = layout.as_variable(parent.height, 'box-height');
    const x = layout.as_variable(parent.x, 'box-x');
    const y = layout.as_variable(parent.y, 'box-y');

    layout.useConstraints(() => [
        (props.width ? [new layout.Constraint(width, layout.Operator.Eq, props.width)] : []),
        (props.height ? [new layout.Constraint(height, layout.Operator.Eq, props.height)] : []),
    ].flat(), [props.width, props.height]);

    const [currX, currY, currW, currH] = [x.atom, y.atom, width.atom, height.atom].map((v) => useAtomValue(v));
    console.log(`Box, w: ${currW}, h: ${currH} x: ${currX} y: ${currY}`);
    return <rect x={currX} y={currY} width={currW} height={currH} fill={props.fill ?? "red"} />;
}

function as_list<T>(val: T | ReadonlyArray<T>): ReadonlyArray<T> {
    if (val instanceof Array) return val;
    return [val];
}

export interface DecoratedProps {
    left?: () => React.ReactNode | ReadonlyArray<React.ReactNode>;
    right?: () => React.ReactNode | ReadonlyArray<React.ReactNode>;
    bottom?: () => React.ReactNode | ReadonlyArray<React.ReactNode>;
    top?: () => React.ReactNode | ReadonlyArray<React.ReactNode>;
    children: React.ReactNode
}

export function Decorated(props: DecoratedProps) {
    const parent = layout.useParent();

    const [left_decs, right_decs, top_decs, bottom_decs] = [
        props.left, props.right, props.top, props.bottom
    ].map((decs) => decs ? as_list(decs()) : []);
    const n_decs = left_decs.length + right_decs.length + top_decs.length + bottom_decs.length;
    const sizes = layout.useVariables(Array(n_decs).fill('dec-size'));

    let decorators = [];
    let constraints = [];
    let curr_x = parent.x;
    let curr_y = parent.y;
    let i = 0;
    const [width, height, x, y] = layout.useVariables(['inner-width', 'inner-height', 'inner-x', 'inner-y']);

    for (const dec of as_list((props.left ?? (() => []))())) {
        const context = {x: curr_x, y: y, width: sizes[i], height: height};
        decorators.push(<LayoutContext.Provider value={context}>{dec}</LayoutContext.Provider>);
        curr_x = curr_x.plus(sizes[i]);
        i++;
    }
    for (const dec of as_list((props.top ?? (() => []))())) {
        const context = {x: x, y: curr_y, width: width, height: sizes[i]};
        decorators.push(<LayoutContext.Provider value={context}>{dec}</LayoutContext.Provider>);
        curr_y = curr_y.plus(sizes[i]);
        i++;
    }

    constraints.push(
        new layout.Constraint(curr_x, layout.Operator.Eq, x),
        new layout.Constraint(curr_y, layout.Operator.Eq, y),
    );
    curr_x = curr_x.plus(width);
    curr_y = curr_y.plus(height);

    for (const dec of as_list((props.right ?? (() => []))())) {
        const context = {x: curr_x, y: y, width: sizes[i], height: height};
        decorators.push(<LayoutContext.Provider value={context}>{dec}</LayoutContext.Provider>);
        curr_x = curr_x.plus(sizes[i]);
        i++;
    }
    for (const dec of as_list((props.bottom ?? (() => []))())) {
        const context = {x: x, y: curr_y, width: width, height: sizes[i]};
        decorators.push(<LayoutContext.Provider value={context}>{dec}</LayoutContext.Provider>);
        curr_y = curr_y.plus(sizes[i]);
        i++;
    }

    constraints.push(new layout.Constraint(curr_x.minus(parent.x), layout.Operator.Eq, parent.width));
    constraints.push(new layout.Constraint(curr_y.minus(parent.y), layout.Operator.Eq, parent.height));
    layout.useConstraints(() => constraints, [props.left, props.right, props.bottom, props.top]);

    return <>
        {...decorators}
        <LayoutContext.Provider value={{width: width, height: height, x: x, y: y}}>
            {props.children}
        </LayoutContext.Provider>
    </>
}