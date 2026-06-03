import { describe, test, expect, expectTypeOf } from 'vitest';
import { map, clamp, isClose, mapValues, pick, omit, nan_minmax } from './utils';

describe('map', () => {
    test('scalar: applies fn and returns scalar', () => {
        expect(map(5, x => x * 2)).toBe(10);
    });

    test('scalar: fn receives the value', () => {
        expect(map('hello', s => s.length)).toBe(5);
    });

    test('array: applies fn element-wise', () => {
        expect(map([1, 2, 3], x => x * 10)).toEqual([10, 20, 30]);
    });

    test('empty array returns empty array', () => {
        expect(map([], x => x)).toEqual([]);
    });

    test('two-element tuple: applies fn element-wise', () => {
        const result = map([0, 1] as [number, number], x => x + 1);
        expectTypeOf(result).toEqualTypeOf<[number, number]>([1, 2]);
        expect(result).toEqual([1, 2]);
    });
});

describe('clamp', () => {
    test('value within extent is unchanged', () => {
        expect(clamp(5, [0, 10])).toBe(5);
    });

    test('value below min is clamped to min', () => {
        expect(clamp(-5, [0, 10])).toBe(0);
    });

    test('value above max is clamped to max', () => {
        expect(clamp(15, [0, 10])).toBe(10);
    });

    test('value equal to min is unchanged', () => {
        expect(clamp(0, [0, 10])).toBe(0);
    });

    test('value equal to max is unchanged', () => {
        expect(clamp(10, [0, 10])).toBe(10);
    });

    test('array: clamps each element', () => {
        expect(clamp([-5, 5, 15], [0, 10])).toEqual([0, 5, 10]);
    });

    test('two-element tuple: clamps each element', () => {
        expect(clamp([-1, 11] as [number, number], [0, 10])).toEqual([0, 10]);
    });
});

describe('isClose', () => {
    test('equal numbers are close', () => {
        expect(isClose(1.0, 1.0)).toBe(true);
    });

    test('numbers within atol are close', () => {
        expect(isClose(1.0, 1.0 + 1e-7)).toBe(true);
    });

    test('numbers beyond atol and rtol are not close', () => {
        expect(isClose(1.0, 2.0)).toBe(false);
    });

    test('scalar vs array is not close', () => {
        expect(isClose(1.0, [1.0] as any)).toBe(false);
    });

    test('equal arrays are close', () => {
        expect(isClose([1.0, 2.0], [1.0, 2.0])).toBe(true);
    });

    test('arrays of different lengths are not close', () => {
        expect(isClose([1.0, 2.0], [1.0])).toBe(false);
    });

    test('array with one differing element is not close', () => {
        expect(isClose([1.0, 2.0], [1.0, 3.0])).toBe(false);
    });

    test('zero is close to zero', () => {
        expect(isClose(0, 0)).toBe(true);
    });
});

describe('mapValues', () => {
    test('applies fn to each value', () => {
        const m = new Map([['a', 1], ['b', 2], ['c', 3]]);
        expect(mapValues(m, v => v * 10)).toEqual(new Map([['a', 10], ['b', 20], ['c', 30]]));
    });

    test('empty map returns empty map', () => {
        expect(mapValues(new Map(), v => v)).toEqual(new Map());
    });

    test('preserves keys', () => {
        const m = new Map([[1, 'x'], [2, 'y']]);
        const result = mapValues(m, s => s.toUpperCase());
        expect([...result.keys()]).toEqual([1, 2]);
    });
});

describe('pick', () => {
    test('returns only the specified keys', () => {
        expect(pick({ a: 1, b: 2, c: 3 }, ['a', 'c'])).toEqual({ a: 1, c: 3 });
    });

    test('ignores keys not present in the object', () => {
        expect(pick({ a: 1 } as any, ['a', 'z'])).toEqual({ a: 1 });
    });

    test('empty key list returns empty object', () => {
        expect(pick({ a: 1, b: 2 }, [])).toEqual({});
    });
});

describe('omit', () => {
    test('returns object without the specified keys', () => {
        expect(omit({ a: 1, b: 2, c: 3 }, ['b'])).toEqual({ a: 1, c: 3 });
    });

    test('omitting a key not in the object is a no-op', () => {
        expect(omit({ a: 1 } as any, ['z'])).toEqual({ a: 1 });
    });

    test('omitting all keys returns empty object', () => {
        expect(omit({ a: 1, b: 2 }, ['a', 'b'])).toEqual({});
    });

    test('empty omit list returns full object', () => {
        expect(omit({ a: 1, b: 2 }, [])).toEqual({ a: 1, b: 2 });
    });
});

describe('nan_minmax', () => {
    test('returns min and max of finite values', () => {
        expect(nan_minmax([3, 1, 4, 1, 5])).toEqual([1, 5]);
    });

    test('ignores non-finite values', () => {
        expect(nan_minmax([NaN, 1, Infinity, 2, -Infinity])).toEqual([1, 2]);
    });

    test('empty iterable returns [null, null]', () => {
        expect(nan_minmax([])).toEqual([null, null]);
    });

    test('all non-finite returns [null, null]', () => {
        expect(nan_minmax([NaN, Infinity, -Infinity])).toEqual([null, null]);
    });

    test('single finite value: min equals max', () => {
        expect(nan_minmax([7])).toEqual([7, 7]);
    });
});
