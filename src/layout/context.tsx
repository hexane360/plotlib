import React from "react";
import { Expression } from "@lume/kiwi";
import { useStore } from 'jotai';

import Variable from "./Variable";
import Solver from "./Solver";

export const SolverContext = React.createContext<Solver | null>(null);

export function ProvideSolver({children}: {children?: React.ReactNode}) {
    const store = useStore();
    const solver = React.useRef<Solver>(new Solver(store));

    return <SolverContext.Provider value={solver.current}>{children}</SolverContext.Provider>; 
}

export interface LayoutContextData {
    x: Variable | Expression;
    y: Variable | Expression;
    width: Variable | Expression;
    height: Variable | Expression;
}

export const LayoutContext = React.createContext<LayoutContextData | null>(null);

export function ProvideLayout({children, x, y, width, height}: LayoutContextData & {children?: React.ReactNode}) {
    const ctx = React.useMemo(() => ({x, y, width, height}), [x, y, width, height]);
    return <LayoutContext.Provider value={ctx}>{children}</LayoutContext.Provider>
}