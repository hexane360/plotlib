
import * as d3_array from "d3-array";
import { ColorCommonInstance } from "d3-color";
import { piecewise } from "d3-interpolate";
import { map, clamp } from "./utils";
import { Transform1D } from "./transform";

type Pair = readonly [number, number];
type ArrayOrVal<T> = T | ReadonlyArray<T>;
type ColorLike = string | ColorCommonInstance;

const fmt = (val: string | number | object | boolean | null | undefined): string => (val instanceof Array)
    ? `[${val.join(', ')}]`
    : val ? val.toString() : val === null ? "null" : typeof val;

type Transform<T, U> = {
    (val: T, clip?: boolean): U;
    (val: ReadonlyArray<T>, clip?: boolean): Array<U>;
    (val: ArrayOrVal<T>, clip?: boolean): Array<U> | U;
};

export interface Scale<T, U> extends Object {
    readonly domain: readonly T[];
    readonly range?: readonly U[];
    readonly interpolate?: (t: number) => U;

    transform: Transform<T, U>;

    // numeric -> numeric scale
    is_continuous(): this is ContinuousScale;
    // range is spatial (numeric)
    is_spatial(): this is SpatialScale<T>;
    // domain is numeric
    is_numeric(): this is NumericScale<U>;
    // domain is discrete
    is_discrete(): this is DiscreteScale<T, U>;
}

// discrete -> continuous or discrete
export interface DiscreteScale<T, U, Unknown = undefined> extends Scale<T, U | Unknown> {
    readonly domain: T[];
    readonly unknown: Unknown;
}

// discrete/continuous -> numeric continuous
export interface SpatialScale<T> extends Scale<T, number> {
    readonly range: Pair;

    range_to_unit(range: number, clip?: boolean): number;
    range_from_unit(range: number, clip?: boolean): number;

    with_range(range: Pair): SpatialScale<T>;
}

// numeric -> continuous
export interface NumericScale<U> extends Scale<number, U> {
    readonly domain: readonly number[];
    // linearized domain
    readonly lin_domain: readonly number[];

    // transforms of domain
    readonly fwd_transform: (_: number) => number;
    readonly rev_transform: (_: number) => number;

    domain_to_unit(domain: number, clip?: boolean): number;
    domain_from_unit(domain: number, clip?: boolean): number;

    ticks(count: number): Array<number>;

    with_domain(domain: Pair): NumericScale<U>;
}

export interface ContinuousScale extends NumericScale<number>, SpatialScale<number> {
    readonly domain: Pair;
    readonly range: Pair;
    readonly lin_domain: Pair;

    untransform: Transform<number, number>;

    with_range(range: Pair): ContinuousScale;
    with_domain(domain: Pair): ContinuousScale;
    apply_transform(transform: Transform1D): ContinuousScale;

    scale_factor(): number;
}

const true_fn = () => true;
const false_fn = () => false;
const id = <T>(v: T) => v;

function to_unit(val: number, range: Pair, clip?: boolean): number {
    if (clip) { val = clamp(val, range); }
    return (val - range[0]) / (range[1] - range[0]);
}

function from_unit(val: number, range: Pair, clip?: boolean): number {
    if (clip) { val = clamp(val, [0.0, 1.0]); }
    return val * (range[1] - range[0]) + range[0];
}

export function continuous(
    domain: Pair, range: Pair,
    fwd_transform: (_: number) => number,
    rev_transform: (_: number) => number,
    {toString, ticks}: {
        toString?: (self: ContinuousScale) => string,
        ticks?: (self: ContinuousScale, count?: number) => Array<number>,
    },
): ContinuousScale {
    const lin_domain = domain.map(fwd_transform) as [number, number];

    const domain_from_unit = (val: number, clip?: boolean) => rev_transform(from_unit(val, lin_domain, clip));
    const domain_to_unit = (val: number, clip?: boolean) => to_unit(fwd_transform(val), lin_domain, clip);
    const range_from_unit = (val: number, clip?: boolean) => from_unit(val, range, clip);
    const range_to_unit = (val: number, clip?: boolean) => to_unit(val, range, clip);

    const transform = ((val, clip) => map(val,
        (v) => range_from_unit(domain_to_unit(v, clip), false))) as Transform<number, number>;

    const untransform = ((val, clip) => map(val,
        (v) => domain_from_unit(range_to_unit(v, clip), false))) as Transform<number, number>;

    toString = toString ?? ((self) => 
        `scale continuous(domain: ${fmt(self.domain)}, range: ${fmt(self.range)}, fwd: ${self.fwd_transform}, rev: ${self.rev_transform})`
    );
    ticks = ticks ?? ((self, count) => d3_array.ticks(...self.lin_domain, count ?? 10).map(self.rev_transform));

    return {
        domain, range, lin_domain,
        fwd_transform, rev_transform,

        domain_from_unit, domain_to_unit,
        range_from_unit, range_to_unit,
        transform, untransform,

        is_continuous: true_fn as any,
        is_spatial: true_fn as any,
        is_numeric: true_fn as any,
        is_discrete: false_fn as any,
        toString: function() { return toString(this); },
        ticks: function(count?: number) { return ticks(this, count); },

        scale_factor: function() {
            return Math.abs(this.range[1] - this.range[0]) / Math.abs(this.lin_domain[1] - this.lin_domain[0])
        },

        with_domain: (domain: Pair) => continuous(domain, range, fwd_transform, rev_transform, {toString, ticks}),
        with_range: (range: Pair) => continuous(domain, range, fwd_transform, rev_transform, {toString, ticks}),
        apply_transform: function (transform: Transform1D) {
            return this.with_domain(this.untransform(transform.unapply(this.range)) as [number, number]);
        }
    };
}

