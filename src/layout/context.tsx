import React from "react";

import Variable from "./Variable";
import Solver from "./Solver";

export const SolverContext = React.createContext<Solver | null>(null);

export interface LayoutContextData {
    x: Variable;
    y: Variable;
    width: Variable;
    height: Variable;
}

export const LayoutContext = React.createContext<LayoutContextData | null>(null);