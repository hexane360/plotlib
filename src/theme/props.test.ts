import { describe, expect, test } from 'vitest';
import { expectTypeOf } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

import { useProps } from './props';
import { ThemeProvider } from './theme';
import type { ComponentTheme } from './theme';

/** Minimal renderHook for synchronous hooks in jsdom. */
function renderHook<T>(render: () => T, Wrapper?: React.FC<{ children: React.ReactNode }>): T {
    let captured!: T;

    function Capture() {
        captured = render();
        return null;
    }

    const container = document.createElement('div');
    const root = createRoot(container);
    act(() => {
        root.render(
            Wrapper
                ? React.createElement(Wrapper, null, React.createElement(Capture))
                : React.createElement(Capture)
        );
    });
    act(() => root.unmount());

    return captured;
}

interface MyProps {
    color?: string;
    size?: number;
    label: string;
}

const componentTheme: ComponentTheme = {
    classNames: {},
    defaultProps: { color: 'theme-blue' },
};

describe('useProps', () => {
    describe('without ThemeProvider', () => {
        test('uses defaultProps for unspecified optional keys', () => {
            const result = renderHook(() =>
                useProps('Foo', { label: 'hello' } as MyProps, { color: 'red', size: 10 })
            );
            expect(result.color).toBe('red');
            expect(result.size).toBe(10);
            expect(result.label).toBe('hello');
        });

        test('explicit prop overrides defaultProps', () => {
            const result = renderHook(() =>
                useProps('Foo', { label: 'hello', color: 'blue' } as MyProps, { color: 'red' })
            );
            expect(result.color).toBe('blue');
        });

        test('undefined prop does not override defaultProps', () => {
            const result = renderHook(() =>
                useProps('Foo', { label: 'hello', color: undefined } as MyProps, { color: 'red' })
            );
            expect(result.color).toBe('red');
        });
    });

    describe('with ThemeProvider', () => {
        function Wrapper({ children }: { children: React.ReactNode }) {
            return React.createElement(ThemeProvider, {
                theme: { components: { Foo: componentTheme } },
            }, children);
        }

        test('theme defaultProps override code defaultProps', () => {
            const result = renderHook(
                () => useProps('Foo', { label: 'hello' } as MyProps, { color: 'red' }),
                Wrapper,
            );
            expect(result.color).toBe('theme-blue');
        });

        test('explicit prop overrides theme defaultProps', () => {
            const result = renderHook(
                () => useProps('Foo', { label: 'hello', color: 'explicit' }, { color: 'red' }),
                Wrapper,
            );
            expect(result.color).toBe('explicit');
        });

        test('undefined prop does not override theme defaultProps', () => {
            const result = renderHook(
                () => useProps('Foo', { label: 'hello', color: undefined } as MyProps, { color: 'red' }),
                Wrapper,
            );
            expect(result.color).toBe('theme-blue');
        });
    });

    describe('types', () => {
        test('keys present in defaultProps become required', () => {
            type Result = ReturnType<typeof useProps<MyProps, { color: string; size: number }>>;
            expectTypeOf<Result['color']>().toEqualTypeOf<string>();
            expectTypeOf<Result['size']>().toEqualTypeOf<number>();
        });

        test('keys absent from defaultProps remain as-is', () => {
            type Result = ReturnType<typeof useProps<MyProps, { color: string }>>;
            expectTypeOf<Result['color']>().toEqualTypeOf<string>();
            expectTypeOf<Result['size']>().toEqualTypeOf<number | undefined>();
            expectTypeOf<Result['label']>().toEqualTypeOf<string>();
        });
    });
});
