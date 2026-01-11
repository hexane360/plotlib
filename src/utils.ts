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

export function isObject<T>(item: T): item is Exclude<T & object, readonly any[]> {
  return item && typeof item === 'object' && !Array.isArray(item);
}

export function deepMerge<T extends object>(target: T, source: Record<string, any>): T {
    const result: Record<string, any> = { ...target };
    Object.keys(source).forEach((key) => {
    if (isObject(source[key])) {
        if (!(key in target)) {
        result[key] = source[key];
        } else {
        result[key] = deepMerge(result[key], source[key]);
        }
    } else {
        result[key] = source[key];
    }
    });

    return result as T;
}