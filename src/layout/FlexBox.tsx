import React from 'react';
import * as kiwi from '@lume/kiwi';

import { useVariables, useConstraints, useParent, useRemScale } from "./hooks";
import { Length, parse_length } from './length';
import { as_expr, expr_atom } from './expr';
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

    /** Strength to hug main spacing with. Defaults to a tenth of {@link hugParent}. Set to 0 to disable. */
    mainHug?: number;
    /** Strength to hug cross spacing with. Defaults to this cell's hug strength. Set to 0 to disable. */
    crossHug?: number;
    /**
     * Strength with which to shrink the space allotted by our parent down to our content,
     * leaving the slack with whichever ancestor is holding it. Defaults to this cell's
     * position on the hug ladder. Set to 0 to always fill the space we are given.
     *
     * Must be at least as strong as {@link mainHug}. Growing the justification spacing is
     * one way to satisfy this hug, so if `mainHug` outranked it the solver would collapse
     * that spacing instead, and `justifyContent` would stop having an effect whenever the
     * allotment is pinned wider than the content.
     */
    hugParent?: number;

    children?: React.ReactNode;
}

function orient<T, U, V>(
    direction: FlexDirection,
    {main_pos, cross_pos, main_size, cross_size, main_avail, cross_avail}: {
        main_pos: T, cross_pos: T, main_size: U, cross_size: U, main_avail: V, cross_avail: V,
    },
): {x: T, y: T, width: U, height: U, x_space: V, y_space: V} {
    return direction == 'row'
        ? {x: main_pos, y: cross_pos, width: main_size, height: cross_size, x_space: main_avail, y_space: cross_avail}
        : {y: main_pos, x: cross_pos, height: main_size, width: cross_size, y_space: main_avail, x_space: cross_avail};
}

