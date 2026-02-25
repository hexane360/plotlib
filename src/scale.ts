
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

/** Base interface for all scales. Maps values of type `T` to type `U`. All scale instances are immutable. */
export interface Scale<T, U> extends Object {
    /** Input domain values. */
    readonly domain: readonly T[];
    /** Output range values, if the scale uses an output range. */
    readonly range?: readonly U[];
    /** Interpolation function over `[0, 1]`, if used. */
    readonly interpolate?: (t: number) => U;

    /** Map one value or an array of values from domain to range. Pass `clip=true` to clamp out-of-domain inputs. */
    transform: Transform<T, U>;

    /** Type guard: `true` if this is a {@link ContinuousScale} (numeric domain and numeric range). */
    is_continuous(): this is ContinuousScale;
    /** Type guard: `true` if this scale has a numeric output range (pixel coordinates). */
    is_spatial(): this is SpatialScale<T>;
    /** Type guard: `true` if this scale has a numeric domain. */
    is_numeric(): this is NumericScale<U>;
    /** Type guard: `true` if this scale has a discrete domain. */
    is_discrete(): this is DiscreteScale<T, U>;
}

/** A scale with a discrete (enumerated) domain mapping to values of type `U`. */
export interface DiscreteScale<T, U, Unknown = undefined> extends Scale<T, U | Unknown> {
    readonly domain: readonly T[];
    /** Value returned for inputs not present in `domain`. */
    readonly unknown: Unknown;
}

/** A scale whose output range is a numeric interval `[min, max]` (e.g. pixel coordinates). */
export interface SpatialScale<T> extends Scale<T, number> {
    /** Output range, [min, max] */
    readonly range: Pair;

    /** Convert a range (pixel) value to `[0, 1]` unit space. */
    range_to_unit(range: number, clip?: boolean): number;
    /** Convert a `[0, 1]` unit value to range (pixel) space. */
    range_from_unit(range: number, clip?: boolean): number;

    /** Return a new scale with the given output range. */
    with_range(range: Pair): SpatialScale<T>;
}

/** A scale with a numeric domain mapping to values of type `U`. */
export interface NumericScale<U> extends Scale<number, U> {
    /** Domain after applying `fwd_transform`. */
    readonly lin_domain: readonly number[];

    /** Forward (linearizing) transform applied to domain values (e.g. `Math.log` for log scales). */
    readonly fwd_transform: (_: number) => number;
    /** Inverse of `fwd_transform`. */
    readonly rev_transform: (_: number) => number;

    /** Convert a domain value to `[0, 1]` unit space. */
    domain_to_unit(domain: number, clip?: boolean): number;
    /** Convert a `[0, 1]` unit value to domain space. */
    domain_from_unit(domain: number, clip?: boolean): number;

    /** Generate approximately `count` evenly-spaced tick values within the domain. */
    ticks(count: number): Array<number>;

    /** Return a new scale with the given domain. */
    with_domain(domain: Pair): NumericScale<U>;
}

/** A numeric→numeric scale used for plot axes. Supports zoom transforms, tick generation, and pixel↔domain conversion. */
export interface ContinuousScale extends NumericScale<number>, SpatialScale<number> {
    /** Input domain values, [min, max]. */
    readonly domain: Pair;
    /** Output range values, [min, max]. */
    readonly range: Pair;
    /** Domain after applying `fwd_transform`. */
    readonly lin_domain: Pair;

    /** Map range (pixel) values back to domain values. */
    untransform: Transform<number, number>;

    with_range(range: Pair): ContinuousScale;
    with_domain(domain: Pair): ContinuousScale;
    /** Return a new scale whose domain reflects the given zoom/pan transform. */
    apply_transform(transform: Transform1D): ContinuousScale;

    /** Ratio of range size to linearized domain size (pixels per linearized unit). */
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

/**
 * Low-level factory for a {@link ContinuousScale} with custom linearizing transforms.
 * Prefer {@link linear} or {@link log} for common cases.
 *
 * @param domain - Data range `[min, max]`.
 * @param range - Output range `[min, max]` in pixels.
 * @param fwd_transform - Linearizing function applied to domain values before interpolation (e.g. `Math.log`).
 * @param rev_transform - Inverse of `fwd_transform`.
 */
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

/**
 * Low-level factory for a {@link NumericScale} that maps domain values to arbitrary type `U` via an interpolation function.
 * Prefer {@link linear} or {@link log} with a color/function range for common cases.
 *
 * @param domain - Numeric domain `[min, max]`.
 * @param interpolate_fn - Function from `[0, 1]` to the output type.
 * @param fwd_transform - Linearizing function applied to domain values.
 * @param rev_transform - Inverse of `fwd_transform`.
 */
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

/**
 * Factory for a {@link NumericScale} with explicit linearizing transforms. Dispatches to {@link continuous}
 * (numeric range), {@link interpolate} (function or color range), or a piecewise color interpolation.
 * Prefer {@link linear} or {@link log} unless you need custom transforms.
 *
 * @param domain - Numeric domain.
 * @param range - Output range: a `[min, max]` pair for spatial scales, an array of colors for color scales, or a `(t: number) => U` function.
 * @param fwd_transform - Linearizing function applied to domain values.
 * @param rev_transform - Inverse of `fwd_transform`.
 */
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

/**
 * Linear scale with an identity linearizing transform.
 *
 * @param domain - Numeric domain `[min, max]`.
 * @param range - Output range: `[min, max]` for spatial scales, a color array, or an interpolation function.
 * @param make_interpolate - Optional custom pairwise color interpolator (color range only).
 */
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

/**
 * Logarithmic scale using `Math.log(x) / base` as the linearizing transform.
 *
 * @param domain - Numeric domain `[min, max]` (must be strictly positive or strictly negative).
 * @param range - Output range: `[min, max]` for spatial scales, a color array, or an interpolation function.
 * @param base - Logarithm base. Defaults to `10`.
 * @param make_interpolate - Optional custom pairwise color interpolator (color range only).
 */
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