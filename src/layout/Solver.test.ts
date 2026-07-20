import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { createStore } from 'jotai';
import * as kiwi from '@lume/kiwi';
import Solver, { SolverLogEvent } from './Solver';
import Variable from './Variable';

type Store = ReturnType<typeof createStore>;

function makeStore(): Store { return createStore(); }
function makeSolver(store: Store = makeStore()): Solver { return new Solver(store); }
function makeVar(name: string, store: Store): Variable { return new Variable(name, store); }
function eq(a: kiwi.Variable | kiwi.Expression, b: kiwi.Variable | kiwi.Expression | number): kiwi.Constraint {
    return new kiwi.Constraint(a as kiwi.Expression, kiwi.Operator.Eq, b, kiwi.Strength.required);
}

describe('Solver', () => {
    describe('addConstraints / deleteConstraints', () => {
        test('constraint is satisfied after solve()', () => {
            const store = makeStore();
            const solver = makeSolver(store);
            const x = makeVar('x', store);
            const constraints = [eq(x, 42)];

            solver.addConstraints(constraints);
            solver.solve();

            expect(store.get(x.atom)).toBeCloseTo(42.0);
        });

        test('adding same array reference twice is idempotent', () => {
            const store = makeStore();
            const solver = makeSolver(store);
            const x = makeVar('x', store);
            const constraints = [eq(x, 7)];

            solver.addConstraints(constraints);
            solver.addConstraints(constraints);
            solver.solve();

            expect(solver.inner.getConstraints().length).toBe(1);
            expect(store.get(x.atom)).toBeCloseTo(7.0);
        });

        test('deleting a constraint group allows a new conflicting constraint to be satisfied', () => {
            const store = makeStore();
            const solver = makeSolver(store);
            const x = makeVar('x', store);
            const first = [eq(x, 99)];
            const second = [eq(x, 42)];

            solver.addConstraints(first);
            solver.solve();
            expect(store.get(x.atom)).toBeCloseTo(99.0);

            // Remove old required constraint so the new one doesn't conflict
            solver.deleteConstraints(first);
            solver.addConstraints(second);
            solver.solve();

            expect(store.get(x.atom)).toBeCloseTo(42.0);
        });

        test('deleting a group that was never added is a no-op', () => {
            const solver = makeSolver();
            const constraints = [eq(new kiwi.Variable('x'), 1)];
            expect(() => solver.deleteConstraints(constraints)).not.toThrow();
        });

        test('multiple constraint groups are all applied', () => {
            const store = makeStore();
            const solver = makeSolver(store);
            const x = makeVar('x', store);
            const y = makeVar('y', store);
            const cx = [eq(x, 10)];
            const cy = [eq(y, 20)];

            solver.addConstraints(cx);
            solver.addConstraints(cy);
            solver.solve();

            expect(store.get(x.atom)).toBeCloseTo(10.0);
            expect(store.get(y.atom)).toBeCloseTo(20.0);
        });
    });

    describe('addEditVariable / suggestValue / solve', () => {
        test('suggested value is reflected after solve()', () => {
            const store = makeStore();
            const solver = makeSolver(store);
            const v = makeVar('v', store);

            solver.addEditVariable(v, kiwi.Strength.strong);
            solver.suggestValue(v, 100.0);
            solver.solve();

            expect(store.get(v.atom)).toBeCloseTo(100.0);
        });

        test('addEditVariable is idempotent for the same variable', () => {
            const store = makeStore();
            const solver = makeSolver(store);
            const v = makeVar('v', store);

            solver.addEditVariable(v, kiwi.Strength.strong);
            solver.addEditVariable(v, kiwi.Strength.strong);
            solver.suggestValue(v, 55.0);
            solver.solve();

            expect(store.get(v.atom)).toBeCloseTo(55.0);
        });

        test('hasEditVar returns true after adding, false before', () => {
            const store = makeStore();
            const solver = makeSolver(store);
            const v = makeVar('v', store);

            expect(solver.hasEditVar(v)).toBe(false);
            solver.addEditVariable(v, kiwi.Strength.strong);
            expect(solver.hasEditVar(v)).toBe(true);
        });

        test('suggestValue on unregistered variable throws', () => {
            const store = makeStore();
            const solver = makeSolver(store);
            const v = makeVar('v', store);

            expect(() => solver.suggestValue(v, 1.0)).toThrow();
        });

        test('updated suggestValue is reflected on next solve()', () => {
            const store = makeStore();
            const solver = makeSolver(store);
            const v = makeVar('v', store);

            solver.addEditVariable(v, kiwi.Strength.strong);
            solver.suggestValue(v, 10.0);
            solver.solve();
            expect(store.get(v.atom)).toBeCloseTo(10.0);

            solver.suggestValue(v, 200.0);
            solver.solve();
            expect(store.get(v.atom)).toBeCloseTo(200.0);
        });
    });

    describe('onSolve / onSolveOnce / removeOnSolve', () => {
        test('onSolve callback fires on every solve()', () => {
            const solver = makeSolver();
            const cb = vi.fn();

            solver.onSolve(cb);
            solver.solve();
            solver.solve();
            solver.solve();

            expect(cb).toHaveBeenCalledTimes(3);
        });

        test('onSolveOnce callback fires exactly once', () => {
            const solver = makeSolver();
            const cb = vi.fn();

            solver.onSolveOnce(cb);
            solver.solve();
            solver.solve();
            solver.solve();

            expect(cb).toHaveBeenCalledTimes(1);
        });

        test('removeOnSolve prevents future calls', () => {
            const solver = makeSolver();
            const cb = vi.fn();

            solver.onSolve(cb);
            solver.solve();
            expect(cb).toHaveBeenCalledTimes(1);

            solver.removeOnSolve(cb);
            solver.solve();
            solver.solve();
            expect(cb).toHaveBeenCalledTimes(1);
        });

        test('multiple callbacks all fire on solve()', () => {
            const solver = makeSolver();
            const cb1 = vi.fn();
            const cb2 = vi.fn();

            solver.onSolve(cb1);
            solver.onSolveOnce(cb2);
            solver.solve();

            expect(cb1).toHaveBeenCalledTimes(1);
            expect(cb2).toHaveBeenCalledTimes(1);

            solver.solve();
            expect(cb1).toHaveBeenCalledTimes(2);
            expect(cb2).toHaveBeenCalledTimes(1);
        });
    });

    describe('scheduleRebuild / scheduleSolve', () => {
        beforeEach(() => { vi.useFakeTimers(); });
        afterEach(() => { vi.useRealTimers(); });

        test('addConstraints triggers async rebuild and satisfies constraint', () => {
            const store = makeStore();
            const solver = makeSolver(store);
            const x = makeVar('x', store);

            solver.addConstraints([eq(x, 77)]);
            expect(store.get(x.atom)).toBeCloseTo(0.0);

            vi.runAllTimers();
            expect(store.get(x.atom)).toBeCloseTo(77.0);
        });

        test('multiple rapid addConstraints calls debounce to a single rebuild', () => {
            const store = makeStore();
            const solver = makeSolver(store);
            const rebuildSpy = vi.spyOn(solver, 'rebuild');

            const x = makeVar('x', store);
            const y = makeVar('y', store);

            solver.addConstraints([eq(x, 1)]);
            solver.addConstraints([eq(y, 2)]);
            solver.addConstraints([eq(x, 1)]);

            vi.runAllTimers();

            expect(rebuildSpy).toHaveBeenCalledTimes(1);
            expect(store.get(x.atom)).toBeCloseTo(1.0);
            expect(store.get(y.atom)).toBeCloseTo(2.0);
        });

        test('scheduleSolve without rebuild runs solve asynchronously', () => {
            const store = makeStore();
            const solver = makeSolver(store);
            const cb = vi.fn();

            solver.onSolve(cb);
            solver.scheduleSolve();
            expect(cb).not.toHaveBeenCalled();

            vi.runAllTimers();
            expect(cb).toHaveBeenCalledTimes(1);
        });
    });

    describe('logging', () => {
        test("default logLevel is 'silent' — a custom sink receives nothing during solve", () => {
            const store = makeStore();
            const events: SolverLogEvent[] = [];
            const solver = new Solver(store, { sink: (e) => events.push(e) });
            const x = makeVar('x', store);

            solver.addConstraints([eq(x, 1)]);
            solver.solve();

            expect(events).toHaveLength(0);
        });

        test("logLevel 'debug' emits solve/solved events with correct data, and increments solveCount", () => {
            const store = makeStore();
            const events: SolverLogEvent[] = [];
            const solver = new Solver(store, { logLevel: 'debug', sink: (e) => events.push(e) });
            const x = makeVar('x', store);

            // A rebuild-driven solve emits 'solved' (via solveInner) but no standalone 'solve' event.
            solver.addConstraints([eq(x, 1)]);
            solver.solve();

            const solvedEvents = events.filter(e => e.category === 'solve' && e.message === 'solved');
            expect(solvedEvents).toHaveLength(1);
            expect(solvedEvents[0].level).toBe('debug');
            expect(solvedEvents[0].data).toMatchObject({ solveCount: 1 });
            expect(typeof solvedEvents[0].data?.durationMs).toBe('number');
            expect(solver.solveCount).toBe(1);

            // A subsequent incremental solve (nothing pending a rebuild) emits the 'solve' event.
            events.length = 0;
            solver.solve();

            const solveEvents = events.filter(e => e.category === 'solve' && e.message === 'solve');
            expect(solveEvents).toHaveLength(1);
            expect(solveEvents[0]).toMatchObject({ level: 'debug', data: { reasons: [] } });
            expect(solver.solveCount).toBe(2);
        });

        test("logLevel 'info' suppresses debug events but still passes lifecycle rebuild events", () => {
            const store = makeStore();
            const events: SolverLogEvent[] = [];
            const solver = new Solver(store, { logLevel: 'info', sink: (e) => events.push(e) });
            const x = makeVar('x', store);

            solver.addConstraints([eq(x, 1)]);
            solver.solve();

            expect(events.some(e => e.level === 'debug')).toBe(false);
            const rebuildEvents = events.filter(e => e.category === 'lifecycle' && e.message === 'rebuild');
            expect(rebuildEvents).toHaveLength(1);
            expect(rebuildEvents[0].level).toBe('info');
            expect(rebuildEvents[0].data).toMatchObject({ constraintGroups: 1, editVars: 0, rebuildCount: 1 });
            expect(solver.rebuildCount).toBe(1);
        });

        test('addConstraints and addEditVariable emit debug events with correct counts', () => {
            const store = makeStore();
            const events: SolverLogEvent[] = [];
            const solver = new Solver(store, { logLevel: 'debug', sink: (e) => events.push(e) });
            const x = makeVar('x', store);
            const y = makeVar('y', store);

            solver.addConstraints([eq(x, 1), eq(y, 2)]);
            solver.addEditVariable(y, kiwi.Strength.strong);

            const addConstraintsEvent = events.find(e => e.category === 'constraints' && e.message === 'add');
            expect(addConstraintsEvent?.data).toEqual({ count: 2 });

            const addEditEvent = events.find(e => e.category === 'edit' && e.message === 'add-edit');
            expect(addEditEvent?.data).toMatchObject({ name: 'y', strength: 'strong' });
        });

        test('printConstraints emits one info event per constraint via the sink, regardless of logLevel', () => {
            const store = makeStore();
            const events: SolverLogEvent[] = [];
            // default logLevel is 'silent' — print* must emit anyway.
            const solver = new Solver(store, { sink: (e) => events.push(e) });
            const x = makeVar('x', store);
            const y = makeVar('y', store);

            solver.addConstraints([eq(x, 1), eq(y, 2)]);
            solver.solve();
            events.length = 0;

            solver.printConstraints();

            expect(events).toHaveLength(2);
            for (const e of events) {
                expect(e.level).toBe('info');
                expect(e.category).toBe('constraints');
                expect(e.data).toEqual({ strength: 'required', text: expect.any(String) });
            }
        });

        test('printVariables emits one event per edit variable and per non-edit variable via the sink', () => {
            const store = makeStore();
            const events: SolverLogEvent[] = [];
            const solver = new Solver(store, { sink: (e) => events.push(e) });
            const x = makeVar('x', store);
            const y = makeVar('y', store);

            solver.addEditVariable(x, kiwi.Strength.strong, 5.0);
            solver.addConstraints([eq(y, 2)]);
            solver.solve();
            events.length = 0;

            solver.printVariables();

            const editEvents = events.filter(e => e.data?.kind === 'edit');
            const varEvents = events.filter(e => e.data?.kind === 'var');

            expect(editEvents).toHaveLength(1);
            expect(editEvents[0]).toMatchObject({ level: 'info', category: 'edit', data: { name: 'x', kind: 'edit' } });

            expect(varEvents.some(e => e.data?.name === 'y')).toBe(true);
            expect(varEvents.every(e => e.category === 'solve')).toBe(true);
        });

        test("a rebuild-driven solve reports reason 'initial solve'", () => {
            const store = makeStore();
            const events: SolverLogEvent[] = [];
            const solver = new Solver(store, { logLevel: 'debug', sink: (e) => events.push(e) });
            const x = makeVar('x', store);

            solver.addConstraints([eq(x, 1)]); // sets needsRebuild
            solver.solve();                     // needsRebuild ⇒ rebuild ⇒ solveInner with ['initial solve']

            const solved = events.find(e => e.message === 'solved');
            expect(solved?.data?.reasons).toEqual(['initial solve']);
        });

        describe('scheduleSolve reasons', () => {
            beforeEach(() => { vi.useFakeTimers(); });
            afterEach(() => { vi.useRealTimers(); });

            test('a scheduleSolve reason is reported on the resulting solved event', () => {
                const store = makeStore();
                const events: SolverLogEvent[] = [];
                const solver = new Solver(store, { logLevel: 'debug', sink: (e) => events.push(e) });
                const x = makeVar('x', store);

                solver.addConstraints([eq(x, 1)]);
                vi.runAllTimers();       // initial rebuild + solve
                events.length = 0;

                solver.scheduleSolve('resize svg#plot');
                vi.runAllTimers();

                const solved = events.filter(e => e.message === 'solved');
                expect(solved).toHaveLength(1);
                expect(solved[0].data?.reasons).toEqual(['resize svg#plot']);
            });

            test('coalesced scheduleSolve reasons are collected on the single solve', () => {
                const store = makeStore();
                const events: SolverLogEvent[] = [];
                const solver = new Solver(store, { logLevel: 'debug', sink: (e) => events.push(e) });
                const x = makeVar('x', store);

                solver.addConstraints([eq(x, 1)]);
                vi.runAllTimers();
                events.length = 0;

                solver.scheduleSolve('a');
                solver.scheduleSolve('b');
                solver.scheduleSolve('a'); // collected as-is (no dedup)
                vi.runAllTimers();

                const solved = events.filter(e => e.message === 'solved');
                expect(solved).toHaveLength(1);
                expect(solved[0].data?.reasons).toEqual(['a', 'b', 'a']);
            });
        });

        test('a kiwi error during solveInner emits an error-level event and the exception still propagates', () => {
            const store = makeStore();
            const events: SolverLogEvent[] = [];
            const solver = new Solver(store, { logLevel: 'error', sink: (e) => events.push(e) });
            const x = makeVar('x', store);

            // Simulate an inconsistent/unsatisfiable solver state: our wrapper believes
            // `x` is a registered edit variable with a pending suggested value, but the
            // underlying kiwi solver was never told about it (no rebuild ran). kiwi throws
            // synchronously from suggestValue — exactly the failure the try/catch around
            // applyEditVars()/updateVariables() in solveInner() is meant to surface.
            (solver as any).editVariables.set(x, [kiwi.Strength.strong, 5.0]);

            expect(() => (solver as any).solveInner()).toThrow();
            expect(events).toHaveLength(1);
            expect(events[0]).toMatchObject({ level: 'error', category: 'solve' });
            expect(typeof events[0].data?.error).toBe('string');
        });
    });
});