export function interpolate<U>(
    domain: ReadonlyArray<number>, interpolate_fn: (t: number) => U,
    fwd_transform: (_: number) => number,
    rev_transform: (_: number) => number,
    {toString, ticks}: {
        toString?: (self: NumericScale<U>) => string,
        ticks?: (self: NumericScale<U>, count?: number) => Array<number>,
    } = {},
): NumericScale<U> {
    if (domain.length != 2) throw new Error("Not implemented yet");

    const lin_domain = domain.map(fwd_transform) as [number, number];
    const domain_from_unit = (val: number, clip?: boolean) => rev_transform(from_unit(val, lin_domain, clip));
    const domain_to_unit = (val: number, clip?: boolean) => to_unit(fwd_transform(val), lin_domain, clip);

    const transform = ((val, clip) => map(val, (v) => interpolate_fn(domain_to_unit(v, clip)))) as Transform<number, U>;

    toString = toString ?? ((self) =>
        `scale interpolate(domain: ${fmt(self.domain)}, interpolate: ${interpolate_fn} fwd: ${self.fwd_transform}, rev: ${self.rev_transform})`
    );
    ticks = ticks ?? ((self, count) => d3_array.ticks(self.lin_domain[0], self.lin_domain[self.lin_domain.length - 1], count ?? 10).map(self.rev_transform));

    return {
        domain, lin_domain, interpolate: interpolate_fn,
        fwd_transform, rev_transform,

        domain_from_unit, domain_to_unit, transform,

        is_continuous: false_fn as any,
        is_spatial: false_fn as any,
        is_numeric: true_fn as any,
        is_discrete: false_fn as any,
        toString: function() { return toString(this); },
        ticks: function(count?: number) { return ticks(this, count); },

        with_domain: (domain: ReadonlyArray<number>) => interpolate(domain, interpolate_fn, fwd_transform, rev_transform, {toString, ticks}),
    };
}

