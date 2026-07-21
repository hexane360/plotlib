import { describe, test, expect } from 'vitest';
import { clampToDomain } from './PointWidget';
import { crossPath } from './CircleWidget';

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
