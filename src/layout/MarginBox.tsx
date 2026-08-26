import React from "react";
import * as kiwi from '@lume/kiwi';

import { useConstraints, useParent, useRemScale, useVariables } from "./hooks";
import { Length, parse_length } from "./length";
import { ProvideLayout } from "./context";
import { as_expr } from "./expr";

export interface MarginBoxProps {
    /** Space above the inner content. */
    top: Length
    /** Space below the inner content. */
    bottom: Length
    /** Space to the left of the inner content. */
    left: Length
    /** Space to the right of the inner content. */
    right: Length

    children?: React.ReactNode
};

export default function MarginBox(props: MarginBoxProps) {
    const parent = useParent();

    const rem_scale = useRemScale();
    const top = React.useMemo(() => as_expr(parse_length(props.top, parent.height, rem_scale)), [props.top, parent.height]);
    const bottom = React.useMemo(() => as_expr(parse_length(props.bottom, parent.height, rem_scale)), [props.bottom, parent.height]);
    const left = React.useMemo(() => as_expr(parse_length(props.left, parent.width, rem_scale)), [props.left, parent.width]);
    const right = React.useMemo(() => as_expr(parse_length(props.right, parent.width, rem_scale)), [props.right, parent.width]);

    const [x, y, width, height] = useVariables([
        'margin-inner-x', 'margin-inner-y', 'margin-inner-width', 'margin-inner-height'
    ]);

    useConstraints(() => [
        new kiwi.Constraint(parent.y.plus(top), kiwi.Operator.Eq, y),
        new kiwi.Constraint(parent.x.plus(left), kiwi.Operator.Eq, x),
        new kiwi.Constraint(top.plus(height).plus(bottom), kiwi.Operator.Eq, parent.height),
        new kiwi.Constraint(left.plus(width).plus(right), kiwi.Operator.Eq, parent.width),
    ], [parent.x, parent.y, parent.width, parent.height, top, bottom, left, right]);

    // margins are spent, not held: the free space we were given passes through unchanged
    return <ProvideLayout x={x} y={y} width={width} height={height} x_space={parent.x_space} y_space={parent.y_space}>
        {props.children}
    </ProvideLayout>
}