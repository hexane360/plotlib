import * as d3_format from 'd3-format';
import { atom, Atom, WritableAtom } from 'jotai';
import { atomWithReducer } from 'jotai/utils';
import React from 'react';


export function mapValues<K, V, T>(map: Map<K, V>, func: (value: V) => T): Map<K, T> {
    return new Map([...map].map(([k, v]) => [k, func(v)]));
}

export function makeId(prefix: string): string {
    return prefix + `-${d3_format.format("06g")(Math.floor(Math.random() * 1000000))}`;
}

/**
 * Concise `tag#id.class` identifier for an element, for debug logs. Uses the `class` attribute
 * (works for both HTML and SVG elements, unlike `.className`). Returns `'unknown'` for `null`.
 */
export function describeElement(el: Element | null | undefined): string {
    if (!el) return 'unknown';
    const id = el.id ? `#${el.id}` : '';
    const classAttr = el.getAttribute('class');
    const cls = classAttr ? '.' + classAttr.trim().split(/\s+/).join('.') : '';
    return `${el.tagName.toLowerCase()}${id}${cls}`;
}

export function pick<T extends object, K extends keyof T>(obj: T, keys: Iterable<K>): Pick<T, K> {
    let ret: any = {};
    for (const key of keys) { if (key in obj) ret[key] = obj[key]; }
    return ret;
}

export function omit<T extends object, K extends keyof T>(obj: T, keys: Iterable<K>): Omit<T, K> {
    let ret: any = {};
    const keySet = new Set(keys) as Set<string>;
    for (const [k, v] of Object.entries(obj)) {
        if (!keySet.has(k)) ret[k] = v;
    }
    return ret;
}

export function isClose(
    left: number | ReadonlyArray<number>, right: number | ReadonlyArray<number>,
    rtol: number = 1e-6, atol: number = 1e-6
): boolean {
    if (typeof left == "number") {
        return typeof right == "number" && (
            Math.abs(left - right) < Math.max(rtol * Math.max(Math.abs(left), Math.abs(right)), atol)
        );
    }
    if (typeof right == "number" || left.length != right.length) return false;
    for (let i = 0; i < left.length; i++) {
        if (!isClose(left[i], right[i], rtol, atol)) return false;
    }
    return true;
}

type MapFn = {
    <T, U>(val: readonly [T, T], fn: (_: T) => U): [U, U];
    <T, U>(val: readonly T[], fn: (_: T) => U): Array<U>;
    <T, U>(val: T | readonly T[], fn: (_: T) => U): Array<U> | U;
    <T, U>(val: T, fn: (_: T) => U): U;
};
export const map: MapFn = <T, U>(val: ReadonlyArray<T> | T, fn: (_: T) => U): Array<U> | U => (val instanceof Array)
    ? val.map(fn)
    : fn(val);

type Clamp = {
    (val: number, extent: readonly [number, number]): number;
    (val: readonly [number, number], extent: readonly [number, number]): [number, number];
    (val: ReadonlyArray<number>, extent: readonly [number, number]): Array<number>;
    (val: number | ReadonlyArray<number>, extent: readonly [number, number]): Array<number> | number;
};
export const clamp = ((
    val: number | ReadonlyArray<number>, extent: readonly [number, number]
) => map(val, (v) => Math.max(extent[0], Math.min(extent[1], v)))) as Clamp;

export function nan_minmax(vals: Iterable<number>): [number | null, number | null] {
    let vmin: number | null = null;
    let vmax: number | null = null;
    for (const v of vals) {
        if (Number.isFinite(v)) {
            vmin = vmin === null ? v : Math.min(vmin, v);
            vmax = vmax === null ? v : Math.max(vmax, v);
        }
    }
    return [vmin, vmax];
}

export const is_atom = (val: any): val is Atom<unknown> =>
    typeof val === 'object' && val !== null && Object.hasOwn(val, 'read');

export function useAsAtom<T>(val: T | Atom<T>): Atom<T> {
    return React.useMemo(
        () => is_atom(val) ? val : atom((_) => val),
        [val]
    );
}


type MapAction<K, V> =
  | { type: 'set'; value: [key: K, value: V] }
  | { type: 'delete'; value: K }
  | { type: 'clear' }

// we don't want to allow mutating the state value itself
type MapState<K, V> = Pick<
  Map<K, V>,
  'get' | 'has' | 'size' | 'keys' | 'values' | 'entries'
>;

export type MapAtom<K, V> = WritableAtom<MapState<K, V>, [(MapAction<K, V> | undefined)?], void>;

export function createMapAtom<K, V>(initialState: Map<K, V> = new Map()): MapAtom<K, V> {
  return atomWithReducer<MapState<K, V>, MapAction<K, V>>(
    initialState,
    (prev, action) => {
      if (!action) throw new Error('Invalid action');

      // abort forcing an update if value will be unchanged
      if (action.type === 'delete' && !prev.has(action.value)) return prev;

      // Mutative actions
      const currentState = new Map(prev as Map<K, V>);
      if (action.type === 'set') {
        const [key, value] = action.value;
        currentState.set(key, value);
      } else if (action.type === 'delete') {
        currentState.delete(action.value);
      } else if (action.type === 'clear') {
        currentState.clear();
      } else {
        throw new Error(`"Invalid action '${(action as any).type}'. Expected one of 'set', 'delete', or 'clear'.`);
      }

      // Return immutable operation
      return currentState;
    },
  )
}