import { describe, test, expect } from 'vitest';
import { Expression } from '@lume/kiwi';
import Variable from './Variable';
import { as_expr, expr_equal } from './expr';

describe('as_expr', () => {
    test('Variable is wrapped in an Expression', () => {
        const v = new Variable('x');
        const result = as_expr(v);
        expect(result).toBeInstanceOf(Expression);
    });

    test('Expression is returned as-is', () => {
        const e = new Expression(5);
        expect(as_expr(e)).toBe(e);
    });

    test('number becomes a constant Expression', () => {
        const result = as_expr(42);
        expect(result).toBeInstanceOf(Expression);
        expect(result.value()).toBeCloseTo(42.0);
    });

    test('zero becomes a zero Expression', () => {
        const result = as_expr(0);
        expect(result.value()).toBeCloseTo(0.0);
    });
});

describe('expr_equal', () => {
    describe('same reference', () => {
        test('identical Variable reference is equal', () => {
            const v = new Variable('x');
            expect(expr_equal(v, v)).toBe(true);
        });

        test('identical Expression reference is equal', () => {
            const e = new Expression(10);
            expect(expr_equal(e, e)).toBe(true);
        });

        test('identical number is equal', () => {
            expect(expr_equal(5, 5)).toBe(true);
        });
    });

    describe('Variable vs Variable', () => {
        test('same variable (by id) is equal', () => {
            const v = new Variable('x');
            expect(expr_equal(v, v)).toBe(true);
        });

        test('different variables are not equal', () => {
            const a = new Variable('a');
            const b = new Variable('b');
            expect(expr_equal(a, b)).toBe(false);
        });
    });

    describe('Expression vs Expression', () => {
        test('two constant Expressions with the same value are equal', () => {
            expect(expr_equal(new Expression(7), new Expression(7))).toBe(true);
        });

        test('different constants are not equal', () => {
            expect(expr_equal(new Expression(3), new Expression(4))).toBe(false);
        });

        test('expressions with same variable terms are equal', () => {
            const v = new Variable('x');
            const e1 = v.multiply(2);
            const e2 = v.multiply(2);
            expect(expr_equal(e1, e2)).toBe(true);
        });

        test('expressions with different coefficients are not equal', () => {
            const v = new Variable('x');
            expect(expr_equal(v.multiply(2), v.multiply(3))).toBe(false);
        });

        test('expressions with different number of terms are not equal', () => {
            const v = new Variable('x');
            const w = new Variable('y');
            const e1 = v.multiply(1);
            const e2 = v.plus(w);
            expect(expr_equal(e1, e2)).toBe(false);
        });
    });

    describe('cross-type', () => {
        test('Variable vs Expression is not equal', () => {
            const v = new Variable('x');
            const e = new Expression(0);
            expect(expr_equal(v, e)).toBe(false);
        });

        test('number vs Variable is not equal', () => {
            const v = new Variable('x');
            expect(expr_equal(5, v)).toBe(false);
        });

        test('number vs Expression is not equal', () => {
            expect(expr_equal(5, new Expression(5))).toBe(false);
        });

        test('Variable vs number is not equal', () => {
            const v = new Variable('x');
            expect(expr_equal(v, 0)).toBe(false);
        });
    });
});
