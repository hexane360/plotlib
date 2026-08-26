import React from "react";
import { Constraint, Expression, Operator } from "@lume/kiwi";
import { useStore } from 'jotai';

import Variable from "./Variable";
import Solver, { SolverLogLevel, SolverLogSink } from "./Solver";
import { expr_equal } from "./expr";
import { child_hug, HUG_BASE } from "./hug";

export interface SolverContextData {
    solver: Solver;
    rem_scale: Variable;
}

export const SolverContext = React.createContext<SolverContextData | null>(null);

/** Resolve the `debug` prop (`boolean | SolverLogLevel | undefined`) to a concrete {@link SolverLogLevel}. */
function resolveLogLevel(debug: boolean | SolverLogLevel | undefined): SolverLogLevel {
    return debug === true ? 'debug' : debug || 'silent';
}

export function ProvideSolver({
    children, rem_scale = 16.0, debug, onSolverLog,
}: {
    children?: React.ReactNode,
    rem_scale?: number,
    /** Enable solver diagnostics. `true` sets `'debug'`; a specific {@link SolverLogLevel} sets that level. Defaults to `'silent'`. */
    debug?: boolean | SolverLogLevel,
    /** Custom sink for structured solver diagnostic events. Defaults to a console sink prefixed `[plotlib:solver]`. */
    onSolverLog?: SolverLogSink,
}) {
    const store = useStore();
    const solver = React.useRef<Solver>(
        new Solver(store, { logLevel: resolveLogLevel(debug), sink: onSolverLog })
    ).current;
    const remVar = React.useRef<Variable>(new Variable('remScale', store)).current;
    const context = {
        solver: solver,
        rem_scale: remVar,
    };

    React.useEffect(() => {
        solver.logLevel = resolveLogLevel(debug);
    }, [debug]);

    React.useEffect(() => {
        solver.setSink(onSolverLog);
    }, [onSolverLog]);

    React.useLayoutEffect(() => {
        const constraint = new Constraint(remVar, Operator.Eq, rem_scale);
        solver.addConstraints([constraint])
        return () => solver.deleteConstraints([constraint]);
    }, [rem_scale]);

    return <SolverContext.Provider value={context}>{children}</SolverContext.Provider>;
}

export interface LayoutContextData {
    x: Variable | Expression;
    y: Variable | Expression;
    width: Variable | Expression;
    height: Variable | Expression;
    // free space held by ancestors
    x_space: Variable | Expression | number;
    y_space: Variable | Expression | number;
    // current hug strength
    // this grows exponentially with depth to ensure that children hug tighter than parents
    hug: number;
}

export const LayoutContext = React.createContext<LayoutContextData | null>(null);

export type ProvideLayoutProps =
    Omit<LayoutContextData, 'x_space' | 'y_space' | 'hug'>
    & Partial<Pick<LayoutContextData, 'x_space' | 'y_space'>>
    & {
        // How many hug constraints the providing component contributes. Defaults to zero.
        n_hugs?: number,
    };

const LAYOUT_KEYS = ['x', 'y', 'width', 'height', 'x_space', 'y_space', 'hug'] as const;

export function ProvideLayout({
    children, x, y, width, height, x_space = 0, y_space = 0, n_hugs = 0,
}: ProvideLayoutProps & {children?: React.ReactNode}) {
    const parent = React.useContext(LayoutContext);
    const next = {
        x, y, width, height, x_space, y_space,
        hug: child_hug(parent?.hug ?? HUG_BASE, n_hugs),
    };
    const ctxRef = React.useRef(next);
    if (LAYOUT_KEYS.some((key) => !expr_equal(ctxRef.current[key], next[key]))) ctxRef.current = next;

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