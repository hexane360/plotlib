/**
 * Rasterizes a self-contained SVG document to a PNG `Blob` via an off-screen canvas:
 * load the serialized SVG into an `Image`, draw it to a canvas sized by `scale`,
 * and read the result out with `canvas.toBlob`.
 */

export interface RasterOptions {
    /** Multiplier on the SVG's intrinsic pixel size for rasterization resolution. Defaults to 1. */
    scale?: number;
}

/** Rasterize a serialized SVG document of the given intrinsic `size` to a PNG `Blob`. */
export async function rasterize(
    svgText: string,
    size: { width: number, height: number },
    opts: RasterOptions = {},
): Promise<Blob> {
    const scale = opts.scale ?? 1.0;
    const width = Math.max(1, Math.round(size.width * scale));
    const height = Math.max(1, Math.round(size.height * scale));

    const url = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' }));
    try {
        const image = await loadImage(url);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("export: failed to acquire a 2d canvas context");
        ctx.drawImage(image, 0, 0, width, height);

        return await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((blob) => blob
                ? resolve(blob)
                : reject(new Error(
                    "export: rasterization produced no output -- this can happen when the canvas is " +
                    "tainted by an unresolved cross-origin resource (see export limitations)"
                )),
            'image/png');
        });
    } finally {
        URL.revokeObjectURL(url);
    }
}

function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(
            "export: failed to load the serialized SVG into an Image for rasterization " +
            "(it may be malformed, or reference an unresolved cross-origin resource)"
        ));
        image.src = url;
    });
}
