import { describe, expect, test } from 'vitest';
import { interpolateLab } from 'd3-interpolate';
import * as d3_scale from "d3-scale-chromatic";

import { linear, log } from './scale';
import { Transform1D } from './transform';

function expectCloseTo(actual: number, expected: number, numDigits = 6) {
    expect(actual).toBeCloseTo(expected, numDigits);
}

function expectArrayCloseTo(actual: readonly number[], expected: readonly number[], numDigits = 6) {
    expect(actual.length).toBe(expected.length);
    for (let i = 0; i < expected.length; i++) {
        expect(actual[i]).toBeCloseTo(expected[i], numDigits);
    }
}

type TypeGuards = { is_continuous(): boolean, is_spatial(): boolean, is_numeric(): boolean, is_discrete(): boolean };

function expectTypeGuards(scale: TypeGuards, expected: { continuous: boolean, spatial: boolean, numeric: boolean, discrete: boolean }) {
    expect(scale.is_continuous()).toBe(expected.continuous);
    expect(scale.is_spatial()).toBe(expected.spatial);
    expect(scale.is_numeric()).toBe(expected.numeric);
    expect(scale.is_discrete()).toBe(expected.discrete);
}

describe('linear', () => {
    describe('continuous scale', () => {
        const s = linear([-5, 5], [100, 200]);

        test('type guards', () => {
            expectTypeGuards(s, { continuous: true, spatial: true, numeric: true, discrete: false });
        });

        test('toString', () => {
            expect(s.toString()).toEqual("scale linear(domain: [-5, 5], range: [100, 200])");
        });

        describe('transform', () => {
            test('maps domain to range', () => {
                expectCloseTo(s.transform(-5), 100.0);
                expectCloseTo(s.transform(0), 150.0);
                expectCloseTo(s.transform(5), 200.0);
            });

            test('maps array of values', () => {
                expectArrayCloseTo(s.transform([-5, 0, 5]), [100.0, 150.0, 200.0]);
            });

            test('clip=true clamps to range endpoints', () => {
                expectCloseTo(s.transform(-10, true), 100.0);
                expectCloseTo(s.transform(10, true), 200.0);
            });

            test('clip=false extrapolates beyond range', () => {
                expectCloseTo(s.transform(-15, false), 0.0);
            });
        });

        describe('untransform', () => {
            test('maps range to domain', () => {
                expectCloseTo(s.untransform(100), -5.0);
                expectCloseTo(s.untransform(150), 0.0);
                expectCloseTo(s.untransform(200), 5.0);
            });

            test('maps array of values', () => {
                expectArrayCloseTo(s.untransform([100, 150, 200]), [-5.0, 0.0, 5.0]);
            });

            test('round-trips with transform', () => {
                expectCloseTo(s.untransform(s.transform(2.5)), 2.5);
            });

            test('clip=true clamps range value before inverting', () => {
                expectCloseTo(s.untransform(50, true), -5.0);   // 50 < range[0]=100 → clamps to -5
                expectCloseTo(s.untransform(250, true), 5.0);   // 250 > range[1]=200 → clamps to 5
            });
        });

        describe('domain_to_unit', () => {
            test('maps domain to [0, 1]', () => {
                expectCloseTo(s.domain_to_unit(-5), 0.0);
                expectCloseTo(s.domain_to_unit(0), 0.5);
                expectCloseTo(s.domain_to_unit(5), 1.0);
            });

            test('clip=true clamps to [0, 1]', () => {
                expectCloseTo(s.domain_to_unit(-10, true), 0.0);
                expectCloseTo(s.domain_to_unit(10, true), 1.0);
            });
        });

        describe('domain_from_unit', () => {
            test('maps [0, 1] to domain', () => {
                expectCloseTo(s.domain_from_unit(0.0), -5.0);
                expectCloseTo(s.domain_from_unit(0.5), 0.0);
                expectCloseTo(s.domain_from_unit(1.0), 5.0);
            });

            test('clip=true clamps to domain', () => {
                expectCloseTo(s.domain_from_unit(-1, true), -5.0);
                expectCloseTo(s.domain_from_unit(2, true), 5.0);
            });

            test('round-trips with domain_to_unit', () => {
                expectCloseTo(s.domain_from_unit(s.domain_to_unit(3.0)), 3.0);
            });
        });

        describe('range_to_unit', () => {
            test('maps range to [0, 1]', () => {
                expectCloseTo(s.range_to_unit(100), 0.0);
                expectCloseTo(s.range_to_unit(150), 0.5);
                expectCloseTo(s.range_to_unit(200), 1.0);
            });

            test('clip=true clamps out-of-range values', () => {
                expectCloseTo(s.range_to_unit(50, true), 0.0);
                expectCloseTo(s.range_to_unit(250, true), 1.0);
            });
        });

        describe('range_from_unit', () => {
            test('maps [0, 1] to range', () => {
                expectCloseTo(s.range_from_unit(0.0), 100.0);
                expectCloseTo(s.range_from_unit(0.5), 150.0);
                expectCloseTo(s.range_from_unit(1.0), 200.0);
            });

            test('clip=true clamps to range', () => {
                expectCloseTo(s.range_from_unit(-1, true), 100.0);
                expectCloseTo(s.range_from_unit(2, true), 200.0);
            });
        });

        describe('scale_factor', () => {
            test('is ratio of range span to lin_domain span', () => {
                expectCloseTo(s.scale_factor(), 10.0); // range=100, domain=10
            });

            test('reflects range and domain sizes', () => {
                expectCloseTo(linear([0, 10], [0, 50]).scale_factor(), 5.0);
            });
        });

        describe('ticks', () => {
            test('produces expected values for a clean domain', () => {
                expect(linear([0, 10], [0, 100]).ticks(5)).toEqual([0, 2, 4, 6, 8, 10]);
            });

        });

        describe('with_domain', () => {
            test('returns new scale with new domain, same range', () => {
                const s2 = s.with_domain([0, 10]);
                expect(s2.domain).toEqual([0, 10]);
                expect(s2.range).toEqual([100, 200]);
            });

            test('is immutable', () => {
                s.with_domain([0, 10]);
                expect(s.domain).toEqual([-5, 5]);
            });

            test('new scale transforms correctly', () => {
                const s2 = s.with_domain([0, 10]);
                expectCloseTo(s2.transform(5), 150.0);  // midpoint → midpoint
                expectCloseTo(s2.transform(10), 200.0);
            });
        });

        describe('with_range', () => {
            test('returns new scale with new range, same domain', () => {
                const s2 = s.with_range([0, 100]);
                expect(s2.range).toEqual([0, 100]);
                expect(s2.domain).toEqual([-5, 5]);
            });

            test('is immutable', () => {
                s.with_range([0, 100]);
                expect(s.range).toEqual([100, 200]);
            });

            test('new scale transforms correctly', () => {
                expectCloseTo(s.with_range([0, 100]).transform(2.5), 75.0);
            });
        });

        describe('apply_transform', () => {
            const base = linear([0, 10], [0, 100]);

            test('identity leaves domain unchanged', () => {
                const s2 = base.apply_transform(new Transform1D(1, 0));
                expectCloseTo(s2.domain[0], 0.0);
                expectCloseTo(s2.domain[1], 10.0);
            });

            test('zoom in 2x halves the visible domain', () => {
                // unapply([0, 100]) = [0, 50]; untransform([0, 50]) = [0, 5]
                const s2 = base.apply_transform(new Transform1D(2, 0));
                expectCloseTo(s2.domain[0], 0.0);
                expectCloseTo(s2.domain[1], 5.0);
            });

            test('pan shifts the visible domain', () => {
                // unapply([0, 100]) with k=1, p=20 → [-20, 80]; untransform → [-2, 8]
                const s2 = base.apply_transform(new Transform1D(1, 20));
                expectCloseTo(s2.domain[0], -2.0);
                expectCloseTo(s2.domain[1], 8.0);
            });
        });
    });

    describe('interpolating scale (function range)', () => {
        const s = linear([10, 0], (t: number) => 5 * t);

        test('type guards', () => {
            expectTypeGuards(s, { continuous: false, spatial: false, numeric: true, discrete: false });
        });

        test('toString', () => {
            expect(s.toString()).toEqual("scale linear(domain: [10, 0], range: (t) => 5 * t)");
        });

        test('transform', () => {
            expectCloseTo(s.transform(10), 0.0); // t=0
            expectCloseTo(s.transform(0), 5.0);  // t=1
        });

        describe('with_domain', () => {
            test('returns new scale with new domain', () => {
                const s2 = s.with_domain([20, 0]);
                expect(s2.domain).toEqual([20, 0]);
            });

            test('is immutable', () => {
                s.with_domain([20, 0]);
                expect(s.domain).toEqual([10, 0]);
            });

            test('new scale maps full domain to same interpolate range', () => {
                const s2 = s.with_domain([20, 0]);
                expectCloseTo(s2.transform(20), 0.0); // t=0
                expectCloseTo(s2.transform(0), 5.0);  // t=1
            });
        });

        describe('domain_from_unit / domain_to_unit', () => {
            test('round-trips', () => {
                expectCloseTo(s.domain_from_unit(s.domain_to_unit(3.0)), 3.0);
            });
        });
    });

    describe('color scale (array range)', () => {
        const s = linear([0, 10], ["red", "green", "blue"]);

        test('type guards', () => {
            expectTypeGuards(s, { continuous: false, spatial: false, numeric: true, discrete: false });
        });

        test('transform scalar', () => {
            expect(s.transform(0)).toEqual("rgb(255, 0, 0)");
            expect(s.transform(5)).toEqual("rgb(0, 128, 0)");
            expect(s.transform(10)).toEqual("rgb(0, 0, 255)");
        });

        test('transform array', () => {
            expect(s.transform([0, 2.5, 5, 7.5, 10])).toEqual([
                "rgb(255, 0, 0)",
                "rgb(128, 64, 0)",
                "rgb(0, 128, 0)",
                "rgb(0, 64, 128)",
                "rgb(0, 0, 255)",
            ]);
        });

        test('toString', () => {
            expect(s.toString()).toEqual("scale linear(domain: [0, 10], range: [red, green, blue])");
        });

        test('with_domain changes domain', () => {
            const s2 = s.with_domain([0, 20]);
            expect(s2.domain).toEqual([0, 20]);
            expect(s2.transform(0)).toEqual("rgb(255, 0, 0)");
            expect(s2.transform(20)).toEqual("rgb(0, 0, 255)");
        });
    });

    describe('color scale (custom interpolator)', () => {
        test('uses provided pairwise interpolator', () => {
            const s = linear([0, 10], ["purple", "orange"], interpolateLab);
            expect(s.transform([0, 2.5, 5, 7.5, 10])).toEqual([
                "rgb(128, 0, 128)",
                "rgb(164, 56, 111)",
                "rgb(196, 93, 92)",
                "rgb(226, 129, 65)",
                "rgb(255, 165, 0)",
            ]);
            expect(s.toString()).toContain(
                "scale linear(domain: [0, 10], range: [purple, orange], make_interpolate: function lab(start, end)"
            );
        });
    });

    test.fails('multiple domain values are not yet implemented', () => {
        const s = linear([0, 5, 10], ["red", "green", "blue"]);
        expect(s.transform(0)).toEqual("rgb(255, 0, 0)");
    });
});

