import { describe, expect, test } from 'vitest';
import { Transform1D, Transform2D } from './transform';

function expectArrayCloseTo(actual: readonly number[], expected: readonly number[], numDigits: number = 6) {
    expect(actual.length).toEqual(expected.length);
    for (let i = 0; i < expected.length; i++) {
        expect(actual[i]).toBeCloseTo(expected[i], numDigits);
    }
}

describe('Transform1D', () => {
    describe('constructor', () => {
        test('defaults to identity', () => {
            const t = new Transform1D();
            expect(t.k).toBeCloseTo(1.0, 6);
            expect(t.p).toBeCloseTo(0.0, 6);
        });

        test('sets k and p', () => {
            const t = new Transform1D(2.0, 3.0);
            expect(t.k).toBeCloseTo(2.0, 6);
            expect(t.p).toBeCloseTo(3.0, 6);
        });
    });

    describe('apply', () => {
        test('identity leaves value unchanged', () => {
            expect(new Transform1D().apply(5.0)).toBeCloseTo(5.0, 6);
        });

        test('applies k*x + p to a scalar', () => {
            expect(new Transform1D(2.0, 3.0).apply(4.0)).toBeCloseTo(11.0, 6);
        });

        test('applies to an array', () => {
            const result = new Transform1D(2.0, 3.0).apply([1.0, 2.0, 3.0]);
            expectArrayCloseTo(result, [5.0, 7.0, 9.0]);
        });
    });

    describe('unapply', () => {
        test('identity leaves value unchanged', () => {
            expect(new Transform1D().unapply(5.0)).toBeCloseTo(5.0, 6);
        });

        test('inverts k*x + p for a scalar', () => {
            expect(new Transform1D(2.0, 3.0).unapply(11.0)).toBeCloseTo(4.0, 6);
        });

        test('inverts element-wise for an array', () => {
            const result = new Transform1D(2.0, 3.0).unapply([5.0, 7.0, 9.0]);
            expectArrayCloseTo(result, [1.0, 2.0, 3.0]);
        });

        test('apply then unapply round-trips', () => {
            const t = new Transform1D(3.0, -7.0);
            expect(t.unapply(t.apply(42.0))).toBeCloseTo(42.0, 6);
        });
    });

    describe('translate', () => {
        test('shifts p by x, preserves k', () => {
            const t = new Transform1D(2.0, 3.0).translate(10.0);
            expect(t.k).toBeCloseTo(2.0, 6);
            expect(t.p).toBeCloseTo(13.0, 6);
        });

        test('is immutable', () => {
            const orig = new Transform1D(2.0, 3.0);
            orig.translate(10.0);
            expect(orig.p).toBeCloseTo(3.0, 6);
        });
    });

    describe('scale', () => {
        test('multiplies k, preserves p', () => {
            const t = new Transform1D(2.0, 3.0).scale(4.0);
            expect(t.k).toBeCloseTo(8.0, 6);
            expect(t.p).toBeCloseTo(3.0, 6);
        });

        test('is immutable', () => {
            const orig = new Transform1D(2.0, 3.0);
            orig.scale(4.0);
            expect(orig.k).toBeCloseTo(2.0, 6);
        });
    });

    describe('invert', () => {
        test('identity inverts to identity', () => {
            const inv = new Transform1D().invert();
            expect(inv.k).toBeCloseTo(1.0, 6);
            expect(inv.p).toBeCloseTo(0.0, 6);
        });

        test('computes 1/k and -p/k', () => {
            const inv = new Transform1D(2.0, 3.0).invert();
            expect(inv.k).toBeCloseTo(0.5, 6);
            expect(inv.p).toBeCloseTo(-1.5, 6);
        });

        test('compose with inverse yields identity', () => {
            const t = new Transform1D(3.0, -7.0);
            const id = t.compose(t.invert());
            expect(id.k).toBeCloseTo(1.0, 6);
            expect(id.p).toBeCloseTo(0.0, 6);
        });
    });

    describe('compose', () => {
        test('composing with identity leaves transform unchanged', () => {
            const t = new Transform1D(2.0, 3.0);
            const id = new Transform1D();
            expect(t.compose(id).k).toBeCloseTo(t.k, 6);
            expect(t.compose(id).p).toBeCloseTo(t.p, 6);
            expect(id.compose(t).k).toBeCloseTo(t.k, 6);
            expect(id.compose(t).p).toBeCloseTo(t.p, 6);
        });

        test('applies this first then other', () => {
            // t1: x → 2x + 3,  t2: x → 4x + 5
            // composed: x → 4(2x+3)+5 = 8x+17
            const t1 = new Transform1D(2.0, 3.0);
            const t2 = new Transform1D(4.0, 5.0);
            const c = t1.compose(t2);
            expect(c.k).toBeCloseTo(8.0, 6);
            expect(c.p).toBeCloseTo(17.0, 6);
        });

        test('composed apply matches sequential apply', () => {
            const t1 = new Transform1D(2.0, 3.0);
            const t2 = new Transform1D(4.0, 5.0);
            const x = 7.0;
            expect(t1.compose(t2).apply(x)).toBeCloseTo(t2.apply(t1.apply(x)), 6);
        });
    });
});

