import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

import { collectStyles } from './styles';
import { collectFonts } from './fonts';
import { exportSvg } from './svg';

const SVG_NS = 'http://www.w3.org/2000/svg';

// ── helpers ──────────────────────────────────────────────────────────────────

function injectStyle(cssText: string): HTMLStyleElement {
    const style = document.createElement('style');
    style.textContent = cssText;
    document.head.appendChild(style);
    return style;
}

function makeSvg(inner: string, attrs: Record<string, string> = {}): SVGSVGElement {
    const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
    for (const [k, v] of Object.entries({ width: '200', height: '100', ...attrs })) svg.setAttribute(k, v);
    svg.innerHTML = inner;
    document.body.appendChild(svg);
    return svg;
}

afterEach(() => {
    document.querySelectorAll('style, svg').forEach(el => el.remove());
});

/**
 * Construct a minimal stand-in for `CSSFontFaceRule` exposing only what
 * `collectFonts` reads (`style.getPropertyValue`, `cssText`, `parentStyleSheet`).
 * jsdom's CSS parser doesn't retain `src: url(...)` descriptors on real
 * `@font-face` rules (it drops them), so real injected stylesheets can't
 * exercise the URL-resolution path -- mocks stand in for "real browser" CSSOM,
 * which the storybook test exercises end-to-end.
 */
function mockFontFaceRule(family: string, src: string, href: string | null = null): CSSFontFaceRule {
    return {
        cssText: `@font-face { font-family: "${family}"; src: ${src}; }`,
        style: { getPropertyValue: (name: string) => name === 'font-family' ? `"${family}"` : name === 'src' ? src : '' },
        parentStyleSheet: href != null ? { href } : null,
    } as unknown as CSSFontFaceRule;
}

// ── collectStyles ─────────────────────────────────────────────────────────────

describe('collectStyles', () => {
    test('collects authored CSSStyleRules, including descendant selectors', () => {
        injectStyle('.foo { fill: red; }\n.foo text { font-family: sans-serif; }');
        const { cssText } = collectStyles();

        expect(cssText).toContain('.foo { fill: red; }');
        expect(cssText).toContain('.foo text { font-family: sans-serif; }');
    });

    test('separates @font-face rules from style rules', () => {
        injectStyle('@font-face { font-family: TestFont; }\n.bar { color: blue; }');
        const { cssText, fontFaceRules } = collectStyles();

        expect(fontFaceRules).toHaveLength(1);
        expect(fontFaceRules[0].style.getPropertyValue('font-family')).toBe('TestFont');
        expect(cssText).not.toContain('@font-face');
        expect(cssText).toContain('.bar { color: blue; }');
    });

    test('collects the names of custom properties referenced via var(...)', () => {
        injectStyle('.foo { fill: var(--my-color); stroke: var(--my-stroke, black); }');
        const { customProperties } = collectStyles();

        expect(customProperties).toEqual(new Set(['--my-color', '--my-stroke']));
    });

    test('returns an empty set of custom properties when none are referenced', () => {
        injectStyle('.foo { fill: red; }');
        const { customProperties } = collectStyles();

        expect(customProperties.size).toBe(0);
    });
});

// ── collectFonts ──────────────────────────────────────────────────────────────

