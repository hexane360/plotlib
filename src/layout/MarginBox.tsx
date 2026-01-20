import React from "react";
import * as kiwi from '@lume/kiwi';

import { useConstraints, useParent, useVariables } from "./hooks";
import { Length, parse_length } from "./length";
import { ProvideLayout } from "./context";

export interface MarginBoxProps {
    top: Length
    bottom: Length
    left: Length
    right: Length

    children?: React.ReactNode
};

export default function MarginBox(props: MarginBoxProps) {
    const parent = useParent();

    const top = React.useMemo(() => parse_length(props.top, parent.height), [props.top, parent.height]);
    const bottom = React.useMemo(() => parse_length(props.bottom, parent.height), [props.bottom, parent.height]);
    const left = React.useMemo(() => parse_length(props.left, parent.width), [props.left, parent.width]);
    const right = React.useMemo(() => parse_length(props.right, parent.width), [props.right, parent.width]);

    const [x, y, width, height] = useVariables([
        'margin-inner-x', 'margin-inner-y', 'margin-inner-width', 'margin-inner-height'
    ]);

    useConstraints(() => [
        new kiwi.Constraint(parent.y.plus(top), kiwi.Operator.Eq, y),
        new kiwi.Constraint(parent.x.plus(left), kiwi.Operator.Eq, x),
        new kiwi.Constraint(top.plus(height).plus(bottom), kiwi.Operator.Eq, parent.height),
        new kiwi.Constraint(left.plus(width).plus(right), kiwi.Operator.Eq, parent.width),
    ], [parent.x, parent.y, parent.width, parent.height, top, bottom, left, right]);

    return <ProvideLayout x={x} y={y} width={width} height={height}>
        {props.children}
    </ProvideLayout>
}