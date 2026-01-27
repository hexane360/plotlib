import React from 'react';
import clsx from 'clsx';

import { Theme, useTheme } from './theme';
import globalClasses from "../styles.module.css";
import { isObject } from '../utils';

export interface Styles {
    className: string,
    style: React.CSSProperties,
}

export interface StylesProps {
    unstyled?: boolean;
    classNames?: string | ReadonlyArray<string>;
}

export function useStyles(
    componentName: string,
    props: StylesProps,
    classes?: Record<string, string>,
): Styles {
    const theme = useTheme();

    return React.useMemo(() => getStyles({
        theme,
        componentName,
        classes,
        unstyled: props.unstyled,
        classNames: props.classNames,
    }), [theme, componentName, props.unstyled, props.classNames]);
}

export interface CompoundStylesProps<StylesNames extends string> {
    unstyled?: boolean;
    classNames?: string | ReadonlyArray<string> | Record<StylesNames, string | ReadonlyArray<string>>;
}

export function useCompoundStyles<StylesNames extends string>(
    componentName: string,
    props: CompoundStylesProps<StylesNames>,
    classes?: Record<string, string>,
    rootComponentName?: string,
): (subComponentName?: string) => Styles {
    const theme = useTheme();

    return React.useCallback((subComponentName) => getStyles({
        theme,
        componentName,
        subComponentName,
        classes,
        rootComponentName,
        unstyled: props.unstyled,
        classNames: props.classNames,
    }), [theme, componentName, props.unstyled, props.classNames]);
}

export interface GetStylesOpts {
    /** Name of component */
    componentName: string;
    /** Name of subcomponent (defaults to 'root') */
    subComponentName?: string;
    /** Whether component should be unstyled */
    unstyled?: boolean;
    /** Name of root subcomponent (where un-specified styles should be placed) */
    rootComponentName?: string;

    /** Styles from local CSS module */
    classes?: Record<string, string>;

    /** Passed classnames */
    classNames?: string | ReadonlyArray<string> | Record<string, string | ReadonlyArray<string>>;

    theme: Theme;
};

function getStyles({
    componentName,
    subComponentName = 'root',
    rootComponentName = 'root',
    unstyled,
    classes,
    theme,
    classNames,
}: GetStylesOpts): Styles {
    const componentTheme = theme.components[componentName];
    let themeClassNames;
    if (componentTheme) {
        unstyled = unstyled ?? componentTheme.unstyled;
        themeClassNames = componentTheme.classNames;
    }

    return {
        className: clsx(
            // static classname (e.g. plotlib-Plot-root)
            theme.classNamesPrefix && `${theme.classNamesPrefix}-${componentName}-${subComponentName}`,
            // CSS module class (e.g. plotlib.styles.Plot)
            !unstyled && [
                classes && classes[subComponentName],
                globalClasses[`${componentName}-${subComponentName}`],
                // also accept .Plot instead of .Plot-root
                subComponentName == 'root' && globalClasses[componentName],
            ],
            // theme classnames
            isObject(themeClassNames) ? themeClassNames[subComponentName] : (subComponentName == rootComponentName && themeClassNames),
            // passed classnames
            isObject(classNames) ? classNames[subComponentName] : (subComponentName == rootComponentName && classNames),
        ),
        style: {},
    };
}