function deorient<T, U, V>(
    direction: FlexDirection, {x, y, width, height, x_space, y_space}: {x: T, y: T, width: U, height: U, x_space: V, y_space: V},
): {main_pos: T, cross_pos: T, main_size: U, cross_size: U, main_avail: V, cross_avail: V} {
    return direction == 'row'
        ? {main_pos: x, cross_pos: y, main_size: width, cross_size: height, main_avail: x_space, cross_avail: y_space}
        : {main_pos: y, cross_pos: x, main_size: height, cross_size: width, main_avail: y_space, cross_avail: x_space};
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
    const parent_layout = useParent();
    const {
        flexDirection, wrap, justifyContent,
        alignContent, alignItems,
        rowGap, columnGap, mainHug, crossHug, hugParent,
    } = useProps('FlexBox', props_, {
        flexDirection: 'row',
        wrap: false,
        justifyContent: 'center',
        alignContent: 'center',
        alignItems: 'center',
        rowGap: 0, columnGap: 0,
        // prefer we get the space so we can wrap
        mainHug: 0.1 * parent_layout.hug,
        crossHug: parent_layout.hug,
        hugParent: parent_layout.hug,
    } as const);

    const parent = deorient(flexDirection, parent_layout);
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
    ), [flexDirection, rowGap, columnGap, parent.main_size, rem_scale]);
    let cross_gap = React.useMemo(() => parse_length(
        flexDirection == 'row' ? rowGap : columnGap,
        parent.cross_size, rem_scale
    ), [flexDirection, rowGap, columnGap, parent.cross_size, rem_scale]);

    // Total room we could occupy: what we were allotted, plus any free space ancestors are
    // holding on our behalf. This is what we reflow against, rather than the allotment alone —
    // `hugParent` pulls the allotment down to our content, so using it as the threshold would
    // mean chasing our own output (wrap, content narrows, threshold drops, wrap again). Room
    // telescopes up to the nearest ancestor with a definite size, so it holds still instead.
    //
    // It deliberately isn't a constraint: an ancestor only has room to give if its own geometry
    // lets it yield, which its constraints already express.
    const room = React.useMemo(
        () => as_expr(parent.main_size).plus(parent.main_avail),
        [parent.main_size, parent.main_avail]
    );

    // `mainHug` and `hugParent` both act on the main axis, `crossHug` on the cross axis; the
    // ladder takes the per-axis max. Counted per *kind*, not per line: a per-line count would
    // change every time content reflowed, re-registering every descendant hug on each wrap.
    const n_hugs = Math.max((mainHug ? 1 : 0) + (hugParent ? 1 : 0), crossHug ? 1 : 0);

    let constraints = [cross_space, ...main_spaces].map((space) => new kiwi.Constraint(space, kiwi.Operator.Ge, 0.0));

    const line_space: kiwi.Expression | kiwi.Variable = (({
        'space-around': cross_space.multiply(2.0),
        'space-between': cross_space,
        'space-evenly': cross_space,
    } as any)[alignContent] ?? new kiwi.Expression(0.0)).plus(cross_gap);

    let cross_pos = parent.cross_pos;
    if (!['start', 'space-between'].includes(alignContent)) cross_pos = cross_pos.plus(cross_space);

    let idx = 0;
    for (const [i, flex_row] of children_grid.entries()) {
        const cross_size = cross_sizes[i];
        const main_space = main_spaces[i];

        const item_space: kiwi.Expression | kiwi.Variable = (({
            'space-around': main_space.multiply(2.0),
            'space-between': main_space,
            'space-evenly': main_space,
        } as any)[justifyContent] ?? new kiwi.Expression(0.0)).plus(main_gap);

        let main_pos = parent.main_pos;
        if (!['start', 'space-between'].includes(justifyContent)) main_pos = main_pos.plus(main_space);

        for (const [j, child] of flex_row.entries()) {
            const main_size = main_sizes[idx];

            const grid = flexDirection == 'row'
                ? {row: i, col: j, n_rows: children_grid.length, n_cols: flex_row.length}
                : {col: i, row: j, n_cols: children_grid.length, n_rows: flex_row.length};
            // forward our own free space unchanged. We deliberately don't donate this line's
            // `main_space` too: every item on the line would see the same slack, and each could
            // then independently decline to wrap on the strength of space only one of them can have.
            const layout = orient(flexDirection, {
                main_pos, cross_pos, main_size, cross_size,
                main_avail: parent.main_avail, cross_avail: parent.cross_avail,
            });
            children_out.push(
                <ProvideGrid {...grid} key={idx}>
                    <ProvideLayout {...layout} n_hugs={n_hugs}>
                        <FlexItem flexDirection={flexDirection} alignItems={alignItems}>{child}</FlexItem>
                    </ProvideLayout>
                </ProvideGrid>
            );
            main_pos = main_pos.plus(main_size);
            if (j < flex_row.length - 1) main_pos = main_pos.plus(item_space);
            idx += 1;
        }

        if (!['end', 'space-between'].includes(justifyContent)) main_pos = main_pos.plus(main_space);

        const line_end_gap = parent.main_size.plus(parent.main_pos).minus(main_pos);

        // cover: our allotment must contain this line. Weaker when wrapping, since we can
        // accomodate an overlong line by wrapping it instead of by growing.
        constraints.push(new kiwi.Constraint(
            line_end_gap, kiwi.Operator.Ge, 0,
            wrap && flex_row.length > 1 ? kiwi.Strength.medium : kiwi.Strength.strong,
        ));
        // hug: prefer our allotment shrinks back down to our content, leaving the slack with
        // whichever ancestor is holding it. `cover` binds on our widest line and `hug` on our
        // narrowest, so together they pin the allotment to the widest line.
        if (hugParent) constraints.push(new kiwi.Constraint(line_end_gap, kiwi.Operator.Le, 0, hugParent));

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
            mainHug, crossHug, hugParent, rem_scale,
        ]
    );

    const store = useStore();
    React.useLayoutEffect(() => {
        const room_atom = expr_atom(room);
        const gap_atom = expr_atom(main_gap);

        const wrap_idxs_atom = atomWithDebounce(wrap ? atom((get) => {
            let idxs: Array<number> = [];
            const available = get(room_atom);
            const gap = get(gap_atom);
            let line_size = -gap;
            for (const [i, size_var] of main_sizes.entries()) {
                const size = get(size_var.atom);
                line_size += gap + size;
                if (line_size > available) {
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
    }, [wrap, wrap_idxs, main_gap, room, main_sizes.length]);

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
        main_avail: parent.main_avail,
        // `space` is exactly the slack we hold back from the child on the cross axis, so it is
        // free space the child may expand into rather than space that has been spent.
        cross_avail: as_expr(parent.cross_avail).plus(space),
    });
    return <ProvideLayout {...layout}>{children}</ProvideLayout>
}