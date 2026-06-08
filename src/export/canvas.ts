/**
 * Replaces `<canvas>` elements -- rendered inside `<foreignObject>` wrappers by
 * components like `PlotImage` -- with plain SVG `<image>` elements pointing at
 * base64 `data:` URLs.
 *
 * `XMLSerializer` can't capture canvas pixel content (a cloned `<canvas>` is
 * blank), so each canvas must be rasterized from the *live* element via
 * `toDataURL` before the clone is serialized. `data:` URLs are used rather than
 * `URL.createObjectURL` blobs -- like `fonts.ts`, the export needs to be a
 * self-contained document that survives being saved and reopened, which a
 * document-lifetime-scoped blob URL would not.
 *
 * The enclosing `<foreignObject>` is replaced outright with the `<image>`, since
 * `<image>` renders directly in SVG without an HTML embedding context.
 *
 * `class`/`id`/`data-*` are carried over from the canvas to the `<image>` so
 * that exported `<style>` rules and `exclude` selectors targeting the canvas
 * still match its replacement. Most other canvas attributes/inline styles
 * (`width`/`height`/`display`/`transform`/`clipPath`/`zIndex`, the Safari
 * foreignObject-positioning workaround in `PlotImage`) are tied to the HTML
 * embedding context or redundant with the `<foreignObject>`'s geometry, and
 * are intentionally not copied.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Replace each `<foreignObject><canvas>...</canvas></foreignObject>` in `clone`
 * with an `<image>` rasterized from the corresponding live canvas in `svg`
 * (matched by document order, which `cloneNode(true)` preserves).
 */
export function inlineCanvases(svg: SVGSVGElement, clone: SVGSVGElement): void {
    // a plain `canvas` selector is matched reliably; compound descendant
    // selectors that span the SVG/HTML namespace boundary (`foreignObject
    // canvas`), and `closest('foreignObject')`, are not -- jsdom's selector
    // engine fails to match `foreignObject` case-sensitively against such an
    // ancestor (even though `svg.contains(canvas)` confirms the relationship
    // holds), so the ancestor is found by walking up and comparing `localName`
    const live = svg.querySelectorAll('canvas');
    const cloned = clone.querySelectorAll('canvas');

    live.forEach((canvas, i) => {
        const foreignObject = closestForeignObject(cloned[i] ?? null);
        if (!foreignObject) return;

        const image = document.createElementNS(SVG_NS, 'image');
        for (const attr of ['x', 'y', 'width', 'height']) {
            const value = foreignObject.getAttribute(attr);
            if (value != null) image.setAttribute(attr, value);
        }
        // carry over class/id/data-* so exported `<style>` rules and `exclude`
        // selectors that target the canvas still match its replacement
        for (const attr of (canvas as HTMLCanvasElement).attributes) {
            if (attr.name === 'class' || attr.name === 'id' || attr.name.startsWith('data-')) {
                image.setAttribute(attr.name, attr.value);
            }
        }
        image.setAttribute('href', (canvas as HTMLCanvasElement).toDataURL('image/png'));
        // the live canvas is stretched to fill its foreignObject box via
        // `width: 100%; height: 100%` (potentially distorting its aspect ratio)
        // -- match that here, since `<image>`'s default `preserveAspectRatio`
        // would instead letterbox it
        image.setAttribute('preserveAspectRatio', 'none');
        const rendering = (canvas as HTMLCanvasElement).style.imageRendering;
        if (rendering) image.setAttribute('image-rendering', rendering);

        foreignObject.replaceWith(image);
    });
}

function closestForeignObject(el: Element | null): Element | null {
    for (let node = el; node != null; node = node.parentElement) {
        if (node.localName === 'foreignObject') return node;
    }
    return null;
}
