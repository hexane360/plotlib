import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { vi, expect } from 'vitest';

import { interpolateMagma } from 'd3-scale-chromatic';

import { Figure, Plot, PlotLine, PlotImage } from '..';
import type { ScaleSpec } from '../Figure';
import { linear } from '../scale';
import { exportSvg, exportPng, downloadBlob } from '.';

const meta: Meta<typeof Figure> = {
    component: Figure,
    title: 'Export',
};
export default meta;
type Story = StoryObj<typeof meta>;

// ── data ──────────────────────────────────────────────────────────────────────

const N = 80;
const xs = Array.from({ length: N }, (_, i) => i / (N - 1) * 2 * Math.PI);
const ys = xs.map(Math.sin);

const scales: Map<string, ScaleSpec> = new Map([
    ['x', { scale: linear([0, 2 * Math.PI], [0, 1], { label: 'x' }), size: '260px' }],
    ['y', { scale: linear([-1.2, 1.2], [0, 1], { label: 'y' }), size: '180px' }],
]);

const M = 10;
const pixelValues = Array.from({ length: M }, (_, row) =>
    Array.from({ length: M }, (_, col) => (col + row) / (2 * (M - 1)))
);
const imageScales: Map<string, ScaleSpec> = new Map([
    ['x', { scale: linear([0, M], [0, 1], { label: 'x' }), size: '200px' }],
    ['y', { scale: linear([0, M], [0, 1], { label: 'y' }), size: '200px' }],
    ['color', { scale: linear([0, 1], interpolateMagma) }],
]);

// ── helpers ───────────────────────────────────────────────────────────────────

function FigureFixture() {
    return (
        <Figure scales={scales} debug>
            <Plot xaxis="x" yaxis="y">
                <Plot.Clip><PlotLine xs={xs} ys={ys} /></Plot.Clip>
            </Plot>
        </Figure>
    );
}

/** A `PlotImage`-bearing fixture -- exercises `inlineCanvases`'s `<foreignObject><canvas>` -> `<image>` conversion. */
function ImageFixture() {
    return (
        <Figure scales={imageScales} debug>
            <Plot xaxis="x" yaxis="y">
                <Plot.Clip><PlotImage img={pixelValues} width={M} height={M} scale="color" /></Plot.Clip>
            </Plot>
        </Figure>
    );
}

/**
 * Grab the rendered Figure's root `<svg>` and wait for the solver to settle.
 * The solver resizes the SVG over several debounced passes, so "non-zero" alone
 * is not enough -- wait until `width`/`height` stop changing across consecutive
 * polls, otherwise callers can capture a since-superseded intermediate size.
 */
async function getSettledSvg(canvasElement: HTMLElement): Promise<SVGSVGElement> {
    const svg = canvasElement.querySelector('svg');
    if (!svg) throw new Error('no <svg> found in story canvas');

    let last: string | null = null;
    await vi.waitFor(() => {
        const current = `${svg.getAttribute('width')}x${svg.getAttribute('height')}`;
        const settled = current === last && current !== '0x0';
        last = current;
        expect(settled).toBe(true);
    }, { timeout: 2000, interval: 50 });

    return svg as SVGSVGElement;
}

// ── stories ───────────────────────────────────────────────────────────────────
// These exercise the export module end-to-end against a real, mounted Figure --
// real `document.styleSheets` / computed styles / canvas rasterization -- which
// jsdom can't faithfully provide (see `export.test.ts` for the unit-level coverage
// these complement).

