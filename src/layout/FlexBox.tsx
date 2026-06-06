import React from 'react';
import * as kiwi from '@lume/kiwi';

import { useVariables, useConstraints, useParent, useRemScale } from "./hooks";
import { Length, parse_length } from './length';
import { expr_atom } from './expr';
import { ProvideLayout, ProvideGrid } from './context';
import { Atom, atom, SetStateAction, useStore } from 'jotai';
import type { AlignContent, AlignItems, FlexDirection, JustifyContent } from './types';
import { useProps } from '../theme';
export type { AlignContent, AlignItems, FlexDirection, JustifyContent } from './types';

function atomWithDebounce<T>(
    inputAtom: Atom<T>,
    initialValue: T,
    delayMilliseconds = 500,
    store?: ReturnType<typeof useStore> | undefined,
) {
    const prevTimeoutAtom = atom<ReturnType<typeof setTimeout> | undefined>(undefined);
    const _currentValueAtom = atom(initialValue);
    const isDebouncingAtom = atom(false);

    const debouncedValueAtom = atom(
        initialValue,
        (get, set, update: SetStateAction<T>) => {
            clearTimeout(get(prevTimeoutAtom));
            const prevValue = get(_currentValueAtom);
            const nextValue = typeof update === 'function'
                ? (update as (prev: T) => T)(prevValue)
                : update;
            set(_currentValueAtom, nextValue);
            set(isDebouncingAtom, true);
            const nextTimeoutId = setTimeout(() => {
                set(debouncedValueAtom, nextValue);
                set(isDebouncingAtom, false);
            }, delayMilliseconds);
            set(prevTimeoutAtom, nextTimeoutId);
        },
    );

    if (!store) store = useStore();
    store.sub(inputAtom, () => store!.set(debouncedValueAtom, store!.get(inputAtom)));

    return debouncedValueAtom;
}

export interface FlexBoxProps {
    /** Layout direction. Defaults to `'row'`. */
    flexDirection?: FlexDirection;
    /** Whether children wrap onto new lines when they overflow the main axis. Defaults to `false`. */
    wrap?: boolean,

    /** How to distribute space between items along the main axis of each line. Defaults to `'center'`. */
    justifyContent?: JustifyContent;
    /** How to distribute space between lines along the cross axis (multi-line layouts). Defaults to `'center'`. */
    alignContent?: AlignContent;
    /** How to align items within each line along the cross axis. Defaults to `'center'`. */
    alignItems?: AlignItems;

    /** Gap between rows. Defaults to `0`. */
    rowGap?: Length;
    /** Gap between columns. Defaults to `0`. */
    columnGap?: Length;

