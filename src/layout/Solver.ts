import * as kiwi from '@lume/kiwi';
import { PrimitiveAtom, useStore, atom } from "jotai";

import Variable from "./Variable";

type Store = ReturnType<typeof useStore>;


/**
 * A Cassowary constraint solver that integrates with a Jotai store.
 * Constraints and edit variables are registered by layout hooks.
 * After each solve, all {@link Variable} atoms are updated so
 * that subscribed React components re-render.
 */
export default class Solver {
    /** Jotai store used to publish variable value updates. */
    public store: Store;
    /** Underlying kiwi solver instance. Recreated on each rebuild. */
    public inner: kiwi.Solver;
    private constraints: Set<ReadonlyArray<kiwi.Constraint>>;
    private editVariables: Map<Variable, [number, number | undefined]>;

    private needsRebuild: boolean = false;
    private solveTimeout: number = 0;

    private solveCallbacks: Map<() => void, boolean>;

    constructor(store: Store) {
        this.store = store;
        this.inner = new kiwi.Solver();
        this.constraints = new Set();
        this.editVariables = new Map();
        this.solveCallbacks = new Map();
    }

    /** Recreate the inner kiwi solver from scratch with all registered constraints and edit variables. */
    rebuild() {
        console.log("Rebuilding solver");
        this.inner = new kiwi.Solver();
        for (const [editVar, [strength, value]] of this.editVariables.entries()) {
            this.inner.addEditVariable(editVar, strength);
        }
        for (const constraints of this.constraints) {
            for (const constraint of constraints) {
                this.inner.addConstraint(constraint);
            }
        }
        this.needsRebuild = false;
        this.solveInner();
    }

    /** Run the solver, rebuilding first if constraints or edit variables have changed. */
    solve() {
        //console.log(`solve(), needsRebuild: ${this.needsRebuild}`);
        if (this.needsRebuild) {
            this.rebuild();
        } else {
            this.solveInner();
        }
    }

    protected solveInner() {
        this.applyEditVars();
        this.inner.updateVariables();

        // call callbacks
        for (const [cb, keep] of this.solveCallbacks) {
            cb();
            if (!keep) this.solveCallbacks.delete(cb)
        }
    }

    /** Log all active constraints to the console (for debugging). */
    printConstraints() {
        for (const constraint of this.inner.getConstraints()) {
            console.log(`Constraint: ${constraint.toString()}`);
        }
    }

    /** Register a group of constraints. Schedules a rebuild if the group is new. */
    addConstraints(constraints: ReadonlyArray<kiwi.Constraint>) {
        if (this.constraints.has(constraints)) {
            return;
        }
        //console.log(`Scheduling rebuild new constraints: ${constraints}`);
        this.constraints.add(constraints);
        this.scheduleRebuild();
    }

    /** Remove a previously registered constraint group. Schedules a rebuild. */
    deleteConstraints(constraints: ReadonlyArray<kiwi.Constraint>) {
        if (this.constraints.delete(constraints)) {
            //console.log(`Scheduling rebuild removed constraints: ${constraints}`);
            this.scheduleRebuild();
        }
    }

    /** Register an edit variable at the given constraint strength. Schedules a rebuild. */
    addEditVariable(editVar: Variable, strength: number, value?: number) {
        if (this.editVariables.has(editVar)) {
            return;
        }
        this.editVariables.set(editVar, [strength, value]);
        //console.log(`Scheduling rebuild new editvar: ${editVar}`);
        this.scheduleRebuild();
    }

    /** Remove an edit variable. Schedules a rebuild. */
    deleteEditVariable(editVar: Variable) {
        if (this.editVariables.delete(editVar)) {
            //console.log(`Scheduling rebuild removed editvar: ${editVar}`);
            this.scheduleRebuild();
        }
    }

    /** Return `true` if `editVar` is currently registered as an edit variable. */
    hasEditVar(editVar: Variable): boolean { return this.editVariables.has(editVar); }

    /** Stage a suggested value for an edit variable; applied on the next solve. */
    suggestValue(editVar: Variable, value: number) {
        const entry = this.editVariables.get(editVar);
        if (!entry) throw new Error(`Variable ${editVar} not registered as an edit variable`);
        this.editVariables.set(editVar, [entry[0], value]);
    }

    protected applyEditVars() {
        for (const [editVar, [_, value]] of this.editVariables) {
            if (value !== undefined) this.inner.suggestValue(editVar, value);
        }
    }

    /** Mark the solver for a full rebuild and schedule an async solve. */
    scheduleRebuild() {
        this.needsRebuild = true;
        this.scheduleSolve();
    }

    /** Schedule an async solve via `setTimeout(0)`, debouncing multiple rapid calls into one. */
    scheduleSolve() {
        clearTimeout(this.solveTimeout);
        this.solveTimeout = setTimeout(() => {
            this.solve(); this.solveTimeout = 0;
        }, 0);
    }

    /** Register a callback invoked after every solve. */
    onSolve(cb: () => void) { this.solveCallbacks.set(cb, true); }
    /** Register a callback invoked once after the next solve, then removed. */
    onSolveOnce(cb: () => void) { this.solveCallbacks.set(cb, false); }
    /** Remove a previously registered solve callback. */
    removeOnSolve(cb: () => void) { this.solveCallbacks.delete(cb); }
}