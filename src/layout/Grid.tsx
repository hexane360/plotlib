import React from 'react';
import * as kiwi from '@lume/kiwi';

import { useProps } from "../theme";
import { useConstraints, useParent, useRemScale, useVariables } from "./hooks";
import { Length, parse_length } from "./length";
import { AlignContent, AlignItems, JustifyContent, JustifyItems } from "./types";
import { ProvideGrid, ProvideLayout } from './context';
import Variable from './Variable';
export type { AlignContent, AlignItems, JustifyContent, JustifyItems } from "./types";


export interface GridProps {
    /** Number of columns in grid. */
    n_cols: number;

    /** How to distribute space around columns of the grid (along inline axis). Defaults to `'center'`. */
    justifyContent?: JustifyContent;
    /** How to distribute space around rows of the grid (along block axis). Defaults to `'center'`. */
    alignContent?: AlignContent;
    /** How to align content within each cell horizontally (along inline/row axis). Defaults to `'center'`. */
    justifyItems?: JustifyItems;
    /** How to align content within each cell vertically (along block/column axis). Defaults to `'center'`.  */
    alignItems?: AlignItems;

    /** Gap between rows. Defaults to `0`. */
    rowGap?: Length;
    /** Gap between columns. Defaults to `0`. */
    columnGap?: Length;

    /** Strength to hug row spacing with. Defaults to `layout.Strength.weak`. Set to 0 to disable. */
    rowHug?: number;
    /** Strength to hug column spacing with. Defaults to `layout.Strength.weak`. Set to 0 to disable. */
    columnHug?: number;

    children?: React.ReactNode;
}

export default function Grid({children, ...props_}: GridProps) {
    const parent = useParent();

    const {
        n_cols, justifyContent, alignContent,
        justifyItems, alignItems,
        rowGap, columnGap,
        rowHug, columnHug,
    } = useProps('Grid', props_, {
        justifyContent: 'center',
        alignContent: 'center',
        justifyItems: 'center',
        alignItems: 'center',
        rowGap: 0, columnGap: 0,
        rowHug: kiwi.Strength.weak,
        columnHug: kiwi.Strength.weak,
    } as const);

    if (n_cols <= 0) throw new Error(`n_cols must be at least 1. Got '${n_cols}' instead.`);

    const n = React.Children.count(children);
    const n_rows = Math.ceil(n / n_cols);

    const [row_space, col_space] = useVariables(['grid-row-space', 'grid-col-space']);
    const row_sizes = useVariables(Array.from({ length: n_rows }, (_, i) => `grid-row-${i}`));
    const col_sizes = useVariables(Array.from({ length: n_cols }, (_, i) => `grid-col-${i}`));

    const rem_scale = useRemScale();
    const row_gap = React.useMemo(() => parse_length(rowGap, parent.height, rem_scale), [rowGap, parent.height, rem_scale]);
    const col_gap = React.useMemo(() => parse_length(columnGap, parent.width, rem_scale), [columnGap, parent.width, rem_scale]);

    let constraints = [row_space, col_space].map((space) => new kiwi.Constraint(space, kiwi.Operator.Ge, 0.0));

    // hug constraints
    if (rowHug) constraints.push(new kiwi.Constraint(row_space, kiwi.Operator.Le, 0, rowHug));
    if (columnHug) constraints.push(new kiwi.Constraint(col_space, kiwi.Operator.Le, 0, columnHug));

    // x space between each column
    const x_space: kiwi.Expression | kiwi.Variable = (({
        'space-around': col_space.multiply(2.0),
        'space-between': col_space,
        'space-evenly': col_space,
    } as any)[justifyContent] ?? new kiwi.Expression(0.0)).plus(col_gap);
    // y space between each row
    const y_space: kiwi.Expression | kiwi.Variable = (({
        'space-around': row_space.multiply(2.0),
        'space-between': row_space,
        'space-evenly': row_space,
    } as any)[alignContent] ?? new kiwi.Expression(0.0)).plus(row_gap);

    // compute column position expressions
    let x = parent.x;
    if (!['start', 'space-between'].includes(justifyContent)) x = x.plus(col_space);

    let col_xs = [];
    for (const col_size of col_sizes) {
        col_xs.push(x);
        x = x.plus(col_size).plus(x_space);
    }

    x = x.minus(x_space);
    if (!['end', 'space-between'].includes(justifyContent)) x = x.plus(col_space);

    // compute row position expressions
    let y = parent.y;
    if (!['start', 'space-between'].includes(alignContent)) y = y.plus(row_space);

    let row_ys = [];
    for (const row_size of row_sizes) {
        row_ys.push(y);
        y = y.plus(row_size).plus(y_space);
    }

    y = y.minus(y_space);
    if (!['end', 'space-between'].includes(alignContent)) y = y.plus(row_space);

    // constrain end of grid
    constraints.push(new kiwi.Constraint(x.minus(parent.x), kiwi.Operator.Eq, parent.width, kiwi.Strength.strong));
    constraints.push(new kiwi.Constraint(y.minus(parent.y), kiwi.Operator.Eq, parent.height, kiwi.Strength.strong));

    useConstraints(
        () => constraints, [
            parent.width, parent.height, parent.x, parent.y,
            n_rows, n_cols, justifyContent, alignContent,
            rowHug, columnHug, rowGap, columnGap, rem_scale,
        ]
    );

    const children_out: React.ReactNode[] = [];
    let row = 0, col = 0;

    React.Children.forEach(children, (child, i) => {
        children_out.push(
            <ProvideGrid key={i} row={row} col={col} n_rows={n_rows} n_cols={n_cols}>
                <ProvideLayout x={col_xs[col]} y={row_ys[row]} width={col_sizes[col]} height={row_sizes[row]}>
                    <GridItem justifyItems={justifyItems} alignItems={alignItems}>{child}</GridItem>
                </ProvideLayout>
            </ProvideGrid>
        );
        if (++col == n_cols) {
            col = 0; ++row;
        }
    });

    return <g>{children_out}</g>;
}

