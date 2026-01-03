import React from 'react';
import { Constraint } from '@lume/kiwi';

import Variable from './Variable';
import { SolverContext, LayoutContext, LayoutContextData } from './context';


export function useConstraints(
    cb: () => ReadonlyArray<Constraint>, deps: React.DependencyList
) {
    const solver = React.useContext(SolverContext);
    if (!solver) throw new Error('useConstraints must be called from within a SolverContext');

    React.useLayoutEffect(() => {
        let constraints = cb();
        solver.addConstraints(constraints);
        return () => solver.deleteConstraints(constraints);
    }, deps);
}

export function useVariables(names: ReadonlyArray<string>): ReadonlyArray<Variable> {
    const solver = React.useContext(SolverContext);
    if (!solver) throw new Error('useVariables must be called from within a SolverContext');

    return React.useState(names.map((name) => new Variable(name, solver.store)))[0];
} 

export function useEditVariables(names: ReadonlyArray<string>, strength: number): ReadonlyArray<Variable> {
    const solver = React.useContext(SolverContext);
    if (!solver) throw new Error('useEditVariables must be called from within a SolverContext');

    // cache variables
    const vars = React.useState(names.map((name) => new Variable(name, solver.store)))[0];

    React.useLayoutEffect(() => {
        for (const variable of vars) {
            solver.addEditVariable(variable, strength);
        }
        return () => {
            for (const variable of vars) {
                solver.deleteEditVariable(variable)
            }
        };
    }, []);

    return vars;
}

export function useParent(): LayoutContextData {
    const parent = React.useContext(LayoutContext);
    if (!parent) throw new Error("Component must be called from within a parent layout context");
    return parent;
}