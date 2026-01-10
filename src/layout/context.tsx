import React from "react";
import { Expression } from "@lume/kiwi";
import { useStore } from 'jotai';

import Variable from "./Variable";
import Solver from "./Solver";
import { expr_equal } from "./utils";

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
    const ctxRef = React.useRef({x, y, width, height});
    const old = ctxRef.current;
    if (!expr_equal(old.x, x) || !expr_equal(old.y, y) ||
        !expr_equal(old.width, width) || !expr_equal(old.height, height)) {
        ctxRef.current = {x, y, width, height};
    }

    return <LayoutContext.Provider value={ctxRef.current}>{children}</LayoutContext.Provider>
}