export function numeric(
    domain: Pair, range: Pair,
    fwd_transform: (_: number) => number, rev_transform: (_: number) => number,
    {toString, ticks}: {
        toString?: (self: ContinuousScale) => string,
        ticks?: (self: ContinuousScale, count?: number) => Array<number>,
    },
): ContinuousScale;
export function numeric<U>(
    domain: readonly number[], range: (t: number) => U,
    fwd_transform: (_: number) => number, rev_transform: (_: number) => number,
    {toString, ticks}: {
        toString?: (self: ContinuousScale) => string,
        ticks?: (self: ContinuousScale, count?: number) => Array<number>,
    },
): NumericScale<U>;
export function numeric(
    domain: readonly number[], range: ReadonlyArray<ColorLike>, 
    fwd_transform: (_: number) => number, rev_transform: (_: number) => number,
    {toString, ticks, make_interpolate}: {
        toString?: (self: NumericScale<string>) => string,
        ticks?: (self: NumericScale<string>, count?: number) => Array<number>,
        make_interpolate?: (a: ColorLike, b: ColorLike) => (t: number) => string,
    },
): NumericScale<string>;
export function numeric(
    domain: readonly number[], range: ReadonlyArray<any> | ((t: number) => any),
    fwd_transform: (_: number) => number, rev_transform: (_: number) => number,
    {toString, ticks, make_interpolate}: {
        toString?: (self: NumericScale<any>) => string,
        ticks?: (self: NumericScale<any>, count?: number) => Array<number>,
        make_interpolate?: (a: ColorLike, b: ColorLike) => (t: number) => string,
    },
): NumericScale<any>;
export function numeric(
    domain: readonly number[], range: ReadonlyArray<any> | ((t: number) => any),
    fwd_transform: (_: number) => number, rev_transform: (_: number) => number,
    {toString, ticks, make_interpolate}: {
        toString?: ((self: ContinuousScale) => string) | ((self: NumericScale<any>) => string),
        ticks?: ((self: ContinuousScale, count?: number) => Array<number>) | ((self: NumericScale<any>, count?: number) => Array<number>),
        make_interpolate?: (a: ColorLike, b: ColorLike) => (t: number) => string,
    } = {},
): NumericScale<any> {
    toString = toString ?? (make_interpolate
        ? (self: NumericScale<any>) => `scale numeric(domain: ${fmt(self.domain)}, range: ${fmt(self.range ?? range)}, fwd: ${self.fwd_transform}, rev: ${self.rev_transform}, make_interpolate: ${make_interpolate})`
        : (self: NumericScale<any>) => `scale numeric(domain: ${fmt(self.domain)}, range: ${fmt(self.range ?? range)}, fwd: ${self.fwd_transform}, rev: ${self.rev_transform})`);

    if (!(range instanceof Array)) {
        return interpolate(
            domain, range, fwd_transform, rev_transform, {
                toString: toString as ((self: NumericScale<any>) => string),
                ticks: ticks as ((self: NumericScale<any>, count?: number) => Array<number>) | undefined
            }
        );
    }

    if (range.every((v) => typeof v === 'number')) {
        if (domain.length != 2 || range.length != 2) {
            throw new Error("Domain and range must be length 2");
        }
        return continuous(
            domain as Pair, range as Pair, fwd_transform, rev_transform,
            {toString, ticks}
        );
    }

    const interp = make_interpolate 
        ? piecewise(make_interpolate, range as Array<ColorLike>)
        : piecewise(range as Array<ColorLike>);
    return interpolate(domain, interp, fwd_transform, rev_transform, {
        toString: toString as ((self: NumericScale<any>) => string),
        ticks: ticks as ((self: NumericScale<any>, count?: number) => Array<number>) | undefined
    });
}

export function linear(domain: Pair, range: Pair): ContinuousScale;
export function linear<U>(domain: readonly number[], range: (t: number) => U): NumericScale<U>;
export function linear(domain: readonly number[], range: ReadonlyArray<ColorLike>, 
    make_interpolate?: (a: ColorLike, b: ColorLike) => (t: number) => string): NumericScale<string>;
export function linear(
    domain: readonly number[], range: ReadonlyArray<any> | ((t: number) => any),
    make_interpolate?: (a: ColorLike, b: ColorLike) => (t: number) => string
): NumericScale<any> {
    const toString = make_interpolate
        ? (self: NumericScale<any>) => `scale linear(domain: ${fmt(self.domain)}, range: ${fmt(self.range ?? range)}, make_interpolate: ${make_interpolate})`
        : (self: NumericScale<any>) => `scale linear(domain: ${fmt(self.domain)}, range: ${fmt(self.range ?? range)})`;

    return numeric(
        domain, range, id, id, {toString, make_interpolate}
    );
}

export function log(domain: Pair, range: Pair, base?: number): ContinuousScale;
export function log<U>(domain: readonly number[], range: (t: number) => U, base?: number): NumericScale<U>;
export function log(domain: readonly number[], range: ReadonlyArray<ColorLike>, base?: number,
    make_interpolate?: (a: ColorLike, b: ColorLike) => (t: number) => string): NumericScale<string>;
export function log(
    domain: readonly number[], range: ReadonlyArray<any> | ((t: number) => any), base: number = 10,
    make_interpolate?: (a: ColorLike, b: ColorLike) => (t: number) => string
): NumericScale<any> {
    const toString = make_interpolate
        ? (self: NumericScale<any>) => `scale log(domain: ${fmt(self.domain)}, range: ${fmt(self.range ?? range)}, base: ${base} make_interpolate: ${make_interpolate})`
        : (self: NumericScale<any>) => `scale log(domain: ${fmt(self.domain)}, range: ${fmt(self.range ?? range)}, base: ${base})`;
    return numeric(
        domain, range, (val) => Math.log(val) / base, (val) => Math.exp(val * base),
        {toString, make_interpolate}
    );
}