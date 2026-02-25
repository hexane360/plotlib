import * as kiwi from '@lume/kiwi';

/** Absolute CSS length units. */
export type AbsoluteUnit = 'px' | 'pt' | 'in' | 'cm' | 'mm';
/** All supported CSS length units (absolute, percentage, or rem). */
export type Unit = AbsoluteUnit | '%' | 'rem';
/** Solver variable identifiers `'a'`–`'f'`. Used in {@link VariableLength} to express equality constraints. */
export type Variable = 'a' | 'b' | 'c' | 'd' | 'e' | 'f';
/** All length unit types, including solver variables. */
export type VariableUnit = Unit | Variable;

/** Absolute length string (e.g. `"10px"`, `"1in"`) or a bare number treated as pixels. */
export type AbsoluteLength = `${number}${AbsoluteUnit}` | number;
/** Length string (e.g. `"10px"`, `"50%"`, `"1.5rem"`) or a bare number treated as pixels. */
export type Length = `${number}${Unit}` | number;
/** Length that additionally supports solver variables `'a'`–`'f'` for equality constraints. */
export type VariableLength = `${number}${VariableUnit}` | number;

const UNIT_SCALES: Map<AbsoluteUnit, number> = new Map([
    ['px', 1.0],
    ['pt', 4.0/3.0],
    ['in', 96.0],
    ['cm', 96.0/2.54],
    ['mm', 96.0/25.4],
])

/** Parse an {@link AbsoluteLength} to pixels. Throws if the string is malformed. */
export function parse_absolute_length(length: AbsoluteLength): number {
    if (typeof length === 'number') return length;
    try {
        if (length.length < 3) throw new Error();
        const val = Number(length.substring(0, length.length - 2));
        if (Number.isNaN(val)) throw new Error();
        const unit = length.substring(length.length - 2) as AbsoluteUnit;
        const scale = UNIT_SCALES.get(unit)
        if (!scale) throw new Error();
        return val * scale;
    } catch (e) { }
    throw new Error(`Invalid length: ${length}`);
}

/**
 * Parse a {@link Length} to pixels or a kiwi `Expression`.
 *
 * @param length - Length value to parse.
 * @param container_size - Pixel size of the containing axis (used for `%` lengths).
 * @param rem_scale - Pixel size of `1rem` (used for `rem` lengths).
 */
export function parse_length(
    length: Length,
    container_size: number | kiwi.Variable | kiwi.Expression,
    rem_scale: number | kiwi.Variable | kiwi.Expression,
): number | kiwi.Expression {
    if (typeof length === 'number') return length;
    if (length.length >= 2) {
        if (length.at(-1) == '%') {
            const val = Number(length.substring(0, length.length - 1));
            if (!Number.isNaN(val)) {
                return (typeof container_size === 'number')
                    ? container_size * val / 100.0
                    : container_size.multiply(val / 100.0);
            }
        }
        if (length.endsWith('rem')) {
            const val = Number(length.substring(0, length.length - 3));
            if (!Number.isNaN(val)) {
                return (typeof rem_scale === 'number')
                    ? rem_scale * val
                    : rem_scale.multiply(val)
            }
        }
    }
    return parse_absolute_length(length as AbsoluteLength);
}

/**
 * Parse a {@link VariableLength} to a kiwi `Expression` or a `[variable, coefficient]` pair.
 * Solver variable lengths (e.g. `"2a"`) return a pair so the caller can create an equality constraint.
 *
 * @param length - Length value to parse.
 * @param container_size - Pixel size of the containing axis (used for `%` lengths).
 */
export function parse_variable_length(
    length: VariableLength,
    container_size: number | kiwi.Variable | kiwi.Expression
): kiwi.Expression | [Variable, number] {
    if (typeof length === 'number') return new kiwi.Expression(length);
    if (length.length >= 2) {
        const v = length.at(-1)!;
        if ("abcdef".includes(v)) {
            const val = Number(length.substring(0, length.length - 1));
            if (!Number.isNaN(val)) return [v as Variable, val];
        } else if (v == '%') {
            const val = Number(length.substring(0, length.length - 1));
            if (!Number.isNaN(val)) {
                let expr = (typeof container_size == "number") ? new kiwi.Expression(container_size) : container_size;
                return expr.multiply(val / 100.0);
            }
        }
    }
    return new kiwi.Expression(parse_absolute_length(length as AbsoluteLength));
}