    /** Strength to hug main spacing with. Defaults to `layout.Strength.weak`. Set to 0 to disable. */
    mainHug?: number;
    /** Strength to hug cross spacing with. Defaults to `layout.Strength.weak`. Set to 0 to disable. */
    crossHug?: number;

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

export default function FlexBox({children, ...props_}: FlexBoxProps) {
    const {
        flexDirection, wrap, justifyContent,
        alignContent, alignItems,
        rowGap, columnGap, mainHug, crossHug,
    } = useProps('FlexBox', props_, {
        flexDirection: 'row',
        wrap: false,
        justifyContent: 'center',
        alignContent: 'center',
        alignItems: 'center',
        rowGap: 0, columnGap: 0,
        mainHug: kiwi.Strength.weak,
        crossHug: kiwi.Strength.weak,
    } as const);

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

    const [cross_space] = useVariables(['flex-cross-gap']);
    const main_spaces = useVariables(Array.from({ length: children_grid.length }, (_, i) => `flex-main-gap-${i}`));
    const cross_sizes = useVariables(Array.from({ length: children_grid.length }, (_, i) => `flex-cross-size-${i}`));
    const main_sizes = useVariables(Array.from({ length: React.Children.count(children) }, (_, i) => `flex-main-size-${i}`));

    const rem_scale = useRemScale();
    let main_gap = React.useMemo(() => parse_length(
        flexDirection == 'row' ? columnGap : rowGap,
        parent.main_size, rem_scale
    ), [flexDirection, rowGap, columnGap, parent.main_size]);
    let cross_gap = React.useMemo(() => parse_length(
        flexDirection == 'row' ? rowGap : columnGap,
        parent.cross_size, rem_scale
    ), [flexDirection, rowGap, columnGap, parent.cross_size]);

    let constraints = [cross_space, ...main_spaces].map((space) => new kiwi.Constraint(space, kiwi.Operator.Ge, 0.0));

    let cross_pos = parent.cross_pos;
    if (!['start', 'space-between'].includes(alignContent)) cross_pos = cross_pos.plus(cross_space);

    const line_space: kiwi.Expression | kiwi.Variable = (({
        'space-around': cross_space.multiply(2.0),
        'space-between': cross_space,
        'space-evenly': cross_space,
    } as any)[alignContent] ?? new kiwi.Expression(0.0)).plus(cross_gap);

    let idx = 0;
    for (const [i, flex_row] of children_grid.entries()) {
        const cross_size = cross_sizes[i];
        const main_space = main_spaces[i];

        let main_pos = parent.main_pos;
        if (!['start', 'space-between'].includes(justifyContent)) main_pos = main_pos.plus(main_space);

        const item_space: kiwi.Expression | kiwi.Variable = (({
            'space-around': main_space.multiply(2.0),
            'space-between': main_space,
            'space-evenly': main_space,
        } as any)[justifyContent] ?? new kiwi.Expression(0.0)).plus(main_gap);

        for (const [j, child] of flex_row.entries()) {
            const main_size = main_sizes[idx];

            const grid = flexDirection == 'row'
                ? {row: i, col: j, n_rows: children_grid.length, n_cols: flex_row.length}
                : {col: i, row: j, n_cols: children_grid.length, n_rows: flex_row.length};
            const layout = flexDirection == 'row'
                ? {x: main_pos, y: cross_pos, width: main_size, height: cross_size}
                : {y: main_pos, x: cross_pos, height: main_size, width: cross_size};
            children_out.push(
                <ProvideGrid {...grid} key={idx}>
                    <ProvideLayout {...layout}>
                        <FlexItem flexDirection={flexDirection} alignItems={alignItems}>{child}</FlexItem>
                    </ProvideLayout>
                </ProvideGrid>
            );
            main_pos = main_pos.plus(main_size);
            if (j < flex_row.length - 1) main_pos = main_pos.plus(item_space);
            idx += 1;
        }

        if (!['end', 'space-between'].includes(justifyContent)) main_pos = main_pos.plus(main_space);
        let line_end_gap = parent.main_size.plus(parent.main_pos).minus(main_pos);
        if (wrap && flex_row.length > 1) {
            constraints.push(new kiwi.Constraint(line_end_gap, kiwi.Operator.Le, 0, kiwi.Strength.weak));
            // we can accomodate this by wrapping instead
            constraints.push(new kiwi.Constraint(line_end_gap, kiwi.Operator.Ge, 0, kiwi.Strength.medium));
        } else {
            constraints.push(new kiwi.Constraint(line_end_gap, kiwi.Operator.Le, 0, kiwi.Strength.weak));
            constraints.push(new kiwi.Constraint(line_end_gap, kiwi.Operator.Ge, 0, kiwi.Strength.strong));
        }

        cross_pos = cross_pos.plus(cross_size);
        if (i < children_grid.length - 1) cross_pos = cross_pos.plus(line_space);
    }

    if (!['end', 'space-between'].includes(alignContent)) cross_pos = cross_pos.plus(cross_space);
    constraints.push(new kiwi.Constraint(cross_pos.minus(parent.cross_pos), kiwi.Operator.Eq, parent.cross_size, kiwi.Strength.medium));

    if (mainHug) constraints.push(...main_spaces.map((main_space) => 
        new kiwi.Constraint(main_space, kiwi.Operator.Le, 0, mainHug)
    ));
    if (crossHug) constraints.push(new kiwi.Constraint(cross_space, kiwi.Operator.Le, 0, crossHug));

    useConstraints(
        () => constraints,
        [
            parent.main_pos, parent.main_size, parent.cross_pos, parent.cross_size,
            justifyContent, alignContent, main_gap, cross_gap, wrap_idxs, children_out.length,
            mainHug, crossHug,
        ]
    );

    const store = useStore();
    React.useLayoutEffect(() => {
        const parent_atom = expr_atom(parent.main_size);
        const gap_atom = expr_atom(main_gap);

        const wrap_idxs_atom = atomWithDebounce(wrap ? atom((get) => {
            let idxs: Array<number> = [];
            const parent_size = get(parent_atom);
            const gap = get(gap_atom);
            let line_size = -gap;
            for (const [i, size_var] of main_sizes.entries()) {
                const size = get(size_var.atom);
                line_size += gap + size;
                if (line_size > parent_size) {
                    idxs.push(i);
                    line_size = size;
                }
            }
            return idxs;
        }) : atom((_) => []), [], 10, store);
        return store.sub(wrap_idxs_atom, () => {
            const val = store.get(wrap_idxs_atom);
            if (!arrayEqual(val, wrap_idxs)) {
                set_wrap_idxs(val);
            }
        });
    }, [wrap, wrap_idxs, main_gap, parent.main_size, main_sizes.length]);

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
    return <ProvideLayout {...layout}>{children}</ProvideLayout>
}