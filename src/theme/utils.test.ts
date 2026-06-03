import { describe, test, expect } from 'vitest';
import { deepMerge, isObject } from './utils';

describe('isObject', () => {
    test('plain object returns true', () => {
        expect(isObject({ a: 1 })).toBe(true);
    });

    test('empty object returns true', () => {
        expect(isObject({})).toBe(true);
    });

    test('array returns false', () => {
        expect(isObject([1, 2, 3])).toBe(false);
    });

    test('null returns false', () => {
        expect(isObject(null)).toBe(false);
    });

    test('number returns false', () => {
        expect(isObject(42 as any)).toBe(false);
    });

    test('string returns false', () => {
        expect(isObject('hello' as any)).toBe(false);
    });
});

describe('deepMerge', () => {
    test('source primitive overrides target primitive', () => {
        const result = deepMerge({ a: 1 }, { a: 2 });
        expect(result).toEqual({ a: 2 });
    });

    test('missing key in target is added from source', () => {
        const result = deepMerge({ a: 1 } as any, { b: 2 });
        expect(result).toEqual({ a: 1, b: 2 });
    });

    test('keys not in source are preserved from target', () => {
        const result = deepMerge({ a: 1, b: 2 }, { a: 99 });
        expect(result).toEqual({ a: 99, b: 2 });
    });

    test('nested objects are merged recursively', () => {
        const result = deepMerge(
            { x: { a: 1, b: 2 } },
            { x: { b: 99, c: 3 } }
        );
        expect(result).toEqual({ x: { a: 1, b: 99, c: 3 } });
    });

    test('deeply nested objects are merged recursively', () => {
        const result = deepMerge(
            { x: { y: { a: 1, b: 2 } } },
            { x: { y: { b: 99 } } }
        );
        expect(result).toEqual({ x: { y: { a: 1, b: 99 } } });
    });

    test('source array replaces target array (not merged)', () => {
        const result = deepMerge({ a: [1, 2, 3] }, { a: [4, 5] });
        expect(result).toEqual({ a: [4, 5] });
    });

    test('source array replaces target object', () => {
        const result = deepMerge({ a: { x: 1 } } as any, { a: [1, 2] });
        expect(result).toEqual({ a: [1, 2] });
    });

    test('nested object key missing in target is added wholesale', () => {
        const result = deepMerge({ a: 1 } as any, { nested: { x: 10 } });
        expect(result).toEqual({ a: 1, nested: { x: 10 } });
    });

    test('does not mutate the target', () => {
        const target = { a: 1, b: { c: 2 } };
        deepMerge(target, { b: { c: 99 } });
        expect(target.b.c).toBe(2);
    });
});
