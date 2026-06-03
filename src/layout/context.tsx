import React from "react";
import { Constraint, Expression, Operator } from "@lume/kiwi";
import { useStore } from 'jotai';

import Variable from "./Variable";
import Solver from "./Solver";
import { expr_equal } from "./expr";

export interface SolverContextData {
    solver: Solver;
    rem_scale: Variable;
}

export const SolverContext = React.createContext<SolverContextData | null>(null);

export function ProvideSolver({
    children, rem_scale = 16.0
}: {children?: React.ReactNode, rem_scale?: number}) {
    const store = useStore();
    const solver = React.useRef<Solver>(new Solver(store));
    const remVar = new Variable('remScale', store);
    const context = {
        solver: solver.current,
        rem_scale: remVar,
    };

    React.useLayoutEffect(() => {
        // TODO actually update this dynamically
        const constraint = new Constraint(remVar, Operator.Eq, rem_scale);
        solver.current.addConstraints([constraint])
        return () => solver.current.deleteConstraints([constraint]);
    }, [rem_scale]);

    return <SolverContext.Provider value={context}>{children}</SolverContext.Provider>; 
}

export interface LayoutContextData {
    x: Variable | Expression;
    y: Variable | Expression;
    width: Variable | Expression;
    height: Variable | Expression;
}

export const LayoutContext = React.createContext<LayoutContextData | null>(null);

export function ProvideLayout({children, x, y, width, height}: LayoutContextData & {children?: React.ReactNode}) {
    const ctxRef = React.useRef({x, y, width, height});
    const old = ctxRef.current;
    if (!expr_equal(old.x, x) || !expr_equal(old.y, y) ||
        !expr_equal(old.width, width) || !expr_equal(old.height, height)) {
        ctxRef.current = {x, y, width, height};
    }

    return <LayoutContext.Provider value={ctxRef.current}>{children}</LayoutContext.Provider>
}

export interface GridContextData {
    row: number;
    col: number;
    n_rows: number;
    n_cols: number;
}

export const GridContext = React.createContext<GridContextData | null>(null);

export function ProvideGrid(
    {children, row, col, n_rows, n_cols}: GridContextData & {children?: React.ReactNode}
) {
    const ctx = React.useMemo(() => ({row, col, n_rows, n_cols}), [row, col, n_rows, n_cols]);
    return <GridContext.Provider value={ctx}>{children}</GridContext.Provider>;
}

export interface DecorationContextData {
    position: 'left' | 'right' | 'top' | 'bottom' | 'center';
}
export const DecorationContext = React.createContext<DecorationContextData | null>(null);

export function ProvideDecoration(
    {children, position}: DecorationContextData & {children?: React.ReactNode}
) {
    const ctx = React.useMemo(() => ({position}), [position]);
    return <DecorationContext.Provider value={ctx}>{children}</DecorationContext.Provider>;
}