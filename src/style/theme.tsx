import React from "react";
import { deepMerge } from "../utils";

export interface Theme {
    classNamesPrefix: string | null;
    components: Record<string, ComponentTheme>;
}

export interface ComponentTheme {
    unstyled?: boolean;
    classNames: string | ReadonlyArray<string> | Record<string, string | ReadonlyArray<string>>;
}

export type ThemeOverride = Partial<Theme>;

export const DEFAULT_THEME: Theme = {
    classNamesPrefix: "plotlib",
    components: {},
};

export const ThemeContext = React.createContext<Theme | null>(null);

export interface ThemeProviderProps {
    theme?: ThemeOverride
    inherit?: boolean
    children?: React.ReactNode
}

export const useTheme = (): Theme => React.useContext(ThemeContext) ?? DEFAULT_THEME;

export function ThemeProvider({
    theme, inherit = true, children
}: ThemeProviderProps) {
    const parent = React.useContext(ThemeContext);

    const merged = React.useMemo(
        () => mergeTheme(inherit && parent ? parent : DEFAULT_THEME, theme ?? {}),
        [theme, parent, inherit]
    );

    return <ThemeContext.Provider value={merged}>{children}</ThemeContext.Provider>;
}

export const mergeTheme = (theme: Theme, other: ThemeOverride): Theme => deepMerge(theme, other);