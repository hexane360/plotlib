import * as kiwi from '@lume/kiwi';

export type AbsoluteUnit = 'px' | 'pt' | 'in' | 'cm' | 'mm';
export type Unit = AbsoluteUnit | '%';
export type Variable = 'a' | 'b' | 'c' | 'd' | 'e' | 'f';
export type VariableUnit = Unit | Variable;

export type AbsoluteLength = `${number}${AbsoluteUnit}` | number;
export type Length = `${number}${Unit}` | number;
export type VariableLength = `${number}${VariableUnit}` | number;

const UNIT_SCALES: Map<AbsoluteUnit, number> = new Map([
    ['px', 1.0],
    ['pt', 4.0/3.0],
    ['in', 96.0],
    ['cm', 96.0/2.54],
    ['mm', 96.0/25.4],
])

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

export function parse_length(length: Length, container_size: number): number;
export function parse_length(length: Length, container_size: kiwi.Variable | kiwi.Expression): kiwi.Expression;
export function parse_length(length: Length, container_size: number | kiwi.Variable | kiwi.Expression): number | kiwi.Expression {
    if (typeof length === 'number') return length;
    if (length.length >= 2) {
        if (length.at(-1) == '%') {
            const val = Number(length.substring(0, length.length - 1));
            if (!Number.isNaN(val)) {
                return (typeof container_size === 'number')
                    ? val * container_size
                    : container_size.multiply(val / 100.0);
            }
        }
    }
    let len = parse_absolute_length(length as AbsoluteLength);
    return (typeof container_size === 'number') ? len : new kiwi.Expression(len);
}

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