import React from 'react';
import { Atom, atom } from 'jotai';
import { useAtomValue } from 'jotai/react';

import { FigureContext } from './context';

export type { DataMap } from './context';

/** A data column: either an inline array or a string DSL expression into the Figure's `data` prop. */
export type DataRef = string | readonly any[];

// ── DSL ───────────────────────────────────────────────────────────────────────

type FieldSeg = { type: 'field'; name: string }
type IndexSeg = { type: 'index'; i: number }
type IterSeg  = { type: 'iter' }
type Segment  = FieldSeg | IndexSeg | IterSeg

export interface ParsedDataSpec {
    key: string;
    segments: Segment[];
}

/**
 * Parse a DSL string into a root key and a sequence of path segments.
 *
 * Supported syntax:
 * - `'xs'`          → direct key lookup
 * - `'d[].x'`       → key `d`, iterate array, pick field `x`
 * - `'d.x.y'`       → key `d`, nested field access
 * - `'d[0].x[].y'`  → key `d`, index 0, field `x`, iterate, field `y`
 *
 * Segment types:
 * - `.field`  — property access; auto-maps if the current value is an array
 * - `[n]`     — index into array
 * - `[]`      — assert / document that the value is an array (no-op in evaluation)
 */
export function parseDataSpec(spec: string): ParsedDataSpec {
    const m = spec.match(/^(\w+)((?:\.\w+|\[\d+\]|\[\])*)$/);
    if (!m) throw new Error(`Invalid data spec: '${spec}'`);
    const [, key, rest] = m;

    const segments: Segment[] = [];
    const tok = /\.\w+|\[\d+\]|\[\]/g;
    let t: RegExpExecArray | null;
    while ((t = tok.exec(rest)) !== null) {
        const s = t[0];
        if (s === '[]')             segments.push({ type: 'iter' });
        else if (s.startsWith('.')) segments.push({ type: 'field', name: s.slice(1) });
        else                        segments.push({ type: 'index', i: parseInt(s.slice(1, -1), 10) });
    }
    return { key, segments };
}

/**
 * Apply a parsed path to a value.
 * - `field` on an object → property access; on an array → maps over elements.
 * - `index` → array element access.
 * - `iter`  → no-op (purely a documentation/assertion marker).
 */
export function applySegments(value: any, segments: Segment[]): any {
    let cur = value;
    for (const seg of segments) {
        if (seg.type === 'field') {
            cur = Array.isArray(cur) ? cur.map(r => r[seg.name]) : cur?.[seg.name];
        } else if (seg.type === 'index') {
            cur = cur?.[seg.i];
        }
        // iter: no-op
    }
    return cur;
}

// ── hook ──────────────────────────────────────────────────────────────────────

const _empty: Atom<any[]> = atom([]);

/**
 * Resolve a {@link DataRef} to an array.
 * - Inline array → returned as-is.
 * - DSL string → parsed once, looks up the root key from `FigureContext.data`,
 *   then applies path segments via a memoized derived atom (recomputed only when
 *   the source atom changes, not on every render).
 */
export function useData(spec: DataRef): any {
    const fig = React.useContext(FigureContext);

    // Parse once per unique spec string; null when spec is an inline array.
    const parsed = React.useMemo(
        () => typeof spec === 'string' ? parseDataSpec(spec) : null,
        [spec],
    );
    const sourceAtom: Atom<any> = (parsed && fig?.data[parsed.key]) || _empty;

    const resultAtom = React.useMemo(
        () => parsed?.segments.length
            ? atom(get => applySegments(get(sourceAtom), parsed.segments))
            : sourceAtom,
        [sourceAtom, parsed],
    );
    const result = useAtomValue(resultAtom);

    if (parsed && !fig?.data[parsed.key]) {
        const available = fig ? Object.keys(fig.data).join(', ') : 'none (no FigureContext)';
        throw new Error(`Data key '${parsed.key}' not found. Available: [${available}]`);
    }

    // For inline arrays, skip the atom path entirely and return the ref directly.
    return typeof spec === 'string' ? result : spec as any[];
}

export function useData1D(spec: DataRef): any[] {
    const data = useData(spec);
    if (!(data instanceof Array) || data[0] instanceof Array)
        throw new Error("Invalid data shape. Expected 1D data.");
    return data;
}

export function useData2D(spec: DataRef): any[] {
    const data = useData(spec);
    if (!(data instanceof Array) || (data.length > 0 && !(data[0] instanceof Array)))
        throw new Error("Invalid data shape. Expected 2D data.");
    return data;
}