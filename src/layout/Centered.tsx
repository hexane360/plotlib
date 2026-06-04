import React from 'react';
import * as kiwi from '@lume/kiwi';

import { ProvideLayout } from "./context";
import { useConstraints, useParent, useVariables } from "./hooks";


/**
 * Centers its children within the parent layout cell, with equal padding on each side.
 * @param min - Minimum padding on each side in pixels. Defaults to `0`.
 * @param hug - Strength to hug with, constraining space to 0.
 */
export function Centered(props: {
    children?: React.ReactNode,
    min?: number,
    hug?: number,
}) {
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

    useConstraints(() => props.hug ? [
        new kiwi.Constraint(x_space, kiwi.Operator.Le, 0, props.hug),
        new kiwi.Constraint(y_space, kiwi.Operator.Le, 0, props.hug),
    ]: [], [props.hug]);

    return <ProvideLayout
        x={parent.x.plus(x_space)} y={parent.y.plus(y_space)}
        width={width} height={height}
    >
        {props.children}
    </ProvideLayout>;
}


/**
 * Centers its children within the parent layout cell, with equal padding on each side.
 * @param min - Minimum padding on each side in pixels. Defaults to `0`.
 * @param hug - Strength to hug with, constraining space to 0.
 */
export function CenteredX(props: {
    children?: React.ReactNode,
    min?: number,
    hug?: number,
}) {
    const parent = useParent();

    const [x_space, width] = useVariables([
        'centered-x-space', 'centered-inner-width',
    ]);

    useConstraints(() => [
        new kiwi.Constraint(x_space, kiwi.Operator.Ge, props.min ?? 0.),
        new kiwi.Constraint(width.plus(x_space.multiply(2)), kiwi.Operator.Eq, parent.width),
    ], [props.min, parent]);

    useConstraints(() => props.hug ? [
        new kiwi.Constraint(x_space, kiwi.Operator.Le, 0, props.hug),
    ]: [], [props.hug]);

    return <ProvideLayout
        x={parent.x.plus(x_space)} y={parent.y}
        width={width} height={parent.height}
    >
        {props.children}
    </ProvideLayout>;
}

/**
 * Centers its children within the parent layout cell, with equal padding on each side.
 * @param min - Minimum padding on each side in pixels. Defaults to `0`.
 * @param hug - Strength to hug with, constraining space to 0.
 */
export function CenteredY(props: {
    children?: React.ReactNode,
    min?: number,
    hug?: number,
}) {
    const parent = useParent();

    const [y_space, height] = useVariables([
        'centered-y-space', 'centered-inner-height',
    ]);

    useConstraints(() => [
        new kiwi.Constraint(y_space, kiwi.Operator.Ge, props.min ?? 0.),
        new kiwi.Constraint(height.plus(y_space.multiply(2)), kiwi.Operator.Eq, parent.height),
    ], [props.min, parent]);

    useConstraints(() => props.hug ? [
        new kiwi.Constraint(y_space, kiwi.Operator.Le, 0, props.hug),
    ]: [], [props.hug]);

    return <ProvideLayout
        x={parent.x} y={parent.y.plus(y_space)}
        width={parent.width} height={height}
    >
        {props.children}
    </ProvideLayout>;
}