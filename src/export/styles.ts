/**
 * Collects explicitly-authored CSS rules from `document.styleSheets` and
 * concatenates them into a single `<style>` block for an exported SVG.
 *
 * Sheets that throw on `cssRules` access (cross-origin) are skipped, and
 * user-agent-stylesheet defaults aren't captured -- both are browser
 * security/scope boundaries rather than gaps in this implementation.
 */

const CUSTOM_PROPERTY_RE = /var\(\s*(--[\w-]+)/g;

export interface CollectedStyles {
    /** CSS text for matched style rules, ready for a `<style>` block. */
    cssText: string;
    /**
     * Names of CSS custom properties (e.g. `--plotlib-*`) referenced via
     * `var(...)` in the collected rules -- resolved and baked onto the
     * exported root by `inlineInheritedRootStyle` in `svg.ts`, since they're
     * typically declared outside the exported `<svg>` subtree.
     */
    customProperties: ReadonlySet<string>;
    /** `@font-face` rules found while walking stylesheets, for `fonts.ts` to filter and embed. */
    fontFaceRules: CSSFontFaceRule[];
}

/** Walk accessible stylesheets, collecting authored style rules, the custom properties they reference, and `@font-face` rules. */
export function collectStyles(): CollectedStyles {
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

    const cssText = styleRules.map(r => r.cssText).join('\n');
    const customProperties = new Set<string>();
    for (const match of cssText.matchAll(CUSTOM_PROPERTY_RE)) customProperties.add(match[1]);

    return { cssText, customProperties, fontFaceRules };
}