export const ExportSvg: Story = {
    render: () => <FigureFixture />,
    play: async ({ canvasElement }) => {
        const svg = await getSettledSvg(canvasElement);
        const text = await exportSvg(svg);

        expect(text).toMatch(/^<\?xml version="1\.0"/);
        const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
        expect(doc.querySelector('parsererror')).toBeNull();

        const root = doc.documentElement;
        // self-contained: explicit sizing survives serialization, and authored
        // styles (including theme rules targeting nested elements) are inlined.
        // CSS Modules hash class names at build time (e.g. `_Figure_11epc_1`,
        // not literal `.Figure`); the root carries both a stable, unstyled
        // `plotlib-Figure-root` hook and the hashed module class that the
        // theme's rules actually target -- assert against whichever class the
        // collected styles reference, rather than assuming a literal name.
        expect(root.getAttribute('width')).toBe(svg.getAttribute('width'));
        expect(root.getAttribute('height')).toBe(svg.getAttribute('height'));
        const rootClasses = svg.getAttribute('class')?.split(/\s+/) ?? [];
        expect(rootClasses.length).toBeGreaterThan(0);
        const styleText = root.querySelector('style')?.textContent ?? '';
        expect(rootClasses.some(cls => styleText.includes(`.${cls}`))).toBe(true);
        expect(root.querySelector('path')).not.toBeNull();
    },
};

export const ExportPng: Story = {
    render: () => <FigureFixture />,
    play: async ({ canvasElement }) => {
        const svg = await getSettledSvg(canvasElement);
        const scale = 2.0;
        const blob = await exportPng(svg, { scale });

        expect(blob.type).toBe('image/png');
        expect(blob.size).toBeGreaterThan(0);

        // rasterized at `scale` times the SVG's intrinsic pixel size
        const bitmap = await createImageBitmap(blob);
        try {
            expect(bitmap.width).toBe(Math.round(parseFloat(svg.getAttribute('width')!) * scale));
            expect(bitmap.height).toBe(Math.round(parseFloat(svg.getAttribute('height')!) * scale));
        } finally {
            bitmap.close();
        }
    },
};

export const Download: Story = {
    render: () => <FigureFixture />,
    play: async ({ canvasElement }) => {
        const svg = await getSettledSvg(canvasElement);
        const blob = new Blob([await exportSvg(svg)], { type: 'image/svg+xml;charset=utf-8' });

        // intercept the click on the temporary <a download> so the test doesn't trigger a real browser download
        const clicked: HTMLAnchorElement[] = [];
        const originalClick = HTMLAnchorElement.prototype.click;
        HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) { clicked.push(this); };
        try {
            downloadBlob(blob, 'figure.svg');
        } finally {
            HTMLAnchorElement.prototype.click = originalClick;
        }

        expect(clicked).toHaveLength(1);
        expect(clicked[0].download).toBe('figure.svg');
        expect(clicked[0].href).toMatch(/^blob:/);
    },
};

export const ExportExclude: Story = {
    render: () => <FigureFixture />,
    play: async ({ canvasElement }) => {
        const svg = await getSettledSvg(canvasElement);

        const withLine = await exportSvg(svg, { embedFonts: false });
        expect(new DOMParser().parseFromString(withLine, 'image/svg+xml').querySelector('path')).not.toBeNull();

        // `exclude` removes matching elements -- and their subtrees -- from the
        // clone before serialization, e.g. to omit interaction overlays or marks
        const withoutLine = await exportSvg(svg, { embedFonts: false, exclude: ['path'] });
        const doc = new DOMParser().parseFromString(withoutLine, 'image/svg+xml');
        expect(doc.querySelector('path')).toBeNull();
        // unrelated structure survives
        expect(doc.querySelector('svg > style')).not.toBeNull();
    },
};

export const ExportCanvas: Story = {
    render: () => <ImageFixture />,
    play: async ({ canvasElement }) => {
        const svg = await getSettledSvg(canvasElement);
        expect(svg.querySelector('foreignObject canvas')).not.toBeNull();

        const text = await exportSvg(svg, { embedFonts: false });
        const doc = new DOMParser().parseFromString(text, 'image/svg+xml');

        // `<canvas>` content can't survive `XMLSerializer` -- `inlineCanvases`
        // replaces each `<foreignObject><canvas>` with a self-contained `<image>`
        // sourced from a `data:` URL rasterized off the live canvas
        expect(doc.querySelector('foreignObject')).toBeNull();
        expect(doc.querySelector('canvas')).toBeNull();
        const image = doc.querySelector('image');
        expect(image).not.toBeNull();
        expect(image?.getAttribute('href')).toMatch(/^data:image\/png;base64,/);
        expect(image?.getAttribute('preserveAspectRatio')).toBe('none');
    },
};
