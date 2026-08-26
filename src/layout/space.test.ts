import { describe, test, expect } from 'vitest';
import { createStore } from 'jotai';
import * as kiwi from '@lume/kiwi';
import Solver from './Solver';
import Variable from './Variable';

type Store = ReturnType<typeof createStore>;

function makeVar(name: string, store: Store): Variable { return new Variable(name, store); }
function eq(a: kiwi.Variable | kiwi.Expression, b: kiwi.Variable | kiwi.Expression | number): kiwi.Constraint {
    return new kiwi.Constraint(a as kiwi.Expression, kiwi.Operator.Eq, b, kiwi.Strength.required);
}

/**
 * One level of `Centered`'s geometry, hand-built: `width + 2*slack == parent`, and the free space
 * it donates downward is `parent_space + 2*slack`.
 */
function centered(
    solver: Solver, store: Store, name: string,
    parent: kiwi.Variable | kiwi.Expression, parent_space: kiwi.Expression,
    min: number,
): {width: Variable, space: kiwi.Expression} {
    const slack = makeVar(`${name}-space`, store);
    const width = makeVar(`${name}-inner-width`, store);

    solver.addConstraints([
        new kiwi.Constraint(slack, kiwi.Operator.Ge, min),
        eq(width.plus(slack.multiply(2)), parent),
    ]);
    return {width, space: parent_space.plus(slack.multiply(2))};
}

/** Evaluate a solved expression by summing its terms out of the store. */
function value(store: Store, expr: kiwi.Expression): number {
    let val = expr.constant();
    const terms = expr.terms().array;
    for (const term of terms) val += store.get((term.first as Variable).atom) * term.second;
    return val;
}

describe('free space', () => {
    /*
     * `Centered` donates its padding to children as free space, so a descendant's total room
     * (`width + x_space`) must come out equal to the nearest ancestor with a definite size,
     * however the slack happens to be split between padding and content.
     *
     * `FlexBox` reflows against exactly that quantity. If it moved with the content, the wrap
     * threshold would chase its own output — wrap, content narrows, threshold drops, wrap again.
     */

    /** Solve a `Centered` holding a child that hugs `content` px at `hug` strength. */
    function solveCentered(container_px: number, content_px: number, hug: number) {
        const store = createStore();
        const solver = new Solver(store);
        const container = makeVar('container', store);
        solver.addConstraints([eq(container, container_px)]);

        const {width, space} = centered(solver, store, 'centered', container, new kiwi.Expression(0.0), 0.0);
        solver.addConstraints([
            new kiwi.Constraint(width, kiwi.Operator.Ge, content_px, kiwi.Strength.strong),
            new kiwi.Constraint(width, kiwi.Operator.Le, content_px, hug),
        ]);
        solver.solve();

        return {width: store.get(width.atom), space: value(store, space)};
    }

    test('room telescopes to the definite ancestor however the slack is distributed', () => {
        const cases = [
            {content: 120.0, hug: kiwi.Strength.strong},
            {content: 120.0, hug: kiwi.Strength.weak},
            {content: 380.0, hug: kiwi.Strength.medium},
            {content: 590.0, hug: kiwi.Strength.weak},
        ];
        const widths = new Set<number>();

        for (const {content, hug} of cases) {
            const {width, space} = solveCentered(600.0, content, hug);
            expect(width + space, `content=${content} hug=${hug}`).toBeCloseTo(600.0);
            widths.add(Math.round(width));
        }

        // the allotment really did move between cases, so the invariant above isn't vacuous
        expect(widths.size).toBeGreaterThan(1);
    });

    test('donations compose across nested containers', () => {
        const store = createStore();
        const solver = new Solver(store);
        const container = makeVar('container', store);
        solver.addConstraints([eq(container, 600.0)]);

        const outer = centered(solver, store, 'outer', container, new kiwi.Expression(0.0), 10.0);
        const inner = centered(solver, store, 'inner', outer.width, outer.space, 25.0);

        // the innermost child hugs a small content size, pushing slack into *both* ancestors
        solver.addConstraints([
            new kiwi.Constraint(inner.width, kiwi.Operator.Ge, 100.0, kiwi.Strength.strong),
            new kiwi.Constraint(inner.width, kiwi.Operator.Le, 100.0, kiwi.Strength.weak),
        ]);
        solver.solve();

        expect(store.get(inner.width.atom)).toBeCloseTo(100.0);
        // both levels' padding is visible to the child, so room is still the full container
        expect(store.get(inner.width.atom) + value(store, inner.space)).toBeCloseTo(600.0);
        // ...and the minimum padding at each level was respected
        expect(store.get(outer.width.atom)).toBeLessThanOrEqual(600.0 - 2.0 * 10.0 + 1e-6);
        expect(store.get(inner.width.atom)).toBeLessThanOrEqual(store.get(outer.width.atom) - 2.0 * 25.0 + 1e-6);
    });

    test('a container that spends its space rather than holding it donates nothing', () => {
        // `MarginBox` forwards free space unchanged: margins are consumed, so room shrinks with them.
        const store = createStore();
        const solver = new Solver(store);
        const container = makeVar('container', store);
        const width = makeVar('margin-inner-width', store);
        solver.addConstraints([
            eq(container, 600.0),
            eq(width.plus(80.0).plus(20.0), container),
        ]);
        solver.solve();

        const space = new kiwi.Expression(0.0); // forwarded from the root, which donates nothing
        expect(store.get(width.atom) + value(store, space)).toBeCloseTo(500.0);
    });
});
