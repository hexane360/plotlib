import { useTheme } from "./theme";

type FilterUndefinedResult<T extends Record<string, any>> = {
    [Key in keyof T]-?: T[Key] extends undefined ? never : T[Key];
};

function filterUndefined<T extends Record<string, any>>(obj: T): FilterUndefinedResult<T> {
    let result: Record<string, any> = {}
    for (const [k, v] of Object.entries(obj)) {
        if (v !== undefined) result[k] = v;
    }
    return result as FilterUndefinedResult<T>;
}

export function useProps<T extends Record<string, any>, U extends Partial<T> = {}>(
    component: string,
    props: T,
    defaultProps: U,
): T & { [Key in Extract<keyof T, keyof U>]-?: U[Key] | NonNullable<T[Key]>; }
{
    const theme = useTheme();
    const themeProps = theme.components[component]?.defaultProps ?? {};
    return { ...defaultProps, ...themeProps, ...filterUndefined(props) };
}