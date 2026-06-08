/**
 * Embeds `@font-face` rules referenced by an exported subtree as base64 `data:`
 * URLs, so the exported SVG renders correctly without depending on the original
 * page's network resources.
 *
 * Relevance is determined by reading each element's *computed* `font-family`
 * (the resolved, cascaded stack -- e.g. `"Inter", Arial, sans-serif`) and keeping
 * only `@font-face` rules whose `font-family` descriptor names one of those
 * families. This both narrows embedding work to in-use fonts and naturally
 * excludes generic keywords (`sans-serif`) and ambient system fonts, since no
 * `@font-face` rule declares them.
 */

const FAMILY_NAME_RE = /^['"]?([^'"]+?)['"]?$/;
const URL_RE = /url\(\s*(['"]?)([^'")]*)\1\s*\)/g;

export interface CollectedFonts {
    /** CSS text containing rewritten `@font-face` rules with embedded sources, ready for a `<style>` block. */
    cssText: string;
}

/**
 * Filter `fontFaceRules` down to those referenced by `root`'s rendered text, fetch
 * and base64-encode their `src` resources, and emit rewritten rules pointing at the
 * resulting data URLs.
 *
 * Resources that fail to resolve (cross-origin without CORS headers, 404s, etc.)
 * are dropped from the rewritten `src` list rather than failing the export.
 */
export async function collectFonts(root: Element, fontFaceRules: readonly CSSFontFaceRule[]): Promise<CollectedFonts> {
    if (fontFaceRules.length === 0) return { cssText: '' };

    const referenced = collectReferencedFamilies(root);
    const relevant = fontFaceRules.filter(rule => {
        const family = parseFamilyName(rule.style.getPropertyValue('font-family'));
        return family != null && referenced.has(family);
    });
    if (relevant.length === 0) return { cssText: '' };

    const baseUrl = relevant[0].parentStyleSheet?.href ?? document.baseURI;
    const urls = new Set<string>();
    for (const rule of relevant) {
        for (const match of rule.style.getPropertyValue('src').matchAll(URL_RE)) {
            if (match[2]) urls.add(new URL(match[2], baseUrl).href);
        }
    }

    const entries = await Promise.all([...urls].map(async (url) => [url, await toDataUrl(url)] as const));
    const resolved = new Map(entries);

    const cssText = relevant
        .map(rule => rewriteUrls(rule.cssText, baseUrl, resolved))
        .join('\n');

    return { cssText };
}

/** Collect the set of font-family names referenced (in any cascade position) by `root` and its descendants. */
function collectReferencedFamilies(root: Element): Set<string> {
    const families = new Set<string>();
    const visit = (el: Element) => {
        for (const name of getComputedStyle(el).fontFamily.split(',')) {
            const family = parseFamilyName(name);
            if (family != null) families.add(family);
        }
        for (const child of Array.from(el.children)) visit(child);
    };
    visit(root);
    return families;
}

function parseFamilyName(raw: string): string | null {
    const match = raw.trim().match(FAMILY_NAME_RE);
    return match ? match[1].trim() : null;
}

/**
 * Fetch a resource and convert it to a base64 `data:` URL. Returns `null` (rather
 * than throwing) on any failure, so callers can drop unresolvable sources.
 */
async function toDataUrl(url: string): Promise<string | null> {
    try {
        const response = await fetch(url);
        if (!response.ok) return null;
        const blob = await response.blob();
        return await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
        });
    } catch {
        return null;
    }
}

/** Rewrite every `url(...)` reference in `cssText` to its resolved data URL, dropping ones that failed to resolve. */
function rewriteUrls(cssText: string, baseUrl: string, resolved: ReadonlyMap<string, string | null>): string {
    return cssText.replace(URL_RE, (whole, _quote: string, rawUrl: string) => {
        if (!rawUrl) return whole;
        const dataUrl = resolved.get(new URL(rawUrl, baseUrl).href);
        return dataUrl ? `url("${dataUrl}")` : '';
    });
}
