import { describe, expect, test, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { atom } from 'jotai';

import { parseDataSpec, applySegments, useData, useData1D, useData2D } from './data';
import { FigureContext, FigureContextData } from './context';

// ── helpers ──────────────────────────────────────────────────────────────────

function renderHook<T>(render: () => T, ctx?: FigureContextData): T {
    let captured!: T;

    function Capture() {
        captured = render();
        return null;
    }

    const element = ctx
        ? React.createElement(FigureContext.Provider, { value: ctx }, React.createElement(Capture))
        : React.createElement(Capture);

    const container = document.createElement('div');
    const root = createRoot(container);
    act(() => root.render(element));
    act(() => root.unmount());

    return captured;
}

/** Minimal FigureContextData stub with only `data` populated. */
function makeCtx(data: FigureContextData['data']): FigureContextData {
    return {
        data,
        scales: new Map(),
        get_scale: () => { throw new Error('not implemented'); },
        get_spatial_scale: () => { throw new Error('not implemented'); },
        get_continuous_scale: () => { throw new Error('not implemented'); },
        get_color_scale: () => { throw new Error('not implemented'); },
    };
}

// ── parseDataSpec ─────────────────────────────────────────────────────────────

describe('parseDataSpec', () => {
    test('plain key → no segments', () => {
        expect(parseDataSpec('xs')).toEqual({ key: 'xs', segments: [] });
    });

    test('key[].field → iter + field', () => {
        expect(parseDataSpec('d[].x')).toEqual({
            key: 'd',
            segments: [{ type: 'iter' }, { type: 'field', name: 'x' }],
        });
    });

    test('key.a.b → chained field access', () => {
        expect(parseDataSpec('d.x.y')).toEqual({
            key: 'd',
            segments: [{ type: 'field', name: 'x' }, { type: 'field', name: 'y' }],
        });
    });

    test('key[n].field[].field → index + field + iter + field', () => {
        expect(parseDataSpec('d[0].x[].y')).toEqual({
            key: 'd',
            segments: [
                { type: 'index', i: 0 },
                { type: 'field', name: 'x' },
                { type: 'iter' },
                { type: 'field', name: 'y' },
            ],
        });
    });

    test('underscore and digits in names', () => {
        expect(parseDataSpec('my_data[].value1')).toEqual({
            key: 'my_data',
            segments: [{ type: 'iter' }, { type: 'field', name: 'value1' }],
        });
    });

    test('throws on invalid spec', () => {
        expect(() => parseDataSpec('d[x]')).toThrow("Invalid data spec: 'd[x]'");
        expect(() => parseDataSpec('')).toThrow();
    });
});

// ── applySegments ─────────────────────────────────────────────────────────────

describe('applySegments', () => {
    test('no segments → identity', () => {
        expect(applySegments([1, 2, 3], [])).toEqual([1, 2, 3]);
    });

    test('field on object', () => {
        expect(applySegments({ x: 42 }, [{ type: 'field', name: 'x' }])).toBe(42);
    });

    test('field on array → maps over elements', () => {
        const rows = [{ x: 1 }, { x: 2 }, { x: 3 }];
        expect(applySegments(rows, [{ type: 'field', name: 'x' }])).toEqual([1, 2, 3]);
    });

    test('index on array', () => {
        expect(applySegments([10, 20, 30], [{ type: 'index', i: 1 }])).toBe(20);
    });

    test('iter is a no-op', () => {
        const arr = [1, 2, 3];
        expect(applySegments(arr, [{ type: 'iter' }])).toBe(arr);
    });

    test('chained: index then field', () => {
        const data = [{ x: [{ y: 1 }, { y: 2 }] }, { x: [{ y: 3 }] }];
        // d[0].x → array of records
        expect(applySegments(data, [
            { type: 'index', i: 0 },
            { type: 'field', name: 'x' },
        ])).toEqual([{ y: 1 }, { y: 2 }]);
    });

    test('chained: index + field + field-on-array (d[0].x[].y)', () => {
        const data = [{ x: [{ y: 7 }, { y: 8 }] }, { x: [] }];
        expect(applySegments(data, [
            { type: 'index', i: 0 },
            { type: 'field', name: 'x' },
            { type: 'iter' },
            { type: 'field', name: 'y' },
        ])).toEqual([7, 8]);
    });

    test('nested field access (d.x.y)', () => {
        const data = { x: { y: 99 } };
        expect(applySegments(data, [
            { type: 'field', name: 'x' },
            { type: 'field', name: 'y' },
        ])).toBe(99);
    });
});

// ── useData1D / useData2D ─────────────────────────────────────────────────────

/** Suppress React's console.error while running fn (used when testing render-time throws). */
function withSilencedErrors<T>(fn: () => T): T {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try { return fn(); } finally { spy.mockRestore(); }
}

describe('useData1D', () => {
    test('passes through a 1D inline array', () => {
        const xs = [1, 2, 3];
        expect(renderHook(() => useData1D(xs))).toBe(xs);
    });

    test('passes through an empty array as valid 1D', () => {
        expect(renderHook(() => useData1D([]))).toEqual([]);
    });

    test('resolves a 1D array from context', () => {
        const ctx = makeCtx({ xs: atom([10, 20, 30]) });
        expect(renderHook(() => useData1D('xs'), ctx)).toEqual([10, 20, 30]);
    });

    test('throws for a 2D array', () => {
        withSilencedErrors(() => {
            expect(() => renderHook(() => useData1D([[1, 2], [3, 4]]))).toThrow('Expected 1D data.');
        });
    });

    test('throws for a non-array scalar', () => {
        withSilencedErrors(() => {
            expect(() => renderHook(() => useData1D(42 as any))).toThrow('Expected 1D data.');
        });
    });
});

describe('useData2D', () => {
    test('passes through a 2D inline array', () => {
        const mat = [[1, 2], [3, 4]];
        expect(renderHook(() => useData2D(mat))).toBe(mat);
    });

    test('passes through an empty array as valid 2D', () => {
        expect(renderHook(() => useData2D([]))).toEqual([]);
    });

    test('resolves a 2D array from context', () => {
        const ctx = makeCtx({ img: atom([[1, 2], [3, 4]]) });
        expect(renderHook(() => useData2D('img'), ctx)).toEqual([[1, 2], [3, 4]]);
    });

    test('throws for a flat 1D array', () => {
        withSilencedErrors(() => {
            expect(() => renderHook(() => useData2D([1, 2, 3]))).toThrow('Expected 2D data.');
        });
    });

    test('throws for a non-array scalar', () => {
        withSilencedErrors(() => {
            expect(() => renderHook(() => useData2D(42 as any))).toThrow('Expected 2D data.');
        });
    });
});

// ── useData ───────────────────────────────────────────────────────────────────

describe('useData', () => {
    describe('inline array', () => {
        test('returns the array directly (same reference)', () => {
            const xs = [1, 2, 3];
            const result = renderHook(() => useData(xs));
            expect(result).toBe(xs);
        });

        test('works without FigureContext', () => {
            const result = renderHook(() => useData([10, 20]));
            expect(result).toEqual([10, 20]);
        });
    });

    describe('plain string key', () => {
        test('resolves to atom value', () => {
            const ctx = makeCtx({ xs: atom([1, 2, 3]) });
            const result = renderHook(() => useData('xs'), ctx);
            expect(result).toEqual([1, 2, 3]);
        });

        test('throws for missing key', () => {
            withSilencedErrors(() => {
                expect(() => renderHook(() => useData('missing'), makeCtx({}))).toThrow("Data key 'missing' not found");
            });
        });

        test('throws when no FigureContext', () => {
            withSilencedErrors(() => {
                expect(() => renderHook(() => useData('xs'))).toThrow("Data key 'xs' not found");
            });
        });
    });

    describe('DSL: array field accessor (key[].field)', () => {
        test('maps field from record array', () => {
            const ctx = makeCtx({
                d: atom([{ x: 1, y: 4 }, { x: 2, y: 5 }, { x: 3, y: 6 }]),
            });
            expect(renderHook(() => useData('d[].x'), ctx)).toEqual([1, 2, 3]);
            expect(renderHook(() => useData('d[].y'), ctx)).toEqual([4, 5, 6]);
        });

        test('throws for missing key', () => {
            withSilencedErrors(() => {
                expect(() => renderHook(() => useData('missing[].x'), makeCtx({}))).toThrow("Data key 'missing' not found");
            });
        });
    });

    describe('DSL: nested field access (key.a.b)', () => {
        test('traverses nested object fields', () => {
            const ctx = makeCtx({ d: atom({ meta: { value: 42 } }) });
            const result = renderHook(() => useData('d.meta.value'), ctx);
            expect(result).toBe(42);
        });
    });

    describe('DSL: index access (key[n].field)', () => {
        test('picks element then maps field', () => {
            const ctx = makeCtx({
                d: atom([
                    { xs: [1, 2, 3] },
                    { xs: [4, 5, 6] },
                ]),
            });
            const result = renderHook(() => useData('d[1].xs'), ctx);
            expect(result).toEqual([4, 5, 6]);
        });
    });

    describe('DSL: compound path (key[n].field[].field)', () => {
        test('index + field + iter + field', () => {
            const ctx = makeCtx({
                d: atom([
                    { pts: [{ y: 7 }, { y: 8 }] },
                    { pts: [{ y: 0 }] },
                ]),
            });
            const result = renderHook(() => useData('d[0].pts[].y'), ctx);
            expect(result).toEqual([7, 8]);
        });
    });
});
