import { buildExportSvg, exportSvg } from './svg';
import type { ExportSvgOptions } from './svg';
import { rasterize } from './raster';
import { downloadBlob } from './download';

export type { ExportSvgOptions } from './svg';
export { exportSvg } from './svg';
export { downloadBlob } from './download';

export interface ExportPngOptions extends ExportSvgOptions {
    /**
     * Multiplier on the SVG's intrinsic pixel size for rasterization resolution
     * (e.g. `2` renders at 2x the on-screen pixel dimensions). Defaults to 1.
     *
     * Deliberately *not* a `dpi` option: CSS's "96px == 1in" rule is a layout
     * normalization, not a measurement of any real display's pixel density (real
     * displays range roughly 90-300+ PPI), and plotlib SVGs carry no physical-unit
     * dimensions (`width="6in"`) for "dpi" to anchor to. A plain multiplier says
     * exactly what it does, without implying a physical-size guarantee the export
     * can't back up.
     */
    scale?: number;
}

/** Rasterize an SVG element to a PNG `Blob`, by way of {@link exportSvg}. */
export async function exportPng(svg: SVGSVGElement, opts: ExportPngOptions = {}): Promise<Blob> {
    const { scale, ...svgOpts } = opts;
    const { text, size } = await buildExportSvg(svg, svgOpts);
    return rasterize(text, size, { scale });
}

/** Export `svg` to an SVG file and trigger a browser download. */
export async function downloadSvg(svg: SVGSVGElement, filename: string, opts?: ExportSvgOptions): Promise<void> {
    const text = await exportSvg(svg, opts);
    downloadBlob(new Blob([text], { type: 'image/svg+xml;charset=utf-8' }), filename);
}

/** Export `svg` to a PNG file and trigger a browser download. */
export async function downloadPng(svg: SVGSVGElement, filename: string, opts?: ExportPngOptions): Promise<void> {
    const blob = await exportPng(svg, opts);
    downloadBlob(blob, filename);
}
