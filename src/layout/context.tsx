import React from "react";
import { Expression } from "@lume/kiwi";

import Variable from "./Variable";
import Solver from "./Solver";

export const SolverContext = React.createContext<Solver | null>(null);

export interface LayoutContextData {
    x: Variable | Expression;
    y: Variable | Expression;
    width: Variable | Expression;
    height: Variable | Expression;
}

export const LayoutContext = React.createContext<LayoutContextData | null>(null);