function GridItem({
    justifyItems, alignItems, children
}: {justifyItems: JustifyItems, alignItems: AlignItems, children?: React.ReactNode}) {
    const parent = useParent();

    const [x_space, y_space, width, height] = useVariables([
        'griditem-x-space', 'griditem-y-space', 'griditem-inner-width', 'griditem-inner-height'
    ]);

    useConstraints(() => [
        new kiwi.Constraint(x_space, kiwi.Operator.Ge, 0.0),
        new kiwi.Constraint(y_space, kiwi.Operator.Ge, 0.0),
        new kiwi.Constraint(width.plus(x_space), kiwi.Operator.Eq, parent.width),
        new kiwi.Constraint(height.plus(y_space), kiwi.Operator.Eq, parent.height),
        // TODO customize hug constraints
        new kiwi.Constraint(x_space, kiwi.Operator.Le, 0.0, kiwi.Strength.weak),
        new kiwi.Constraint(y_space, kiwi.Operator.Le, 0.0, kiwi.Strength.weak),
    ], [parent.width, parent.height, x_space, y_space, width, height]);

    const x = align(parent.x, x_space, justifyItems);
    const y = align(parent.y, y_space, alignItems);
    return <ProvideLayout x={x} y={y} width={width} height={height}>{children}</ProvideLayout>
}

function align(pos: Variable | kiwi.Expression, space: Variable | kiwi.Expression, align: AlignItems | JustifyItems): Variable | kiwi.Expression {
    if (align == 'start') return pos;
    if (align == 'center') return pos.plus(space.divide(2.0));
    if (align == 'end') return pos.plus(space);
    throw new Error(`Invalid align-items/justify-items value ${align}. Expected 'start', 'center', or 'end'.`);
}