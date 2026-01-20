import React from 'react';
import * as kiwi from '@lume/kiwi';

import { useVariables, useConstraints, useParent } from "./hooks";
import { AbsoluteLength } from './length';
import { expr_atom } from './utils';
import { LayoutContextData, ProvideLayout } from './context';

export type FlexDirection = 'row' | 'column';
// used to space along main axis
export type JustifyContent = 'start' | 'center' | 'end' 
    | 'space-between' | 'space-around' | 'space-evenly';
// used to space rows of multi-line cross axis
export type AlignContent = JustifyContent;
// used to align cross axis of each row
export type AlignItems = 'start' | 'center' | 'end';

export interface FlexBoxProps {
    flexDirection?: FlexDirection;
    wrap?: boolean,

    justifyContent?: JustifyContent;
    alignContent?: AlignContent;

    // main-axis gap between items
    gap?: AbsoluteLength;

    // cross axis gap between items
    crossGap?: AbsoluteLength;

    children?: React.ReactNode;
}

function orient<T, U>(
    direction: FlexDirection, {main_pos, cross_pos, main_size, cross_size}: {main_pos: T, cross_pos: T, main_size: U, cross_size: U},
): {x: T, y: T, width: U, height: U} {
    return direction == 'row'
        ? {x: main_pos, y: cross_pos, width: main_size, height: cross_size}
        : {y: main_pos, x: cross_pos, height: main_size, width: cross_size};
}

function deorient<T, U>(
    direction: FlexDirection, {x, y, width, height}: {x: T, y: T, width: U, height: U},
): {main_pos: T, cross_pos: T, main_size: U, cross_size: U} {
    return direction == 'row'
        ? {main_pos: x, cross_pos: y, main_size: width, cross_size: height}
        : {main_pos: y, cross_pos: x, main_size: height, cross_size: width};
}

export default function FlexBox({
    gap = 0,
    crossGap = 0,
    flexDirection = 'row',
    wrap = false,
    justifyContent = 'center',
    alignContent = 'center',
    children
}: FlexBoxProps) {
    const parent = deorient(flexDirection, useParent());
    const [wrap_idxs, set_wrap_idxs] = React.useState<readonly number[]>([]);

    //const child_array = React.Children.toArray(children);
    let children_out: Array<React.ReactNode> = [];
    let children_grid: Array<Array<React.ReactNode>> = [[]];
    let wrap_idx_i: number = 0;

    React.Children.forEach(children, (child, idx) => {
        if (idx === wrap_idxs[wrap_idx_i]) {
            // wrap before this element
            children_grid.push([]);
            wrap_idx_i += 1;
        }
        children_grid.at(-1)?.push(child);
    });

    // TODO: cleanup
    /*let parent_main = flexDirection == 'row' ? parent.x : parent.y;
    let parent_main_size = flexDirection == 'row' ? parent.width : parent.height;
    let parent_cross = flexDirection == 'row' ? parent.y : parent.x;
    let parent_cross_size = flexDirection == 'row' ? parent.height : parent.width;*/

    const [cross_gap] = useVariables(['flex-cross-gap']);
    const main_gaps = useVariables(Array.from({ length: children_grid.length }, (_, i) => `flex-main-gap-${i}`));
    const cross_sizes = useVariables(Array.from({ length: children_grid.length }, (_, i) => `flex-cross-size-${i}`));
    const main_sizes = useVariables(Array.from({ length: React.Children.count(children) }, (_, i) => `flex-main-size-${i}`));

    let constraints = [cross_gap, ...main_gaps].map((gap) => new kiwi.Constraint(gap, kiwi.Operator.Ge, 0.0));

    let cross_pos = parent.cross_pos;
    if (!['start', 'space-between'].includes(alignContent)) cross_pos = cross_pos.plus(cross_gap);

    const row_gap: kiwi.Expression | kiwi.Variable = ({
        'space-around': cross_gap.multiply(2.0),
        'space-between': cross_gap,
        'space-evenly': cross_gap,
    } as any)[alignContent] ?? new kiwi.Expression(0.0);

    let idx = 0;
    for (const [i, flex_row] of children_grid.entries()) {
        const cross_size = cross_sizes[i];
        const main_gap = main_gaps[i];

        let main_pos = parent.main_pos;
        if (!['start', 'space-between'].includes(justifyContent)) main_pos = main_pos.plus(main_gap);

        const item_gap: kiwi.Expression | kiwi.Variable = ({
            'space-around': main_gap.multiply(2.0),
            'space-between': main_gap,
            'space-evenly': main_gap,
        } as any)[justifyContent] ?? new kiwi.Expression(0.0);

        for (const [j, child] of flex_row.entries()) {
            const main_size = main_sizes[idx];

            let layout = flexDirection == 'row'
                ? {x: main_pos, y: cross_pos, width: main_size, height: cross_size}
                : {y: main_pos, x: cross_pos, height: main_size, width: cross_size};
            children_out.push(
                <ProvideLayout {...layout} key={idx}>
                    <FlexItem flexDirection={flexDirection}>{child}</FlexItem>
                </ProvideLayout>
            );
            main_pos = main_pos.plus(main_size);
            if (j < flex_row.length - 1) main_pos = main_pos.plus(item_gap);
            idx += 1;
        }

        if (!['end', 'space-between'].includes(justifyContent)) main_pos = main_pos.plus(main_gap);
        constraints.push(new kiwi.Constraint(main_pos.minus(parent.main_pos), kiwi.Operator.Eq, parent.main_size, kiwi.Strength.medium));

        cross_pos = cross_pos.plus(cross_size);
        if (i < children_grid.length - 1) cross_pos = cross_pos.plus(row_gap);
    }

    if (!['end', 'space-between'].includes(alignContent)) cross_pos = cross_pos.plus(cross_gap);
    constraints.push(new kiwi.Constraint(cross_pos.minus(parent.cross_pos), kiwi.Operator.Eq, parent.cross_size, kiwi.Strength.medium));

    useConstraints(
        () => constraints,
        [parent.main_pos, parent.main_size, parent.cross_pos, parent.cross_size, justifyContent, alignContent, wrap_idxs, children_out.length]
    );

    if (!wrap && wrap_idxs.length) {
        // forces an update, react will synchronously re-render this component
        set_wrap_idxs([]);
        return <></>;
    }

    function layout() {
        for (const solverVar of [...main_sizes, ...cross_sizes, ...main_gaps, cross_gap]) {
            console.log(`${solverVar.name()}: ${solverVar.value()}`);
        }
    }

    React.useLayoutEffect(layout, []);

    return <g>
        {children_out}
    </g>;
}

function FlexItem({
    flexDirection, children
}: {flexDirection: FlexDirection, children?: React.ReactNode}) {
    const parent = deorient(flexDirection, useParent());
    const [innerSize, space] = useVariables(['flexitem-cross-size', 'flexitem-cross-space']);

    useConstraints(() => [
        new kiwi.Constraint(space, kiwi.Operator.Ge, 0.0),
        new kiwi.Constraint(innerSize.plus(space.multiply(2)), kiwi.Operator.Eq, parent.cross_size),
    ], [innerSize, space, parent.cross_size]);

    const layout = orient(flexDirection, {
        main_pos: parent.main_pos, cross_pos: parent.cross_pos.plus(space),
        main_size: parent.main_size, cross_size: innerSize,
    });
    return <ProvideLayout {...layout}>
        {children}
    </ProvideLayout>
}