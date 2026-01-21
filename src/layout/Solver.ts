import * as kiwi from '@lume/kiwi';
import { PrimitiveAtom, useStore, atom } from "jotai";

import Variable from "./Variable";

type Store = ReturnType<typeof useStore>;


export default class Solver {
    public store: Store;
    public inner: kiwi.Solver;
    private constraints: Set<ReadonlyArray<kiwi.Constraint>>;
    // var => [strength, value]
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

    printConstraints() {
        for (const constraint of this.inner.getConstraints()) {
            console.log(`Constraint: ${constraint.toString()}`);
        }
    }

    addConstraints(constraints: ReadonlyArray<kiwi.Constraint>) {
        if (this.constraints.has(constraints)) {
            return;
        }
        //console.log(`Scheduling rebuild new constraints: ${constraints}`);
        this.constraints.add(constraints);
        this.scheduleRebuild();
    }

    deleteConstraints(constraints: ReadonlyArray<kiwi.Constraint>) {
        if (this.constraints.delete(constraints)) {
            //console.log(`Scheduling rebuild removed constraints: ${constraints}`);
            this.scheduleRebuild();
        }
    }

    addEditVariable(editVar: Variable, strength: number, value?: number) {
        if (this.editVariables.has(editVar)) {
            return;
        }
        this.editVariables.set(editVar, [strength, value]);
        //console.log(`Scheduling rebuild new editvar: ${editVar}`);
        this.scheduleRebuild();
    }

    deleteEditVariable(editVar: Variable) {
        if (this.editVariables.delete(editVar)) {
            //console.log(`Scheduling rebuild removed editvar: ${editVar}`);
            this.scheduleRebuild();
        }
    }

    suggestValue(editVar: Variable, value: number) {
        const strength = this.editVariables.get(editVar)![0];
        this.editVariables.set(editVar, [strength, value]);
    }

    protected applyEditVars() {
        for (const [editVar, [_, value]] of this.editVariables) {
            if (value !== undefined) this.inner.suggestValue(editVar, value);
        }
    }

    scheduleRebuild() {
        this.needsRebuild = true;
        this.scheduleSolve();
    }

    scheduleSolve() {
        clearTimeout(this.solveTimeout);
        this.solveTimeout = setTimeout(() => {
            this.solve(); this.solveTimeout = 0;
        }, 0);
    }

    onSolve(cb: () => void) { this.solveCallbacks.set(cb, true); }
    onSolveOnce(cb: () => void) { this.solveCallbacks.set(cb, false); }
    removeOnSolve(cb: () => void) { this.solveCallbacks.delete(cb); }
}