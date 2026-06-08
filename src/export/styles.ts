/**
 * Collects explicitly-authored CSS rules from `document.styleSheets` for embedding
 * into an exported SVG.
 *
 * This follows svg-crowbar's "internal" mode rather than per-element
 * `getComputedStyle()` inlining: per-element inlining is the most visually
 * faithful, but balloons multi-thousand-element plots (e.g. `PlotScatter` with a
 * thousand `<circle>`s) into multi-MB output, since every element would carry its
 * own full property dump. Collecting authored rules into a single `<style>` block
 * is small and fast, at the cost of missing user-agent-stylesheet defaults and any
 * cross-origin sheets (a limitation shared by every prior-art export library --
 * it's a browser security boundary, not an implementation gap).
 *
 * Advanced relevance filtering (matching selectors against the exported subtree
 * via `element.matches()`) is deliberately not implemented yet -- this collects
 * all accessible authored rules, unfiltered by selector shape. (A blanket filter
 * on selector shape, e.g. svg-crowbar's "skip selectors containing `>`", would
 * actively break plotlib's theming: `styles.module.css` relies on nested/descendant
 * selectors like `.Figure text { font-family: ... }` for core styling.)
 */

const CUSTOM_PROPERTY_RE = /var\(\s*(--[\w-]+)/g;

export interface CollectedStyles {
    /** CSS text for matched style rules plus resolved custom-property values, ready for a `<style>` block. */
    cssText: string;
    /** `@font-face` rules found while walking stylesheets, for `fonts.ts` to filter and embed. */
    fontFaceRules: CSSFontFaceRule[];
}

/**
 * Walk accessible stylesheets, collecting authored style rules and `@font-face` rules.
 *
 * `reference` is the element being exported; its computed style is used to resolve
 * any CSS custom properties (`--plotlib-*`) referenced by collected rules -- see
 * {@link resolveCustomProperties}.
 *
 * Cross-origin sheets that throw `SecurityError` on `cssRules` access are silently
 * skipped (documented limitation; see module doc comment).
 */
export function collectStyles(reference: Element): CollectedStyles {
    const styleRules: CSSStyleRule[] = [];
    const fontFaceRules: CSSFontFaceRule[] = [];

    for (const sheet of Array.from(document.styleSheets)) {
        let rules: CSSRuleList;
        try {
            rules = sheet.cssRules;
        } catch {
            continue;
        }
        for (const rule of Array.from(rules)) {
            if (rule instanceof CSSFontFaceRule) fontFaceRules.push(rule);
            else if (rule instanceof CSSStyleRule) styleRules.push(rule);
            // other at-rules (@media, @keyframes, @layer, ...) are out of scope for this minimal pass;
            // none currently appear in plotlib's own stylesheets.
        }
    }

    const ruleText = styleRules.map(r => r.cssText).join('\n');
    const customProps = resolveCustomProperties(ruleText, reference);

    return {
        cssText: [customProps, ruleText].filter(Boolean).join('\n'),
        fontFaceRules,
    };
}

/**
 * plotlib's theme defines its color/font custom properties (`--plotlib-*`) on the
 * `<Figure>` container `<div>` (`.Figure-cont`), *outside* the `<svg>` subtree we
 * export -- so bare `var(...)` references in matched rules would fail to resolve
 * inside a standalone exported document (no element provides them).
 *
 * Re-declare each referenced property at `:root` using its current computed value
 * (which already reflects the live cascade from the container down to `reference`),
 * so the export remains self-contained without needing to duplicate container-level
 * rules or rebuild the cascade.
 */
function resolveCustomProperties(cssText: string, reference: Element): string {
    const names = new Set<string>();
    for (const match of cssText.matchAll(CUSTOM_PROPERTY_RE)) names.add(match[1]);
    if (names.size === 0) return '';

    const computed = getComputedStyle(reference);
    const decls = [...names]
        .map(name => [name, computed.getPropertyValue(name).trim()] as const)
        .filter(([, value]) => value.length > 0)
        .map(([name, value]) => `  ${name}: ${value};`);

    return decls.length ? `:root {\n${decls.join('\n')}\n}` : '';
}
