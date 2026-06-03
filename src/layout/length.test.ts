import { describe, test, expect } from 'vitest';
import * as kiwi from '@lume/kiwi';
import { parse_absolute_length, parse_length, parse_variable_length } from './length';

describe('parse_absolute_length', () => {
    test('bare number returns as-is', () => {
        expect(parse_absolute_length(42)).toBe(42);
        expect(parse_absolute_length(0)).toBe(0);
        expect(parse_absolute_length(3.5)).toBe(3.5);
    });

    test('px', () => {
        expect(parse_absolute_length('10px')).toBeCloseTo(10.0);
        expect(parse_absolute_length('0px')).toBeCloseTo(0.0);
        expect(parse_absolute_length('1.5px')).toBeCloseTo(1.5);
    });

    test('pt (1pt = 4/3 px)', () => {
        expect(parse_absolute_length('3pt')).toBeCloseTo(4.0);
        expect(parse_absolute_length('1pt')).toBeCloseTo(4.0 / 3.0);
    });

    test('in (1in = 96px)', () => {
        expect(parse_absolute_length('1in')).toBeCloseTo(96.0);
        expect(parse_absolute_length('0.5in')).toBeCloseTo(48.0);
    });

    test('cm (1cm = 96/2.54 px)', () => {
        expect(parse_absolute_length('1cm')).toBeCloseTo(96.0 / 2.54);
    });

    test('mm (1mm = 96/25.4 px)', () => {
        expect(parse_absolute_length('1mm')).toBeCloseTo(96.0 / 25.4);
        expect(parse_absolute_length('10mm')).toBeCloseTo(960.0 / 25.4);
    });

    test('invalid string throws', () => {
        expect(() => parse_absolute_length('10em' as any)).toThrow();
        expect(() => parse_absolute_length('px' as any)).toThrow();
        expect(() => parse_absolute_length('abc' as any)).toThrow();
        expect(() => parse_absolute_length('' as any)).toThrow();
    });
});

describe('parse_length', () => {
    describe('bare number', () => {
        test('returns the number directly', () => {
            expect(parse_length(100, 500, 16)).toBe(100);
        });
    });

    describe('% - numeric container', () => {
        test('50% of 200 is 100', () => {
            expect(parse_length('50%', 200, 16)).toBeCloseTo(100.0);
        });

        test('100% of 300 is 300', () => {
            expect(parse_length('100%', 300, 16)).toBeCloseTo(300.0);
        });

        test('0% is 0', () => {
            expect(parse_length('0%', 400, 16)).toBeCloseTo(0.0);
        });
    });

    describe('% - kiwi.Variable container', () => {
        test('returns an Expression scaling the variable', () => {
            const v = new kiwi.Variable('w');
            v.setValue(200);
            const result = parse_length('50%', v, 16);
            expect(result).toBeInstanceOf(kiwi.Expression);
            expect((result as kiwi.Expression).value()).toBeCloseTo(100.0);
        });
    });

    describe('% - kiwi.Expression container', () => {
        test('returns an Expression scaling the expression', () => {
            const v = new kiwi.Variable('w');
            v.setValue(400);
            const expr = v.multiply(1);
            const result = parse_length('25%', expr, 16);
            expect(result).toBeInstanceOf(kiwi.Expression);
            expect((result as kiwi.Expression).value()).toBeCloseTo(100.0);
        });
    });

    describe('rem - numeric rem_scale', () => {
        test('2rem at scale 16 is 32', () => {
            expect(parse_length('2rem', 0, 16)).toBeCloseTo(32.0);
        });

        test('0.5rem at scale 16 is 8', () => {
            expect(parse_length('0.5rem', 0, 16)).toBeCloseTo(8.0);
        });
    });

    describe('rem - kiwi.Variable rem_scale', () => {
        test('returns an Expression scaling the variable', () => {
            const rem = new kiwi.Variable('rem');
            rem.setValue(16);
            const result = parse_length('2rem', 0, rem);
            expect(result).toBeInstanceOf(kiwi.Expression);
            expect((result as kiwi.Expression).value()).toBeCloseTo(32.0);
        });
    });

    describe('absolute units', () => {
        test('falls through to parse_absolute_length', () => {
            expect(parse_length('96px', 0, 16)).toBeCloseTo(96.0);
            expect(parse_length('1in', 0, 16)).toBeCloseTo(96.0);
        });
    });
});

describe('parse_variable_length', () => {
    describe('bare number', () => {
        test('returns a constant Expression', () => {
            const result = parse_variable_length(42, 0);
            expect(result).toBeInstanceOf(kiwi.Expression);
            expect((result as kiwi.Expression).value()).toBeCloseTo(42.0);
        });
    });

    describe('solver variable letters a–f', () => {
        test('"1a" returns ["a", 1]', () => {
            expect(parse_variable_length('1a', 0)).toEqual(['a', 1]);
        });

        test('"0.5b" returns ["b", 0.5]', () => {
            expect(parse_variable_length('0.5b', 0)).toEqual(['b', 0.5]);
        });

        test('all letters a-f are recognised', () => {
            for (const v of ['a', 'b', 'c', 'd', 'e', 'f'] as const) {
                expect(parse_variable_length(`2${v}`, 0)).toEqual([v, 2]);
            }
        });
    });

    describe('% - numeric container', () => {
        test('50% of 200 returns Expression with value 100', () => {
            const result = parse_variable_length('50%', 200);
            expect(result).toBeInstanceOf(kiwi.Expression);
            expect((result as kiwi.Expression).value()).toBeCloseTo(100.0);
        });
    });

    describe('% - kiwi.Variable container', () => {
        test('returns Expression scaling the variable', () => {
            const v = new kiwi.Variable('w');
            v.setValue(300);
            const result = parse_variable_length('50%', v);
            expect(result).toBeInstanceOf(kiwi.Expression);
            expect((result as kiwi.Expression).value()).toBeCloseTo(150.0);
        });
    });

    describe('absolute units', () => {
        test('falls through to parse_absolute_length, wraps in Expression', () => {
            const result = parse_variable_length('10px', 0);
            expect(result).toBeInstanceOf(kiwi.Expression);
            expect((result as kiwi.Expression).value()).toBeCloseTo(10.0);
        });

        test('1in wraps 96 in Expression', () => {
            const result = parse_variable_length('1in', 0);
            expect(result).toBeInstanceOf(kiwi.Expression);
            expect((result as kiwi.Expression).value()).toBeCloseTo(96.0);
        });
    });
});
