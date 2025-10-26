import * as d3_format from 'd3-format';


export function mapValues<K, V, T>(map: Map<K, V>, func: (value: V) => T): Map<K, T> {
    return new Map([...map].map(([k, v]) => [k, func(v)]));
}

export function makeId(prefix: string): string {
    return prefix + `-${d3_format.format("06g")(Math.floor(Math.random() * 1000000))}`;
}