describe('Transform2D', () => {
    describe('constructor', () => {
        test('defaults to identity', () => {
            const t = new Transform2D();
            expectArrayCloseTo(t.k, [1.0, 1.0]);
            expectArrayCloseTo(t.p, [0.0, 0.0]);
        });

        test('sets k and p', () => {
            const t = new Transform2D([2.0, 3.0], [4.0, 5.0]);
            expectArrayCloseTo(t.k, [2.0, 3.0]);
            expectArrayCloseTo(t.p, [4.0, 5.0]);
        });
    });

    describe('toBounds', () => {
        test('maps unit box to given bounds', () => {
            const t = Transform2D.toBounds([0.0, 10.0], [0.0, 5.0]);
            const r0 = t.apply([0.0, 0.0]);
            const r1 = t.apply([1.0, 1.0]);
            expectArrayCloseTo(r0, [0.0, 0.0]);
            expectArrayCloseTo(r1, [10.0, 5.0]);
        });

        test('handles non-zero origin', () => {
            const t = Transform2D.toBounds([2.0, 4.0], [1.0, 3.0]);
            const r0 = t.apply([0.0, 0.0]);
            const r1 = t.apply([1.0, 1.0]);
            expectArrayCloseTo(r0, [2.0, 1.0]);
            expectArrayCloseTo(r1, [4.0, 3.0]);
        });
    });

    describe('fromBounds', () => {
        test('maps given bounds to unit box', () => {
            const t = Transform2D.fromBounds([0.0, 10.0], [0.0, 5.0]);
            const r0 = t.apply([0.0, 0.0]);
            const r1 = t.apply([10.0, 5.0]);
            expectArrayCloseTo(r0, [0.0, 0.0]);
            expectArrayCloseTo(r1, [1.0, 1.0]);
        });

        test('is inverse of toBounds', () => {
            const xlim: [number, number] = [2.0, 6.0];
            const ylim: [number, number] = [-1.0, 3.0];
            const pt: [number, number] = [4.0, 1.0];
            const roundtrip = Transform2D.fromBounds(xlim, ylim).apply(
                Transform2D.toBounds(xlim, ylim).apply(pt)
            );
            expectArrayCloseTo(roundtrip, pt);
        });
    });

    describe('from_1d', () => {
        test('combines two Transform1D into a Transform2D', () => {
            const tx = new Transform1D(2.0, 3.0);
            const ty = new Transform1D(4.0, 5.0);
            const t = Transform2D.from_1d(tx, ty);
            expectArrayCloseTo(t.k, [2.0, 4.0]);
            expectArrayCloseTo(t.p, [3.0, 5.0]);
        });
    });

    describe('to_1d', () => {
        test('splits into two Transform1D instances', () => {
            const t = new Transform2D([2.0, 4.0], [3.0, 5.0]);
            const [tx, ty] = t.to_1d();
            expectArrayCloseTo([tx.k, tx.p], [2.0, 3.0]);
            expectArrayCloseTo([ty.k, ty.p], [4.0, 5.0]);
        });

        test('round-trips with from_1d', () => {
            const tx = new Transform1D(2.0, 3.0);
            const ty = new Transform1D(4.0, 5.0);
            const [rx, ry] = Transform2D.from_1d(tx, ty).to_1d();
            expectArrayCloseTo([rx.k, rx.p], [2.0, 3.0]);
            expectArrayCloseTo([ry.k, ry.p], [4.0, 5.0]);
        });
    });

    describe('pretranslate', () => {
        test('shifts in input space (scales x/y by k before adding)', () => {
            // p_new = [x*kx + px, y*ky + py]
            const t = new Transform2D([2.0, 3.0], [1.0, 2.0]).pretranslate(5.0, 6.0);
            expectArrayCloseTo(t.k, [2.0, 3.0]);
            expectArrayCloseTo(t.p, [11.0, 20.0]);
        });

        test('identity pretranslate equals translate', () => {
            const a = new Transform2D().pretranslate(3.0, 4.0);
            const b = new Transform2D().translate(3.0, 4.0);
            expectArrayCloseTo(a.k, b.k);
            expectArrayCloseTo(a.p, b.p);
        });
    });

    describe('translate', () => {
        test('adds (x, y) to p, preserves k', () => {
            const t = new Transform2D([2.0, 3.0], [1.0, 2.0]).translate(5.0, 6.0);
            expectArrayCloseTo(t.k, [2.0, 3.0]);
            expectArrayCloseTo(t.p, [6.0, 8.0]);
        });

        test('identity translate sets p directly', () => {
            const t = new Transform2D().translate(3.0, 4.0);
            expectArrayCloseTo(t.p, [3.0, 4.0]);
        });

        test('is immutable', () => {
            const orig = new Transform2D([1.0, 1.0], [0.0, 0.0]);
            orig.translate(5.0, 6.0);
            expectArrayCloseTo(orig.p, [0.0, 0.0]);
        });
    });

    describe('scale', () => {
        test('multiplies k element-wise, preserves p', () => {
            const t = new Transform2D([2.0, 3.0], [1.0, 2.0]).scale(4.0, 5.0);
            expectArrayCloseTo(t.k, [8.0, 15.0]);
            expectArrayCloseTo(t.p, [1.0, 2.0]);
        });

        test('omitting ky uses kx for both axes', () => {
            const t = new Transform2D().scale(3.0, undefined);
            expectArrayCloseTo(t.k, [3.0, 3.0]);
        });
    });

    describe('apply', () => {
        test('identity leaves point unchanged', () => {
            const r = new Transform2D().apply([3.0, 4.0]);
            expectArrayCloseTo(r, [3.0, 4.0]);
        });

        test('applies kx*x + px and ky*y + py independently', () => {
            const r = new Transform2D([2.0, 3.0], [1.0, 2.0]).apply([5.0, 6.0]);
            expectArrayCloseTo(r, [11.0, 20.0]);
        });
    });

    describe('unapply', () => {
        test('identity leaves point unchanged', () => {
            const r = new Transform2D().unapply([3.0, 4.0]);
            expectArrayCloseTo(r, [3.0, 4.0]);
        });

        test('inverts apply', () => {
            const t = new Transform2D([2.0, 3.0], [1.0, 2.0]);
            const pt: [number, number] = [5.0, 6.0];
            expectArrayCloseTo(t.unapply(t.apply(pt)), pt);
        });
    });

    describe('xlim', () => {
        test('defaults to [0, 1] extent on identity', () => {
            const r = new Transform2D().xlim();
            expectArrayCloseTo(r, [0.0, 1.0]);
        });

        test('maps extent through kx and px', () => {
            // Transform2D([2,3],[1,2]).xlim([0,2]) → [0*2+1, 2*2+1] = [1, 5]
            const r = new Transform2D([2.0, 3.0], [1.0, 2.0]).xlim([0.0, 2.0]);
            expectArrayCloseTo(r, [1.0, 5.0]);
        });

        test('uses kx for both ends of default extent', () => {
            const r = new Transform2D([2.0, 3.0], [1.0, 2.0]).xlim();
            expectArrayCloseTo(r, [1.0, 3.0]);
        });
    });

    describe('ylim', () => {
        test('defaults to [0, 1] extent on identity', () => {
            const r = new Transform2D().ylim();
            expectArrayCloseTo(r, [0.0, 1.0]);
        });

        test('maps extent through ky and py', () => {
            const r = new Transform2D([2.0, 3.0], [1.0, 2.0]).ylim();
            expectArrayCloseTo(r, [2.0, 5.0]);
        });
    });

    describe('invert', () => {
        test('identity inverts to identity', () => {
            const inv = new Transform2D().invert();
            expectArrayCloseTo(inv.k, [1.0, 1.0]);
            expectArrayCloseTo(inv.p, [0.0, 0.0]);
        });

        test('computes 1/k and -p/k per axis', () => {
            const inv = new Transform2D([2.0, 4.0], [1.0, 2.0]).invert();
            expectArrayCloseTo(inv.k, [0.5, 0.25]);
            expectArrayCloseTo(inv.p, [-0.5, -0.5]);
        });

        test('apply then invert round-trips', () => {
            const t = new Transform2D([2.0, 3.0], [1.0, 2.0]);
            const pt: [number, number] = [5.0, 6.0];
            expectArrayCloseTo(t.invert().apply(t.apply(pt)), pt);
        });
    });

    describe('compose', () => {
        test('composing with identity leaves transform unchanged', () => {
            const t = new Transform2D([2.0, 3.0], [1.0, 2.0]);
            const id = new Transform2D();
            expectArrayCloseTo(t.compose(id).k, t.k);
            expectArrayCloseTo(t.compose(id).p, t.p);
            expectArrayCloseTo(id.compose(t).k, t.k);
            expectArrayCloseTo(id.compose(t).p, t.p);
        });

        test('applies this first then other', () => {
            // t1: [x,y] → [2x+1, 3y+2],  t2: [x,y] → [4x+6, 5y+7]
            // composed: [x,y] → [4(2x+1)+6, 5(3y+2)+7] = [8x+10, 15y+17]
            const t1 = new Transform2D([2.0, 3.0], [1.0, 2.0]);
            const t2 = new Transform2D([4.0, 5.0], [6.0, 7.0]);
            const c = t1.compose(t2);
            expectArrayCloseTo(c.k, [8.0, 15.0]);
            expectArrayCloseTo(c.p, [10.0, 17.0]);
        });

        test('composed apply matches sequential apply', () => {
            const t1 = new Transform2D([2.0, 3.0], [1.0, 2.0]);
            const t2 = new Transform2D([4.0, 5.0], [6.0, 7.0]);
            const pt: [number, number] = [7.0, 8.0];
            expectArrayCloseTo(t1.compose(t2).apply(pt), t2.apply(t1.apply(pt)));
        });
    });

    describe('toString', () => {
        test('identity produces zero translate and unit scale', () => {
            expect(new Transform2D().toString()).toBe('translate(0, 0) scale(1, 1)');
        });

        test('formats translate and scale from k and p', () => {
            expect(new Transform2D([2.5, 3.0], [4.0, 5.8]).toString())
                .toEqual('translate(4, 5.8) scale(2.5, 3)');
        });
    });
});
