import * as kiwi from '@lume/kiwi';
import { PrimitiveAtom, useStore, atom } from "jotai";

import Variable from "./Variable";

type Store = ReturnType<typeof useStore>;
type Timeout = ReturnType<typeof setTimeout>;

function strengthLabel(s: number): string {
    if (s >= kiwi.Strength.required) return 'required';
    if (s >= kiwi.Strength.strong)   return 'strong';
    if (s >= kiwi.Strength.medium)   return 'medium';
    return 'weak';
}

/** Verbosity threshold for {@link Solver} diagnostics. Ordered `silent < error < warn < info < debug`. */
export type SolverLogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug';

/** Broad grouping of solver events, useful for filtering in a custom sink. */
export type SolverLogCategory = 'lifecycle' | 'constraints' | 'edit' | 'solve';

/** A single structured diagnostic event emitted by the {@link Solver}. */
export interface SolverLogEvent {
    level: Exclude<SolverLogLevel, 'silent'>;
    category: SolverLogCategory;
    /** Short human-readable message (already formatted). */
    message: string;
    /** Structured payload for programmatic sinks (counts, timings, names). */
    data?: Record<string, unknown>;
}

/** A pluggable destination for {@link SolverLogEvent}s. */
export type SolverLogSink = (event: SolverLogEvent) => void;

const LOG_LEVEL_ORDER: Record<SolverLogLevel, number> = {
    silent: 0,
    error: 1,
    warn: 2,
    info: 3,
    debug: 4,
};

