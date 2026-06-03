import React from 'react';
import * as kiwi from '@lume/kiwi';

import { ProvideLayout } from "./context";
import { useConstraints, useParent, useVariables, useExprValue } from "./hooks";
import { omit } from "../utils";

/**
 * Props for {@link Decorated}.
 * Decorator elements surround the content contained in `children`.
 */
export interface DecoratedProps extends React.SVGAttributes<SVGGElement> {
    /** Decoration(s) placed to the left of the central children. */
    left?: React.ReactNode | ReadonlyArray<React.ReactNode>;
    /** Decoration(s) placed to the right of the central children. */
    right?: React.ReactNode | ReadonlyArray<React.ReactNode>;
    /** Decoration(s) placed below the central children. */
    bottom?: React.ReactNode | ReadonlyArray<React.ReactNode>;
    /** Decoration(s) placed above the central children. */
    top?: React.ReactNode | ReadonlyArray<React.ReactNode>;
    /** The central content, given the remaining space after decorations are sized. */
    children: React.ReactNode
}

export default function Decorated(props: DecoratedProps) {
    const parent = useParent();

    const [left_decs, right_decs, top_decs, bottom_decs] = [
        props.left, props.right, props.top, props.bottom
    ].map((decs) => decs ? (decs instanceof Array ? decs : [decs]) : []);
    const n_decs = left_decs.length + right_decs.length + top_decs.length + bottom_decs.length;
    const sizes = useVariables(Array.from({ length: n_decs }, (_, i) => `dec-${i}-size`));

    let decos = [];
    let constraints = sizes.map((v) => new kiwi.Constraint(v, kiwi.Operator.Ge, 0));
    let curr_x = parent.x;
    let curr_y = parent.y;
    let i = 0;
    const [width, height, x, y] = useVariables(['inner-width', 'inner-height', 'inner-x', 'inner-y']);

    for (const dec of left_decs) {
        decos.push(
            <ProvideLayout key={i} x={curr_x} y={y} width={sizes[i]} height={height}>{dec}</ProvideLayout>
        );
        curr_x = curr_x.plus(sizes[i]);
        i++;
    }
    for (const dec of top_decs) {
        decos.push(
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
        decos.push(
            <ProvideLayout key={i} x={curr_x} y={y} width={sizes[i]} height={height}>{dec}</ProvideLayout>
        );
        curr_x = curr_x.plus(sizes[i]);
        i++;
    }
    for (const dec of bottom_decs) {
        decos.push(
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
    const current = {
        x: useExprValue(parent.x, [parent.x]),
        y: useExprValue(parent.y, [parent.y]),
        width: useExprValue(parent.width, [parent.width]),
        height: useExprValue(parent.height, [parent.height]),
    };

    return <g {...omit(props, ['left', 'right', 'bottom', 'top', 'children'])}>
        <rect {...current}/>
        <ProvideLayout width={width} height={height} x={x} y={y}>{props.children}</ProvideLayout>
        {...decos}
    </g>
}