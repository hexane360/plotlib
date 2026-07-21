import { describe, test, expect } from 'vitest';
import { clampToDomain } from './PointWidget';
import { crossPath } from './CircleWidget';
import { annularPath } from './AnnularWidget';

describe('clampToDomain', () => {
    test('point inside both domains is unchanged', () => {
        expect(clampToDomain([5.0, 5.0], [0.0, 10.0], [0.0, 10.0])).toEqual([5.0, 5.0]);
    });

    test('clamps x below min', () => {
        expect(clampToDomain([-5.0, 5.0], [0.0, 10.0], [0.0, 10.0])).toEqual([0.0, 5.0]);
    });

    test('clamps x above max', () => {
        expect(clampToDomain([15.0, 5.0], [0.0, 10.0], [0.0, 10.0])).toEqual([10.0, 5.0]);
    });

    test('clamps y below min', () => {
        expect(clampToDomain([5.0, -5.0], [0.0, 10.0], [0.0, 10.0])).toEqual([5.0, 0.0]);
    });

    test('clamps y above max', () => {
        expect(clampToDomain([5.0, 15.0], [0.0, 10.0], [0.0, 10.0])).toEqual([5.0, 10.0]);
    });

    test('point on domain boundary is unchanged', () => {
        expect(clampToDomain([0.0, 10.0], [0.0, 10.0], [0.0, 10.0])).toEqual([0.0, 10.0]);
    });

    test('inverted x domain (max < min) still clamps correctly', () => {
        expect(clampToDomain([15.0, 5.0], [10.0, 0.0], [0.0, 10.0])).toEqual([10.0, 5.0]);
        expect(clampToDomain([-5.0, 5.0], [10.0, 0.0], [0.0, 10.0])).toEqual([0.0, 5.0]);
        expect(clampToDomain([5.0, 5.0], [10.0, 0.0], [0.0, 10.0])).toEqual([5.0, 5.0]);
    });

    test('inverted y domain (max < min) still clamps correctly', () => {
        expect(clampToDomain([5.0, 15.0], [0.0, 10.0], [10.0, 0.0])).toEqual([5.0, 10.0]);
        expect(clampToDomain([5.0, -5.0], [0.0, 10.0], [10.0, 0.0])).toEqual([5.0, 0.0]);
    });

    test('both domains inverted', () => {
        expect(clampToDomain([15.0, -5.0], [10.0, 0.0], [10.0, 0.0])).toEqual([10.0, 0.0]);
        expect(clampToDomain([5.0, 5.0], [10.0, 0.0], [10.0, 0.0])).toEqual([5.0, 5.0]);
    });
});

describe('crossPath', () => {
    test('produces a horizontal + vertical stroke of the given half-length centered at (cx, cy)', () => {
        expect(crossPath(10.0, 20.0, 5.0)).toBe('M 5 20 L 15 20 M 10 15 L 10 25');
    });

    test('size 0 collapses both strokes to the center point', () => {
        expect(crossPath(10.0, 20.0, 0.0)).toBe('M 10 20 L 10 20 M 10 20 L 10 20');
    });
});

describe('annularPath', () => {
    test('produces two full-circle subpaths (outer, then inner) centered at (cx, cy)', () => {
        expect(annularPath(0.0, 0.0, 10.0, 4.0)).toBe(
            'M 10 0 A 10 10 0 1 0 -10 0 A 10 10 0 1 0 10 0 Z ' +
            'M 4 0 A 4 4 0 1 0 -4 0 A 4 4 0 1 0 4 0 Z'
        );
    });

    test('rInner 0 degenerates the inner subpath to a point (a plain filled disk)', () => {
        expect(annularPath(5.0, 2.0, 3.0, 0.0)).toBe(
            'M 8 2 A 3 3 0 1 0 2 2 A 3 3 0 1 0 8 2 Z ' +
            'M 5 2 A 0 0 0 1 0 5 2 A 0 0 0 1 0 5 2 Z'
        );
    });
});