describe('log', () => {
    describe('continuous scale', () => {
        // log([1, 1000], [0, 300], base=10): each decade maps to equal range interval
        const s = log([1, 1000], [0, 300]);

        test('type guards', () => {
            expectTypeGuards(s, { continuous: true, spatial: true, numeric: true, discrete: false });
        });

        test('maps domain endpoints to range endpoints', () => {
            expectCloseTo(s.transform(1), 0.0);
            expectCloseTo(s.transform(1000), 300.0);
        });

        test('each decade spans equal range interval', () => {
            expectCloseTo(s.transform(10), 100.0);
            expectCloseTo(s.transform(100), 200.0);
        });

        test('geometric midpoint maps to range midpoint', () => {
            expectCloseTo(s.transform(Math.sqrt(1000)), 150.0);
        });

        describe('with_domain', () => {
            test('returns new scale with new domain, same range', () => {
                const s2 = s.with_domain([10, 10000]);
                expect(s2.domain).toEqual([10, 10000]);
                expect(s2.range).toEqual([0, 300]);
            });

            test('is immutable', () => {
                s.with_domain([10, 10000]);
                expect(s.domain).toEqual([1, 1000]);
            });

            test('new scale transforms correctly', () => {
                const s2 = s.with_domain([10, 10000]);
                expectCloseTo(s2.transform(10), 0.0);
                expectCloseTo(s2.transform(10000), 300.0);
            });
        });

        describe('lin_domain', () => {
            test('is fwd_transform applied to each domain endpoint', () => {
                // fwd = x => Math.log(x) / 10
                expectCloseTo(s.lin_domain[0], 0.0);                    // log(1)/10 = 0
                expectCloseTo(s.lin_domain[1], Math.log(1000) / 10.0);  // log(1000)/10
            });
        });

        describe('scale_factor', () => {
            test('is ratio of range span to lin_domain span', () => {
                // log([1, e^10], [0, 100]): lin_domain = [0, 1], scale_factor = 100
                const s2 = log([1.0, Math.exp(10.0)], [0.0, 100.0]);
                expectCloseTo(s2.scale_factor(), 100.0);
            });
        });

        describe('with_range', () => {
            test('returns new scale with new range, same domain', () => {
                const s2 = s.with_range([0, 600]);
                expect(s2.range).toEqual([0, 600]);
                expect(s2.domain).toEqual([1, 1000]);
            });

            test('is immutable', () => {
                s.with_range([0, 600]);
                expect(s.range).toEqual([0, 300]);
            });

            test('new scale transforms correctly', () => {
                // doubling the range doubles each decade's span: 1→10 now maps to [0, 200]
                const s2 = s.with_range([0, 600]);
                expectCloseTo(s2.transform(10), 200.0);
                expectCloseTo(s2.transform(100), 400.0);
            });
        });

        describe('apply_transform', () => {
            test('zoom in 2x shows lower half of log domain', () => {
                // unapply([0, 300]) with k=2 → [0, 150]; untransform → [1, sqrt(1000)]
                const s2 = s.apply_transform(new Transform1D(2, 0));
                expectCloseTo(s2.domain[0], 1.0);
                expectCloseTo(s2.domain[1], Math.sqrt(1000));
            });

            test('pan shifts the visible domain log-evenly', () => {
                // unapply([0, 300]) with k=1, p=100 → [-100, 200]; untransform → [0.1, 100]
                const s2 = s.apply_transform(new Transform1D(1, 100));
                expectCloseTo(s2.domain[0], 0.1);
                expectCloseTo(s2.domain[1], 100.0);
            });
        });

        describe('domain_to_unit / domain_from_unit', () => {
            test('maps log-evenly through [0, 1]', () => {
                // [1, 1000] spans 3 decades; 10 is 1 decade in → unit = 1/3
                expectCloseTo(s.domain_to_unit(10), 1.0 / 3.0);
                expectCloseTo(s.domain_to_unit(100), 2.0 / 3.0);
            });

            test('domain_from_unit inverts domain_to_unit', () => {
                expectCloseTo(s.domain_from_unit(1.0 / 3.0), 10.0);
                expectCloseTo(s.domain_from_unit(s.domain_to_unit(42.0)), 42.0);
            });
        });

    });

    describe('interpolating scale (function range)', () => {
        test('type guards', () => {
            const s = log([0.1, 100.0], d3_scale.interpolateMagma);
            expectTypeGuards(s, { continuous: false, spatial: false, numeric: true, discrete: false });
        });

        test('maps domain through interpolator (clamped at bounds)', () => {
            const s = log([0.1, 100.0], d3_scale.interpolateMagma);
            expect(s.transform([0.01, 0.1, 0.3, 1.0, 3.0, 10.0, 30.0, 100.0, 200.0])).toEqual([
                "#000004",
                "#000004",
                "#29115a",
                "#721f81",
                "#b3367a",
                "#f1605d",
                "#feac76",
                "#fcfdbf",
                "#fcfdbf",
            ]);
        });
    });
});
