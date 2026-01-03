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

function allEqual<T>(left: ReadonlyArray<T>, right: ReadonlyArray<T>): boolean {
    if (left.length != right.length) return false;
    for (let i = 0; i < left.length; i++) {
        if (left[i] != right[i]) return false;
    }
    return true;
}

export function useVariables(names: ReadonlyArray<string>): ReadonlyArray<Variable> {
    const solver = React.useContext(SolverContext);
    if (!solver) throw new Error('useVariables must be called from within a SolverContext');
    const ref = React.useRef<[ReadonlyArray<string> | null, ReadonlyArray<Variable> | null]>([null, null]);

    if (!ref.current[0] || !ref.current[1] || !allEqual(ref.current[0], names)) {
        if (ref.current[0]) { solver.scheduleRebuild(); }
        ref.current[0] = names;
        ref.current[1] = names.map((name) => new Variable(name, solver.store));
    }

    return ref.current[1];
} 

export function useEditVariables(names: ReadonlyArray<string>, strength: number): ReadonlyArray<Variable> {
    const solver = React.useContext(SolverContext);
    if (!solver) throw new Error('useEditVariables must be called from within a SolverContext');
    const ref = React.useRef<[ReadonlyArray<string> | null, ReadonlyArray<Variable> | null]>([null, null]);

    if (!ref.current[0] || !ref.current[1] || !allEqual(ref.current[0], names)) {
        if (ref.current[1]) { solver.scheduleRebuild(); }
        ref.current[0] = names;
        ref.current[1] = names.map((name) => new Variable(name, solver.store));
    }
    let vars = ref.current[1];

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