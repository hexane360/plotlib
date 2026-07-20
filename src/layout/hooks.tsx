import React from 'react';
import { Constraint, Expression, Strength } from '@lume/kiwi';

import Variable from './Variable';
import Solver from './Solver';
import { SolverContext, LayoutContext, LayoutContextData } from './context';
import { expr_atom } from './expr';
import { useAtomValue } from 'jotai/react';


/**
 * Register kiwi constraints with the enclosing solver.
 * Constraints are added on mount, removed and re-added whenever `deps` change, and removed on unmount.
 *
 * @param cb - Returns the array of constraints to register.
 * @param deps - Dependency list (same semantics as `useEffect`).
 */
export function useConstraints(
    cb: () => ReadonlyArray<Constraint>, deps: React.DependencyList
) {
    const solver = React.useContext(SolverContext)?.solver;
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

/**
 * Allocate named solver {@link Variable}s, backed by the enclosing solver's store.
 * Variables are stable across renders; the solver is scheduled for a rebuild if `names` changes.
 *
 * @param names - Logical names for the variables (used for debugging).
 */
export function useVariables(names: ReadonlyArray<string>): ReadonlyArray<Variable> {
    const solver = React.useContext(SolverContext)?.solver;
    if (!solver) throw new Error('useVariables must be called from within a SolverContext');
    const ref = React.useRef<[ReadonlyArray<string> | null, ReadonlyArray<Variable> | null]>([null, null]);

    if (!ref.current[0] || !ref.current[1] || !allEqual(ref.current[0], names)) {
        if (ref.current[0]) { solver.scheduleRebuild(); }
        ref.current[0] = names;
        ref.current[1] = names.map((name) => new Variable(name, solver.store));
    }

    return ref.current[1];
} 

/**
 * Like {@link useVariables}, but registers the variables as solver edit variables at the given strength.
 * Edit variables can be suggested values via `solver.suggestValue`.
 *
 * @param names - Logical names for the variables.
 * @param strength - Kiwi constraint strength for the edit variables.
 */
export function useEditVariables(names: ReadonlyArray<string>, strength: number): ReadonlyArray<Variable> {
    const solver = React.useContext(SolverContext)?.solver;
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
    }, [vars, strength]);

    return vars;
}

/** Return the current {@link LayoutContextData} from the nearest enclosing layout provider. */
export function useParent(): LayoutContextData {
    const parent = React.useContext(LayoutContext);
    if (!parent) throw new Error("Component must be called from within a parent layout context");
    return parent;
}

/** Return the solver {@link Variable} representing the current `1rem` pixel size. */
export function useRemScale(): Variable {
    const solver = React.useContext(SolverContext);
    if (!solver) throw new Error('useRemScale must be called from within a SolverContext');
    return solver.rem_scale;
}

/**
 * Return the enclosing {@link Solver}, or `undefined` outside a `SolverContext`.
 * Useful for runtime diagnostics: flip `solver.logLevel`, call `solver.printConstraints()` /
 * `solver.printVariables()`, or read `solver.solveCount` / `solver.rebuildCount`.
 */
export function useSolver(): Solver | undefined {
    return React.useContext(SolverContext)?.solver;
}

/**
 * Reactively read the current pixel value of a solver variable or expression.
 *
 * @param expr - The variable or expression to observe.
 * @param deps - Dependency list controlling when the underlying atom is recreated.
 */
export function useExprValue(expr: Variable | Expression, deps: React.DependencyList): number {
    const atom = React.useMemo(() => expr_atom(expr), deps);
    return useAtomValue(atom);
}

function rect_union(rect1: DOMRect, rect2: DOMRect): DOMRect {
    const min = [
        Math.min(rect1.x, rect2.x),
        Math.min(rect1.y, rect2.y)
    ];
    const max = [
        Math.max(rect1.x + rect1.width, rect2.x + rect2.width),
        Math.max(rect1.y + rect1.height, rect2.y + rect2.height)
    ];
    return new DOMRect(
        min[0], min[1], max[0] - min[0], max[1] - min[1]
    );
}

/**
 * Observe the bounding box of elements inside a ref and expose the result as solver edit variables.
 * Re-measures on every render (via `ResizeObserver`) and suggests the new size to the solver.
 *
 * @param ref - Ref to the root element to observe.
 * @param selector - Optional CSS selector relative to `ref`; if provided, the union bounding box of
 *   all matching children is used instead of `ref` itself.
 * @param cb - Optional callback invoked after each solve with the measured bounds.
 * @param sticky - If `true`, the reported size only grows, never shrinks.
 *   Useful for axis tick labels to avoid layout thrashing. Defaults to `false`.
 * @returns A `[width, height]` pair of solver {@link Variable}s.
 */
export function useObserveSize<E extends HTMLElement | SVGElement | null>(
    ref: React.RefObject<E>, {selector, cb, sticky = false}: {
        selector?: string, cb?:
        (bounds: {x: number, y: number, width: number, height: number}) => any,
        sticky?: boolean,
    } = {}
): [Variable, Variable] {
    const [width, height] = useEditVariables(['obs-width', 'obs-height'], Strength.strong);
    const solver = React.useContext(SolverContext)!?.solver;

    const max_width = React.useRef<number>(0.0);
    const max_height = React.useRef<number>(0.0);

    function get_refs(): Array<HTMLElement | SVGElement> {
        if (!ref.current) return [];
        if (!selector) return [ref.current!];
        return Array.from(ref.current!.querySelectorAll(selector));
    }

    function layout() {
        // hack, we need this because the resize solver can fire
        // even after the layout effect has unfired
        if (!solver.hasEditVar(width) || !solver.hasEditVar(height)) { return; }

        let bounds = {x: 0, y: 0, width: 0, height: 0};

        const refs = get_refs();
        if (refs.length) {
            let rect = refs.map((e) => e.getBoundingClientRect()).reduce(
                (prev, current) => rect_union(prev, current)
            );
            bounds.x = rect.x;
            bounds.y = rect.y;
            bounds.width = rect.width;
            bounds.height = rect.height;
        }

        let w, h;
        if (sticky) {
            if (bounds.width > max_width.current ||
                bounds.height > max_height.current
            ) {
                w = max_width.current = Math.max(max_width.current, bounds.width);
                h = max_height.current = Math.max(max_height.current, bounds.height);
            // don't need to re-solve
            } else { return; }
        } else {
            w = bounds.width;
            h = bounds.height;
        }
        
        solver.suggestValue(width, w);
        solver.suggestValue(height, h);
        solver.scheduleSolve();
        if (cb) solver.onSolveOnce(() => cb(bounds));
    }

    React.useEffect(() => {
        const resizeObserver = new ResizeObserver((_) => { layout(); });
        for (const ref of get_refs()) {
            resizeObserver.observe(ref, {box: 'border-box'});
        }
        return () => { resizeObserver.disconnect(); };
    });
    React.useLayoutEffect(layout, [width, height, selector, cb, sticky]);

    return [width, height];
}