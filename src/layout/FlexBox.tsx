import React from 'react';
import * as kiwi from '@lume/kiwi';

import { useVariables, useConstraints, useParent } from "./hooks";
import { AbsoluteLength } from './length';
import { expr_atom } from './utils';
import { LayoutContextData, ProvideLayout } from './context';
import { atomWithReducer } from 'jotai/utils';
import { atom, useStore } from 'jotai';

export type FlexDirection = 'row' | 'column';
export type JustifyContent = 'start' | 'center' | 'end' 
    | 'space-between' | 'space-around' | 'space-evenly';
export type AlignContent = JustifyContent;
export type AlignItems = 'start' | 'center' | 'end';

export interface FlexBoxProps {
    flexDirection?: FlexDirection;
    wrap?: boolean,

    // space items along main axis of each line
    justifyContent?: JustifyContent;
    // space lines in multi-line cross axis
    alignContent?: AlignContent;
    // align items in each line along cross axis
    alignItems?: AlignItems;

    /*
    // main-axis gap between items
    gap?: AbsoluteLength;
    // cross axis gap between items
    crossGap?: AbsoluteLength;
    */

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

function arrayEqual<T>(
    arr1: ReadonlyArray<T>, arr2: ReadonlyArray<T>
): boolean {
    if (arr1 === arr2) return true;
    if (arr1.length != arr2.length) return false;

    for (let i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i]) return false;
    }
    return true;
}

export default function FlexBox({
    /*gap = 0,
    crossGap = 0,*/
    flexDirection = 'row',
    wrap = false,
    justifyContent = 'center',
    alignContent = 'center',
    alignItems = 'center',
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
                    <FlexItem flexDirection={flexDirection} alignItems={alignItems}>{child}</FlexItem>
                </ProvideLayout>
            );
            main_pos = main_pos.plus(main_size);
            if (j < flex_row.length - 1) main_pos = main_pos.plus(item_gap);
            idx += 1;
        }

        if (!['end', 'space-between'].includes(justifyContent)) main_pos = main_pos.plus(main_gap);
        let line_end_gap = parent.main_size.plus(parent.main_pos).minus(main_pos);
        // if wrap, strength 0.1*weak
        if (wrap && flex_row.length > 1) {
            constraints.push(new kiwi.Constraint(line_end_gap, kiwi.Operator.Le, 0, kiwi.Strength.strong));
            // 0.1 * weak, we can accomodate this by wrapping instead
            constraints.push(new kiwi.Constraint(line_end_gap, kiwi.Operator.Ge, 0, kiwi.Strength.create(0.0, 0.0, 1.0, 0.1)));
        } else {
            constraints.push(new kiwi.Constraint(line_end_gap, kiwi.Operator.Eq, 0, kiwi.Strength.strong));
        }

        cross_pos = cross_pos.plus(cross_size);
        if (i < children_grid.length - 1) cross_pos = cross_pos.plus(row_gap);
    }

    if (!['end', 'space-between'].includes(alignContent)) cross_pos = cross_pos.plus(cross_gap);
    constraints.push(new kiwi.Constraint(cross_pos.minus(parent.cross_pos), kiwi.Operator.Eq, parent.cross_size, kiwi.Strength.strong));

    useConstraints(
        () => constraints,
        [parent.main_pos, parent.main_size, parent.cross_pos, parent.cross_size, justifyContent, alignContent, wrap_idxs, children_out.length]
    );

    const store = useStore();
    React.useLayoutEffect(() => {
        const parent_atom = expr_atom(parent.main_size);

        const wrap_idxs_atom = wrap ? atom((get) => {
            let idxs: Array<number> = [];
            const parent_size = get(parent_atom);
            let line_size = 0;
            for (const [i, size_var] of main_sizes.entries()) {
                const size = get(size_var.atom);
                line_size += size;
                if (line_size > parent_size) {
                    idxs.push(i);
                    line_size = size;
                }
            }
            return idxs;
        }) : atom((_) => []);
        return store.sub(wrap_idxs_atom, () => {
            const val = store.get(wrap_idxs_atom);
            if (!arrayEqual(val, wrap_idxs)) {
                set_wrap_idxs(val);
            }
        });
    }, [wrap, wrap_idxs, parent.main_size, ...main_sizes]);

    if (!wrap && wrap_idxs.length) {
        // forces an update, react will synchronously re-render this component
        set_wrap_idxs([]);
        return <></>;
    }

    return <g>
        {children_out}
    </g>;
}

function FlexItem({
    flexDirection, children, alignItems
}: {flexDirection: FlexDirection, alignItems: AlignItems, children?: React.ReactNode}) {
    const parent = deorient(flexDirection, useParent());
    const [innerSize, space] = useVariables(['flexitem-cross-size', 'flexitem-cross-space']);

    useConstraints(() => [
        new kiwi.Constraint(space, kiwi.Operator.Ge, 0.0),
        new kiwi.Constraint(innerSize.plus(space), kiwi.Operator.Eq, parent.cross_size),
    ], [innerSize, space, parent.cross_size]);

    let cross_pos;
    if (alignItems == 'start') {
        cross_pos = parent.cross_pos;
    } else if (alignItems == 'center') {
        cross_pos = parent.cross_pos.plus(space.divide(2.0));
    } else if (alignItems == 'end') {
        cross_pos = parent.cross_pos.plus(space);
    } else {
        throw new Error(`Invalid align-items value ${alignItems}. Expected 'start', 'center', or 'end'`);
    }

    const layout = orient(flexDirection, {
        main_pos: parent.main_pos, cross_pos,
        main_size: parent.main_size, cross_size: innerSize,
    });
    return <ProvideLayout {...layout}>
        {children}
    </ProvideLayout>
}