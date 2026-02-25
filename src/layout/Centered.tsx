import React from 'react';
import * as kiwi from '@lume/kiwi';

import { ProvideLayout } from "./context";
import { useConstraints, useParent, useVariables } from "./hooks";


/**
 * Centers its children within the parent layout cell, with equal padding on each side.
 * @param min - Minimum padding on each side in pixels. Defaults to `0`.
 */
export default function Centered(props: {children?: React.ReactNode, min?: number}) {
    const parent = useParent();

    const [x_space, y_space, width, height] = useVariables([
        'centered-x-space', 'centered-y-space', 'centered-inner-width', 'centered-inner-height'
    ]);

    useConstraints(() => [
        new kiwi.Constraint(x_space, kiwi.Operator.Ge, props.min ?? 0.),
        new kiwi.Constraint(y_space, kiwi.Operator.Ge, props.min ?? 0.),
        new kiwi.Constraint(width.plus(x_space.multiply(2)), kiwi.Operator.Eq, parent.width),
        new kiwi.Constraint(height.plus(y_space.multiply(2)), kiwi.Operator.Eq, parent.height),
    ], [props.min, parent]);

    return <ProvideLayout
        x={parent.x.plus(x_space)} y={parent.y.plus(y_space)}
        width={width} height={height}
    >
        {props.children}
    </ProvideLayout>;
}