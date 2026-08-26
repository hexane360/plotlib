import React from 'react';
import * as kiwi from '@lume/kiwi';

import { ProvideLayout } from "./context";
import { as_expr } from "./expr";
import { useConstraints, useParent, useVariables } from "./hooks";


/**
 * Centers its children within the parent layout cell, with equal padding on each side.
 *
 * The padding is donated to children as free space (`x_space`/`y_space`), so a child which
 * sizes itself to its content can still see how much room it *could* have taken. This is what
 * lets a wrapping `FlexBox` hug its content and still reflow correctly.
 *
 * @param min - Minimum padding on each side in pixels. Defaults to `0`.
 * @param hug - Strength to hug with, constraining padding to `min`. Defaults to this cell's
 *   position on the hug ladder, which children outrank — so a child which hugs its own content
 *   still leaves the slack in the padding, and one which doesn't gets pushed out to fill the
 *   cell. Set to `0` to let the padding float instead.
 */
export function Centered(props: {
    children?: React.ReactNode,
    min?: number,
    hug?: number,
}) {
    const parent = useParent();
    const hug = props.hug ?? parent.hug;

    const [x_space, y_space, width, height] = useVariables([
        'centered-x-space', 'centered-y-space', 'centered-inner-width', 'centered-inner-height'
    ]);

    useConstraints(() => [
        new kiwi.Constraint(x_space, kiwi.Operator.Ge, props.min ?? 0.),
        new kiwi.Constraint(y_space, kiwi.Operator.Ge, props.min ?? 0.),
        new kiwi.Constraint(width.plus(x_space.multiply(2)), kiwi.Operator.Eq, parent.width),
        new kiwi.Constraint(height.plus(y_space.multiply(2)), kiwi.Operator.Eq, parent.height),
    ], [props.min, parent]);

    useConstraints(() => hug ? [
        new kiwi.Constraint(x_space, kiwi.Operator.Le, 0, hug),
        new kiwi.Constraint(y_space, kiwi.Operator.Le, 0, hug),
    ]: [], [hug]);

    return <ProvideLayout
        x={parent.x.plus(x_space)} y={parent.y.plus(y_space)}
        width={width} height={height}
        x_space={as_expr(parent.x_space).plus(x_space.multiply(2))}
        y_space={as_expr(parent.y_space).plus(y_space.multiply(2))}
        n_hugs={hug ? 1 : 0}
    >
        {props.children}
    </ProvideLayout>;
}


/**
 * Centers its children horizontally within the parent layout cell, with equal padding on each side.
 *
 * @param min - Minimum padding on each side in pixels. Defaults to `0`.
 * @param hug - Strength to hug with, constraining padding to 0. See {@link Centered}.
 */
export function CenteredX(props: {
    children?: React.ReactNode,
    min?: number,
    hug?: number,
}) {
    const parent = useParent();
    const hug = props.hug ?? parent.hug;

    const [x_space, width] = useVariables([
        'centered-x-space', 'centered-inner-width',
    ]);

    useConstraints(() => [
        new kiwi.Constraint(x_space, kiwi.Operator.Ge, props.min ?? 0.),
        new kiwi.Constraint(width.plus(x_space.multiply(2)), kiwi.Operator.Eq, parent.width),
    ], [props.min, parent]);

    useConstraints(() => hug ? [
        new kiwi.Constraint(x_space, kiwi.Operator.Le, 0, hug),
    ]: [], [hug]);

    return <ProvideLayout
        x={parent.x.plus(x_space)} y={parent.y}
        width={width} height={parent.height}
        x_space={as_expr(parent.x_space).plus(x_space.multiply(2))}
        y_space={parent.y_space}
        n_hugs={hug ? 1 : 0}
    >
        {props.children}
    </ProvideLayout>;
}

/**
 * Centers its children vertically within the parent layout cell, with equal padding on each side.
 *
 * @param min - Minimum padding on each side in pixels. Defaults to `0`.
 * @param hug - Strength to hug with, constraining padding to 0. See {@link Centered}.
 */
export function CenteredY(props: {
    children?: React.ReactNode,
    min?: number,
    hug?: number,
}) {
    const parent = useParent();
    const hug = props.hug ?? parent.hug;

    const [y_space, height] = useVariables([
        'centered-y-space', 'centered-inner-height',
    ]);

    useConstraints(() => [
        new kiwi.Constraint(y_space, kiwi.Operator.Ge, props.min ?? 0.),
        new kiwi.Constraint(height.plus(y_space.multiply(2)), kiwi.Operator.Eq, parent.height),
    ], [props.min, parent]);

    useConstraints(() => hug ? [
        new kiwi.Constraint(y_space, kiwi.Operator.Le, 0, hug),
    ]: [], [hug]);

    return <ProvideLayout
        x={parent.x} y={parent.y.plus(y_space)}
        width={parent.width} height={height}
        x_space={parent.x_space}
        y_space={as_expr(parent.y_space).plus(y_space.multiply(2))}
        n_hugs={hug ? 1 : 0}
    >
        {props.children}
    </ProvideLayout>;
}
