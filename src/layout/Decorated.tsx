import React from 'react';
import * as kiwi from '@lume/kiwi';

import { ProvideLayout } from "./context";
import { useConstraints, useParent, useVariables } from "./hooks";

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

export default function Decorated(props: DecoratedProps) {
    const parent = useParent();

    const [left_decs, right_decs, top_decs, bottom_decs] = [
        props.left, props.right, props.top, props.bottom
    ].map((decs) => decs ? as_list(decs()) : []);
    const n_decs = left_decs.length + right_decs.length + top_decs.length + bottom_decs.length;
    const sizes = useVariables(Array.from({ length: n_decs }, (_, i) => `dec-${i}-size`));

    let decorators = [];
    let constraints = sizes.map((v) => new kiwi.Constraint(v, kiwi.Operator.Ge, 0));
    let curr_x = parent.x;
    let curr_y = parent.y;
    let i = 0;
    const [width, height, x, y] = useVariables(['inner-width', 'inner-height', 'inner-x', 'inner-y']);

    for (const dec of left_decs) {
        decorators.push(
            <ProvideLayout key={i} x={curr_x} y={y} width={sizes[i]} height={height}>{dec}</ProvideLayout>
        );
        curr_x = curr_x.plus(sizes[i]);
        i++;
    }
    for (const dec of top_decs) {
        decorators.push(
            <ProvideLayout key={i} x={x} y={curr_y} width={width} height={sizes[i]}>{dec}</ProvideLayout>
        );
        curr_y = curr_y.plus(sizes[i]);
        i++;
    }

    constraints.push(
        new kiwi.Constraint(curr_x, kiwi.Operator.Eq, x),
        new kiwi.Constraint(curr_y, kiwi.Operator.Eq, y),
    );
    curr_x = curr_x.plus(width);
    curr_y = curr_y.plus(height);

    for (const dec of right_decs) {
        decorators.push(
            <ProvideLayout key={i} x={curr_x} y={y} width={sizes[i]} height={height}>{dec}</ProvideLayout>
        );
        curr_x = curr_x.plus(sizes[i]);
        i++;
    }
    for (const dec of bottom_decs) {
        decorators.push(
            <ProvideLayout key={i} x={x} y={curr_y} width={width} height={sizes[i]}>{dec}</ProvideLayout>
        );
        curr_y = curr_y.plus(sizes[i]);
        i++;
    }

    constraints.push(new kiwi.Constraint(curr_x.minus(parent.x), kiwi.Operator.Eq, parent.width));
    constraints.push(new kiwi.Constraint(curr_y.minus(parent.y), kiwi.Operator.Eq, parent.height));
    useConstraints(
        () => constraints,
        [parent, left_decs.length, right_decs.length, top_decs.length, bottom_decs.length]
    );

    return <>
        {...decorators}
        <ProvideLayout width={width} height={height} x={x} y={y}>{props.children}</ProvideLayout>
    </>
}