describe('collectFonts', () => {
    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        fetchMock = vi.fn(async (url: string) => url.endsWith('/missing.woff2')
            ? { ok: false }
            : { ok: true, blob: async () => new Blob(['fake-font-bytes'], { type: 'font/woff2' }) }
        );
        vi.stubGlobal('fetch', fetchMock);
    });
    afterEach(() => vi.unstubAllGlobals());

    test('embeds only @font-face rules whose family is referenced in the subtree', async () => {
        const svg = makeSvg('<text style="font-family: \'UsedFont\', sans-serif">hi</text>');
        const used = mockFontFaceRule('UsedFont', 'url(https://fonts.example/good.woff2) format("woff2")', 'https://fonts.example/sheet.css');
        const unused = mockFontFaceRule('UnusedFont', 'url(https://fonts.example/other.woff2)');

        const { cssText } = await collectFonts(svg, [used, unused]);
        expect(cssText).toContain('UsedFont');
        expect(cssText).not.toContain('UnusedFont');
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith('https://fonts.example/good.woff2');
    });

    test('rewrites resolvable urls to data: URLs and drops unresolvable ones', async () => {
        const svg = makeSvg('<text style="font-family: Multi">hi</text>');
        const rule = mockFontFaceRule(
            'Multi',
            'url(https://fonts.example/good.woff2) format("woff2"), url(https://fonts.example/missing.woff2) format("woff2")',
            'https://fonts.example/sheet.css',
        );

        const { cssText } = await collectFonts(svg, [rule]);
        expect(cssText).toContain('url("data:font/woff2;base64,');
        expect(cssText).not.toContain('fonts.example/good.woff2');
        expect(cssText).not.toContain('fonts.example/missing.woff2');
    });

    test('returns nothing -- and fetches nothing -- when no declared font is referenced', async () => {
        const svg = makeSvg('<text style="font-family: sans-serif">hi</text>');
        const rule = mockFontFaceRule('Unused', 'url(https://fonts.example/x.woff2)');

        const { cssText } = await collectFonts(svg, [rule]);
        expect(cssText).toBe('');
        expect(fetchMock).not.toHaveBeenCalled();
    });

    test('returns nothing when there are no @font-face rules to consider', async () => {
        const svg = makeSvg('<text style="font-family: AnyFont">hi</text>');

        const { cssText } = await collectFonts(svg, []);
        expect(cssText).toBe('');
        expect(fetchMock).not.toHaveBeenCalled();
    });
});

// ── exportSvg ─────────────────────────────────────────────────────────────────