/** Default sink: prints to `console.debug/info/warn/error`, prefixed `[plotlib:solver]`. */
const consoleSink: SolverLogSink = (event) => {
    const method = event.level === 'debug' ? console.debug
        : event.level === 'info' ? console.info
        : event.level === 'warn' ? console.warn
        : console.error;
    if (event.data !== undefined) {
        method(`[plotlib:solver] ${event.message}`, event.data);
    } else {
        method(`[plotlib:solver] ${event.message}`);
    }
};


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
    private solveTimeout: Timeout | null = null;

    private solveCallbacks: Map<() => void, boolean>;

    /** Verbosity threshold for diagnostics emitted via {@link log}. Mutable at runtime. */
    public logLevel: SolverLogLevel;
    private sink: SolverLogSink;

    /** Number of times {@link solveInner} has run. */
    public solveCount: number = 0;
    /** Number of times {@link rebuild} has run. */
    public rebuildCount: number = 0;

    constructor(store: Store, options?: { logLevel?: SolverLogLevel, sink?: SolverLogSink }) {
        this.store = store;
        this.inner = new kiwi.Solver();
        this.constraints = new Set();
        this.editVariables = new Map();
        this.solveCallbacks = new Map();
        this.logLevel = options?.logLevel ?? 'silent';
        this.sink = options?.sink ?? consoleSink;
    }

    /** Replace the diagnostic sink at runtime. Omit `sink` to restore the default console sink. */
    setSink(sink?: SolverLogSink) {
        this.sink = sink ?? consoleSink;
    }

    /**
     * Emit a structured diagnostic event if `level` is at or above {@link logLevel}, otherwise a
     * cheap no-op. Public so other layout code (e.g. `Constrained`'s resize handler) and consumers
     * using {@link useSolver} can feed events into the same stream.
     */
    log(level: Exclude<SolverLogLevel, 'silent'>, category: SolverLogCategory, message: string, data?: Record<string, unknown>) {
        if (LOG_LEVEL_ORDER[level] > LOG_LEVEL_ORDER[this.logLevel]) return;
        this.emit(level, category, message, data);
    }

    /** Emit a structured diagnostic event unconditionally, bypassing the {@link logLevel} threshold. */
    private emit(level: Exclude<SolverLogLevel, 'silent'>, category: SolverLogCategory, message: string, data?: Record<string, unknown>) {
        this.sink({ level, category, message, data });
    }

    /** Recreate the inner kiwi solver from scratch with all registered constraints and edit variables. */
    rebuild() {
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
        this.rebuildCount++;
        this.log('info', 'lifecycle', 'rebuild', {
            constraintGroups: this.constraints.size,
            editVars: this.editVariables.size,
            rebuildCount: this.rebuildCount,
        });
        this.solveInner();
    }

    /** Run the solver, rebuilding first if constraints or edit variables have changed. */
    solve() {
        this.log('debug', 'solve', 'solve', { needsRebuild: this.needsRebuild });
        if (this.needsRebuild) {
            this.rebuild();
        } else {
            this.solveInner();
        }
    }

    protected solveInner() {
        const start = performance.now();
        try {
            this.applyEditVars();
            this.inner.updateVariables();
        } catch (e) {
            this.log('error', 'solve', 'solve failed', { error: e instanceof Error ? e.message : String(e) });
            throw e;
        }
        this.solveCount++;
        this.log('debug', 'solve', 'solved', {
            durationMs: performance.now() - start,
            solveCount: this.solveCount,
        });

        // call callbacks
        for (const [cb, keep] of this.solveCallbacks) {
            cb();
            if (!keep) this.solveCallbacks.delete(cb)
        }
    }

    /**
     * Emit one event per active constraint and its current strength/value (for debugging).
     * Emitted at `info` level regardless of {@link logLevel} — this is an explicit, user-invoked dump.
     */
    printConstraints() {
        for (const constraint of this.inner.getConstraints()) {
            const strength = strengthLabel(constraint.strength());
            this.emit('info', 'constraints', `[${strength}] ${constraint.toString()}`, {
                strength, text: constraint.toString(),
            });
        }
    }

    /**
     * Emit one event per solver variable and its current solved value.
     * Emitted at `info` level regardless of {@link logLevel} — this is an explicit, user-invoked dump.
     */
    printVariables() {
        for (const [variable, [strength]] of this.editVariables.entries()) {
            this.emit('info', 'edit', `edit [${strengthLabel(strength)}] ${variable.name()} = ${variable.value()}`, {
                name: variable.name(), value: variable.value(), kind: 'edit',
            });
        }
        for (const constraint of this.inner.getConstraints()) {
            const expr = constraint.expression();
            const terms = expr.terms();
            for (let i = 0; i < terms.size(); i++) {
                const v = terms.itemAt(i).first as kiwi.Variable;
                if (!this.editVariables.has(v as any)) {
                    this.emit('info', 'solve', `var  ${v.name()} = ${v.value()}`, {
                        name: v.name(), value: v.value(), kind: 'var',
                    });
                }
            }
        }
    }

    /** Register a group of constraints. Schedules a rebuild if the group is new. */
    addConstraints(constraints: ReadonlyArray<kiwi.Constraint>) {
        if (this.constraints.has(constraints)) {
            return;
        }
        this.constraints.add(constraints);
        this.log('debug', 'constraints', 'add', { count: constraints.length });
        this.scheduleRebuild();
    }

    /** Remove a previously registered constraint group. Schedules a rebuild. */
    deleteConstraints(constraints: ReadonlyArray<kiwi.Constraint>) {
        if (this.constraints.delete(constraints)) {
            this.log('debug', 'constraints', 'delete', { count: constraints.length });
            this.scheduleRebuild();
        }
    }

    /** Register an edit variable at the given constraint strength. Schedules a rebuild. */
    addEditVariable(editVar: Variable, strength: number, value?: number) {
        if (this.editVariables.has(editVar)) {
            return;
        }
        this.editVariables.set(editVar, [strength, value]);
        this.log('debug', 'edit', 'add-edit', { name: editVar.name(), strength: strengthLabel(strength) });
        this.scheduleRebuild();
    }

    /** Remove an edit variable. Schedules a rebuild. */
    deleteEditVariable(editVar: Variable) {
        if (this.editVariables.delete(editVar)) {
            this.log('debug', 'edit', 'delete-edit', { name: editVar.name() });
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
        if (this.solveTimeout) clearTimeout(this.solveTimeout);
        this.solveTimeout = setTimeout(() => {
            this.solve(); this.solveTimeout = null;
        }, 0);
    }

    /** Register a callback invoked after every solve. */
    onSolve(cb: () => void) { this.solveCallbacks.set(cb, true); }
    /** Register a callback invoked once after the next solve, then removed. */
    onSolveOnce(cb: () => void) { this.solveCallbacks.set(cb, false); }
    /** Remove a previously registered solve callback. */
    removeOnSolve(cb: () => void) { this.solveCallbacks.delete(cb); }
}