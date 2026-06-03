import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { createStore } from 'jotai';
import * as kiwi from '@lume/kiwi';
import Solver from './Solver';
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
});
