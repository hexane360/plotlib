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

    constructor(store: Store) {
        this.store = store;
        this.inner = new kiwi.Solver();
        this.constraints = new Set();
        this.editVariables = new Map();
    }

    rebuild() {
        console.log("solver rebuild()")
        this.inner = new kiwi.Solver();
        for (const [editVar, [strength, value]] of this.editVariables.entries()) {
            this.inner.addEditVariable(editVar, strength);
            if (value) {
                this.inner.suggestValue(editVar, value);
            }
        }
        for (const constraints of this.constraints) {
            for (const constraint of constraints) {
                this.inner.addConstraint(constraint);
            }
        }
        this.needsRebuild = false;
        this.inner.updateVariables();
    }

    addConstraints(constraints: ReadonlyArray<kiwi.Constraint>) {
        if (this.constraints.has(constraints)) {
            return;
        }
        this.constraints.add(constraints);
        this.scheduleRebuild();
    }

    deleteConstraints(constraints: ReadonlyArray<kiwi.Constraint>) {
        if (this.constraints.delete(constraints)) {
            this.scheduleRebuild();
        }
    }

    addEditVariable(editVar: Variable, strength: number, value?: number) {
        if (this.editVariables.has(editVar)) {
            return;
        }
        this.editVariables.set(editVar, [strength, value]);
        this.scheduleRebuild();
    }

    deleteEditVariable(editVar: Variable) {
        if (this.editVariables.delete(editVar)) {
            this.scheduleRebuild();
        }
    }

    suggestValue(editVar: Variable, value: number) {
        const strength = this.editVariables.get(editVar)![0];
        this.editVariables.set(editVar, [strength, value]);
        if (!this.needsRebuild) {
            this.inner.suggestValue(editVar, value);
        }
    }

    solve() {
        console.log(`solve(), needsRebuild: ${this.needsRebuild}`);
        if (this.needsRebuild) {
            this.rebuild();
        } else {
            this.inner.updateVariables();
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
}