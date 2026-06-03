export function isObject<T>(item: T): item is Exclude<T & object, readonly any[]> {
    return item != null && typeof item === 'object' && !Array.isArray(item);
}

export function deepMerge<T extends object>(target: T, source: Record<string, any>): T {
    const result: Record<string, any> = { ...target };
    Object.keys(source).forEach((key) => {
        if (isObject(source[key])) {
            if (!(key in target)) {
                result[key] = source[key];
            } else {
                result[key] = deepMerge(result[key], source[key]);
            }
        } else {
            result[key] = source[key];
        }
    });

    return result as T;
}