describe('exportSvg', () => {
    test('produces a self-contained, well-formed standalone SVG document', async () => {
        injectStyle('.mark { fill: red; }');
        const svg = makeSvg('<circle class="mark" cx="10" cy="10" r="5" />', { width: '120', height: '80' });

        const text = await exportSvg(svg, { embedFonts: false });
        expect(text).toMatch(/^<\?xml version="1\.0"/);
        expect(text).toContain('xmlns="http://www.w3.org/2000/svg"');
        expect(text).toContain('width="120"');
        expect(text).toContain('height="80"');
        expect(text).toContain('<style');
        expect(text).toContain('.mark { fill: red; }');
        expect(text).toContain('<circle');

        const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
        expect(doc.querySelector('parsererror')).toBeNull();
    });

    test('bakes the live root\'s inherited computed properties into the clone', async () => {
        // `color` here is inherited from `wrapper`, outside the exported `<svg>`
        // subtree -- in a standalone export there's no ancestor to inherit from,
        // so the resolved value must be baked in explicitly to survive
        const wrapper = document.createElement('div');
        wrapper.style.color = 'rgb(10, 20, 30)';
        document.body.appendChild(wrapper);
        try {
            const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
            svg.setAttribute('width', '100');
            svg.setAttribute('height', '50');
            wrapper.appendChild(svg);

            const text = await exportSvg(svg, { embedFonts: false, inlineStyles: false });
            const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
            expect(doc.documentElement.getAttribute('style')).toContain('color: rgb(10, 20, 30)');
        } finally {
            wrapper.remove();
        }
    });

    test('bakes referenced custom properties into the clone, declared outside the exported subtree', async () => {
        // mirrors how plotlib's theme declares `--plotlib-*` on `.Figure-cont`,
        // outside the exported `<svg>` -- the resolved value must be baked onto
        // the clone's root (alongside the ordinary inherited properties above)
        // so `var(--my-color)` in the embedded rule still resolves once the
        // clone becomes a standalone document with no such ancestor
        injectStyle('.mark { fill: var(--my-color); }');
        const wrapper = document.createElement('div');
        wrapper.style.setProperty('--my-color', 'rebeccapurple');
        document.body.appendChild(wrapper);
        try {
            const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
            svg.setAttribute('width', '100');
            svg.setAttribute('height', '50');
            svg.innerHTML = '<circle class="mark" r="5"/>';
            wrapper.appendChild(svg);

            const text = await exportSvg(svg, { embedFonts: false });
            const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
            expect(doc.documentElement.getAttribute('style')).toContain('--my-color: rebeccapurple');
            expect(text).toContain('var(--my-color)');
        } finally {
            wrapper.remove();
        }
    });

    test('injects a background rect as the first child when requested', async () => {
        const svg = makeSvg('<circle r="5"/>', { width: '100', height: '50' });

        const text = await exportSvg(svg, { embedFonts: false, inlineStyles: false, background: '#fff' });
        const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
        const first = doc.documentElement.firstElementChild;
        expect(first?.tagName).toBe('rect');
        expect(first?.getAttribute('style')).toContain('fill: #fff');
        expect(first?.getAttribute('width')).toBe('100');
        expect(first?.getAttribute('height')).toBe('50');
    });

    test('omits style and background elements when disabled', async () => {
        injectStyle('.mark { fill: red; }');
        const svg = makeSvg('<circle class="mark" r="5"/>');

        const text = await exportSvg(svg, { embedFonts: false, inlineStyles: false });
        expect(text).not.toContain('<style');
        expect(text).not.toContain('<rect');
    });

    test('does not mutate the original SVG element', async () => {
        const svg = makeSvg('<circle r="5"/>', { width: '100', height: '50' });
        const before = svg.outerHTML;

        await exportSvg(svg, { embedFonts: false });
        expect(svg.outerHTML).toBe(before);
    });

    test('omits elements matching `exclude` selectors', async () => {
        const svg = makeSvg('<g class="keep"><circle r="3"/></g><g class="drop"><circle r="5"/><rect/></g>');

        const text = await exportSvg(svg, { embedFonts: false, inlineStyles: false, exclude: ['.drop'] });
        const doc = new DOMParser().parseFromString(text, 'image/svg+xml');

        expect(doc.querySelector('.drop')).toBeNull();
        expect(doc.querySelectorAll('circle')).toHaveLength(1);
        expect(doc.querySelector('.keep')).not.toBeNull();
    });

    test('replaces <foreignObject><canvas> elements with rasterized <image> elements', async () => {
        const toDataURL = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,FAKE');
        try {
            // built directly via `createElementNS` rather than `innerHTML` --
            // jsdom's HTML parser doesn't apply the SVG tag-name case correction
            // (`foreignobject` -> `foreignObject`) that real browsers do, which
            // would otherwise make `inlineCanvases`'s selector fail to match
            const svg = makeSvg('');
            const foreignObject = document.createElementNS(SVG_NS, 'foreignObject');
            for (const [k, v] of Object.entries({ x: '1', y: '2', width: '30', height: '40' })) foreignObject.setAttribute(k, v);
            const canvas = document.createElement('canvas');
            canvas.setAttribute('width', '300');
            canvas.setAttribute('height', '400');
            canvas.setAttribute('style', 'image-rendering: pixelated; width: 100%; height: 100%');
            canvas.setAttribute('class', 'foo bar');
            canvas.setAttribute('id', 'my-canvas');
            canvas.setAttribute('data-plotlib-decoration', '');
            foreignObject.appendChild(canvas);
            svg.appendChild(foreignObject);

            const text = await exportSvg(svg, { embedFonts: false, inlineStyles: false });
            const doc = new DOMParser().parseFromString(text, 'image/svg+xml');

            expect(doc.querySelector('foreignObject')).toBeNull();
            expect(doc.querySelector('canvas')).toBeNull();
            const image = doc.querySelector('image');
            expect(image?.getAttribute('x')).toBe('1');
            expect(image?.getAttribute('y')).toBe('2');
            expect(image?.getAttribute('width')).toBe('30');
            expect(image?.getAttribute('height')).toBe('40');
            expect(image?.getAttribute('href')).toBe('data:image/png;base64,FAKE');
            expect(image?.getAttribute('preserveAspectRatio')).toBe('none');
            expect(image?.getAttribute('image-rendering')).toBe('pixelated');
            expect(image?.getAttribute('class')).toBe('foo bar');
            expect(image?.getAttribute('id')).toBe('my-canvas');
            expect(image?.getAttribute('data-plotlib-decoration')).toBe('');
        } finally {
            toDataURL.mockRestore();
        }
    });
});
