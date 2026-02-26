import * as d3_format from 'd3-format';


export function mapValues<K, V, T>(map: Map<K, V>, func: (value: V) => T): Map<K, T> {
    return new Map([...map].map(([k, v]) => [k, func(v)]));
}

export function makeId(prefix: string): string {
    return prefix + `-${d3_format.format("06g")(Math.floor(Math.random() * 1000000))}`;
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