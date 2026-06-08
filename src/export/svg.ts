/**
 * Builds a self-contained SVG document from a live `SVGSVGElement`: clones the
 * subtree, ensures explicit sizing survives serialization, bakes in inherited
 * computed style from the live root (see `inlineInheritedRootStyle`), embeds
 * collected styles/fonts as `<style>` blocks, and serializes via `XMLSerializer`.
 */

import { collectStyles } from './styles';
import { collectFonts } from './fonts';
import { inlineCanvases } from './canvas';

const SVG_NS = 'http://www.w3.org/2000/svg';

export interface ExportSvgOptions {
    /** Collect and embed matched stylesheet rules (see `styles.ts`). Defaults to `true`. */
    inlineStyles?: boolean;
    /** Embed referenced `@font-face` fonts as base64 data URLs (see `fonts.ts`). Defaults to `true`. */
    embedFonts?: boolean;
    /** Background fill for the root `<svg>`. Left transparent if omitted. */
    background?: string;
    /**
     * CSS selectors for elements to omit from the export (e.g. interaction
     * overlays like the box-zoom rectangle, or other on-screen-only
     * decorations). Matching elements -- and their subtrees -- are removed
     * from the clone before serialization; the live SVG is left untouched.
     */
    exclude?: readonly string[];
}

export interface ExportedSvg {
    /** Self-contained, standalone SVG document text (including XML declaration). */
    text: string;
    /** Intrinsic pixel size of the exported document -- used by `raster.ts` to size its canvas. */
    size: { width: number, height: number };
}

/**
 * Build a self-contained SVG document from `svg`. Shared by `exportSvg` (which
 * just returns `.text`) and `exportPng` (which additionally needs `.size` to
 * size its rasterization canvas).
 */
export async function buildExportSvg(svg: SVGSVGElement, opts: ExportSvgOptions = {}): Promise<ExportedSvg> {
    const { inlineStyles = true, embedFonts = true, background, exclude } = opts;

    const size = intrinsicSize(svg);
    // `svg` (and so its clone) is already in the SVG namespace -- React renders
    // `<svg>` via `createElementNS` -- so `XMLSerializer` emits `xmlns="..."`
    // automatically; setting it explicitly here would duplicate the attribute.
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('width', String(size.width));
    clone.setAttribute('height', String(size.height));
    if (!clone.hasAttribute('viewBox')) clone.setAttribute('viewBox', `0 0 ${size.width} ${size.height}`);

    inlineInheritedRootStyle(svg, clone);

    for (const selector of exclude ?? []) clone.querySelectorAll(selector).forEach(el => el.remove());

    // `XMLSerializer` can't capture canvas pixel content -- rasterize each live
    // `<canvas>` (e.g. from `PlotImage`) into a self-contained `<image>` before
    // serializing
    inlineCanvases(svg, clone);

    if (background != null) {
        const rect = document.createElementNS(SVG_NS, 'rect');
        rect.setAttribute('x', '0');
        rect.setAttribute('y', '0');
        rect.setAttribute('width', String(size.width));
        rect.setAttribute('height', String(size.height));
        rect.setAttribute('style', `fill: ${background};`);
        clone.insertBefore(rect, clone.firstChild);
    }

    const styleChunks: string[] = [];
    let fontFaceRules: readonly CSSFontFaceRule[] = [];
    if (inlineStyles || embedFonts) {
        const collected = collectStyles(svg);
        if (inlineStyles) styleChunks.push(collected.cssText);
        fontFaceRules = collected.fontFaceRules;
    }
    if (embedFonts && fontFaceRules.length > 0) {
        const fonts = await collectFonts(svg, fontFaceRules);
        if (fonts.cssText) styleChunks.push(fonts.cssText);
    }
    const cssText = styleChunks.filter(Boolean).join('\n\n');
    if (cssText) {
        const style = document.createElementNS(SVG_NS, 'style');
        style.textContent = cssText;
        clone.insertBefore(style, clone.firstChild);
    }

    return { text: serialize(clone), size };
}

/** Serialize an SVG element (and its enclosing page styles/fonts) to a self-contained SVG string. */
export async function exportSvg(svg: SVGSVGElement, opts?: ExportSvgOptions): Promise<string> {
    return (await buildExportSvg(svg, opts)).text;
}

/**
 * Resolve the SVG's intrinsic pixel size. `Constrained` keeps `width`/`height`
 * attributes in sync with the solved layout (as plain numbers, via
 * `setAttribute`), so reading the attributes directly is the most direct source
 * (and avoids relying on `SVGAnimatedLength`, which e.g. jsdom doesn't
 * implement); fall back to rendered layout size, then `viewBox`, for SVGs sized
 * other ways.
 */
function intrinsicSize(svg: SVGSVGElement): { width: number, height: number } {
    const numericAttr = (name: string): number | null => {
        const value = parseFloat(svg.getAttribute(name) ?? '');
        return Number.isFinite(value) ? value : null;
    };
    const rect = svg.getBoundingClientRect();
    const viewBox = svg.viewBox?.baseVal;

    return {
        width:  numericAttr('width')  ?? (rect.width  || viewBox?.width  || 0),
        height: numericAttr('height') ?? (rect.height || viewBox?.height || 0),
    };
}

/**
 * CSS/SVG properties that the spec defines as *inherited* -- their computed
 * values flow down through descendants via the cascade, regardless of which
 * ancestor (or `:root`, or the UA stylesheet, or `prefers-color-scheme`)
 * ultimately set them. Once `clone` becomes a standalone document's root
 * element, that ancestor chain is gone -- any of these values that the live
 * `svg` inherited from outside the exported subtree would silently revert to
 * UA defaults. Baking in the live computed values explicitly preserves
 * whatever the original page's cascade resolved to, generically -- without
 * the export needing to know *which* rules or elements set them.
 */
const INHERITED_PROPERTIES = [
    // text
    'color', 'font-family', 'font-size', 'font-style', 'font-variant', 'font-weight',
    'font-stretch', 'font-size-adjust',
    'line-height', 'letter-spacing', 'word-spacing', 'white-space', 'direction', 'text-anchor',
    'writing-mode', 'text-orientation', 'glyph-orientation-vertical',
    // SVG paint (inherited per the SVG spec, unlike most CSS paint-adjacent properties)
    'fill', 'fill-opacity', 'fill-rule', 'clip-rule',
    'stroke', 'stroke-width', 'stroke-opacity', 'stroke-linecap', 'stroke-linejoin',
    'stroke-miterlimit', 'stroke-dasharray', 'stroke-dashoffset', 'paint-order',
    'marker', 'marker-start', 'marker-mid', 'marker-end',
    // rendering hints
    'image-rendering', 'shape-rendering', 'color-rendering', 'text-rendering',
    'color-interpolation', 'color-interpolation-filters',
    // visibility / interaction
    'visibility', 'cursor', 'pointer-events',
] as const;

/**
 * Copy the live root's computed values for {@link INHERITED_PROPERTIES} onto
 * `clone`'s inline style, so descendants keep inheriting the same effective
 * values they had in the original document.
 */
function inlineInheritedRootStyle(svg: SVGSVGElement, clone: SVGSVGElement): void {
    const computed = getComputedStyle(svg);
    for (const prop of INHERITED_PROPERTIES) {
        const value = computed.getPropertyValue(prop);
        if (value) clone.style.setProperty(prop, value);
    }
}

function serialize(svg: SVGSVGElement): string {
    const text = new XMLSerializer().serializeToString(svg);
    return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n${text}`;
}
