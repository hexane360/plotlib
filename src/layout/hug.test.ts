import { describe, test, expect } from 'vitest';
import { createStore } from 'jotai';
import * as kiwi from '@lume/kiwi';
import Solver from './Solver';
import Variable from './Variable';
import { child_hug, HUG_BASE, HUG_MAX } from './hug';

type Store = ReturnType<typeof createStore>;

describe('child_hug', () => {
    test('multiplies by n_hugs + 1 below the cap', () => {
        expect(child_hug(HUG_BASE, 0)).toBe(HUG_BASE);
        expect(child_hug(HUG_BASE, 1)).toBeCloseTo(2.0 * HUG_BASE);
        expect(child_hug(HUG_BASE, 2)).toBeCloseTo(3.0 * HUG_BASE);
    });

    test('is strictly increasing in both arguments', () => {
        for (let n = 0; n < 4; n++) {
            expect(child_hug(HUG_BASE, n + 1)).toBeGreaterThan(child_hug(HUG_BASE, n));
            expect(child_hug(2.0 * HUG_BASE, n)).toBeGreaterThan(child_hug(HUG_BASE, n));
        }
    });

    test('saturates at HUG_MAX', () => {
        expect(child_hug(HUG_MAX, 5)).toBe(HUG_MAX);
        expect(child_hug(0.75 * HUG_MAX, 1)).toBe(HUG_MAX);
    });

    /*
     * The ceiling is not a matter of taste. `FlexBox`'s cover constraint drops from `strong` to
     * `medium` when wrapping, and a hug which beat it could crush a line below its content. The
     * floor matters for the opposite reason: kiwi treats objective coefficients below ~1e-8 as
     * zero, so a hug scaled down too far would silently stop applying.
     */
    test('the band clears both the medium tier above and kiwi\'s epsilon below', () => {
        expect(HUG_MAX * 10.0).toBeLessThanOrEqual(kiwi.Strength.medium);
        expect(HUG_BASE).toBeGreaterThan(1e-4);
    });

    test('a realistic chain stays inside the band', () => {
        // Constrained -> Grid -> GridItem -> FlexBox -> Centered
        const chain = [1, 1, 1, 2, 1];
        let hug = HUG_BASE;
        for (const n of chain) hug = child_hug(hug, n);
        expect(hug).toBeLessThan(HUG_MAX);
    });
});

describe('hug ordering', () => {
    /*
     * The load-bearing property: an inner hug outranks the outer hug holding the same slack, so
     * the allotment collapses to the child's content and the padding keeps the difference (which
     * it then donates back as free space -- see space.test.ts).
     */

    /**
     * A `Centered`-shaped cell of `container_px` around a child which hugs `content_px`.
     * `outer_hug` pulls the padding to zero; `inner_hug` pulls the allotment to the content.
     */
    function solve(container_px: number, content_px: number, outer_hug: number, inner_hug: number) {
        const store: Store = createStore();
        const solver = new Solver(store);
        const slack = new Variable('centered-x-space', store);
        const inner = new Variable('centered-inner-width', store);

        solver.addConstraints([
            new kiwi.Constraint(slack, kiwi.Operator.Ge, 0.0),
            new kiwi.Constraint(inner.plus(slack.multiply(2)), kiwi.Operator.Eq, container_px),
            // the child's content floor, and its hug back down onto it
            new kiwi.Constraint(inner, kiwi.Operator.Ge, content_px, kiwi.Strength.strong),
            new kiwi.Constraint(inner, kiwi.Operator.Le, content_px, inner_hug),
            // the parent preferring the child fill its cell
            new kiwi.Constraint(slack, kiwi.Operator.Le, 0.0, outer_hug),
        ]);
        solver.solve();

        return {inner: store.get(inner.atom), slack: store.get(slack.atom)};
    }

    test('the inner hug wins and the padding holds the slack', () => {
        const h = HUG_BASE;
        const {inner, slack} = solve(600.0, 400.0, h, child_hug(h, 1));
        expect(inner).toBeCloseTo(400.0);
        expect(slack).toBeCloseTo(100.0);
    });

    /*
     * `Centered` splits its slack two ways, so each pixel of padding buys two pixels of the
     * child's hug. That doubling works *for* the inner component: it wins the test above 4:1
     * rather than 2:1, and a one-rung outer advantage only ties here -- it cannot invert the
     * ordering. `GridItem` holds its slack on one side, so it is the geometry where a single
     * rung is exactly the margin, and where a flip is visible.
     */
    function solveOneSided(container_px: number, content_px: number, outer_hug: number, inner_hug: number) {
        const store: Store = createStore();
        const solver = new Solver(store);
        const slack = new Variable('griditem-x-space', store);
        const inner = new Variable('griditem-inner-width', store);

        solver.addConstraints([
            new kiwi.Constraint(slack, kiwi.Operator.Ge, 0.0),
            new kiwi.Constraint(inner.plus(slack), kiwi.Operator.Eq, container_px),
            new kiwi.Constraint(inner, kiwi.Operator.Ge, content_px, kiwi.Strength.strong),
            new kiwi.Constraint(inner, kiwi.Operator.Le, content_px, inner_hug),
            new kiwi.Constraint(slack, kiwi.Operator.Le, 0.0, outer_hug),
        ]);
        solver.solve();

        return {inner: store.get(inner.atom), slack: store.get(slack.atom)};
    }

    test('one rung is enough to decide an evenly-weighted contest', () => {
        const h = HUG_BASE;
        const {inner, slack} = solveOneSided(600.0, 400.0, h, child_hug(h, 1));
        expect(inner).toBeCloseTo(400.0);
        expect(slack).toBeCloseTo(200.0);
    });

    test('the ordering is what decides it, not the geometry', () => {
        // swap the two strengths: the outer hug now wins and stretches the child to fill
        const h = HUG_BASE;
        const {inner, slack} = solveOneSided(600.0, 400.0, child_hug(h, 1), h);
        expect(inner).toBeCloseTo(600.0);
        expect(slack).toBeCloseTo(0.0);
    });

    test('the (n+1) margin holds against a parent with a larger hug set', () => {
        // a `FlexBox`-shaped parent contributes two hugs on the main axis, so children get 3h.
        // Both of the parent's hugs push the same way here, which is exactly what (n+1) covers.
        const h = HUG_BASE;
        const store: Store = createStore();
        const solver = new Solver(store);
        const slack_a = new Variable('parent-slack-a', store);
        const slack_b = new Variable('parent-slack-b', store);
        const inner = new Variable('inner-width', store);

        solver.addConstraints([
            new kiwi.Constraint(slack_a, kiwi.Operator.Ge, 0.0),
            new kiwi.Constraint(slack_b, kiwi.Operator.Ge, 0.0),
            new kiwi.Constraint(inner.plus(slack_a).plus(slack_b), kiwi.Operator.Eq, 600.0),
            new kiwi.Constraint(inner, kiwi.Operator.Ge, 400.0, kiwi.Strength.strong),
            new kiwi.Constraint(inner, kiwi.Operator.Le, 400.0, child_hug(h, 2)),
            new kiwi.Constraint(slack_a, kiwi.Operator.Le, 0.0, h),
            new kiwi.Constraint(slack_b, kiwi.Operator.Le, 0.0, h),
        ]);
        solver.solve();

        expect(store.get(inner.atom)).toBeCloseTo(400.0);
        expect(store.get(slack_a.atom) + store.get(slack_b.atom)).toBeCloseTo(200.0);
    });
});
