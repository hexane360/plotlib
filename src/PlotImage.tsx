import React from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai/react";
import { unwrap } from "jotai/utils";
import { Property } from "csstype";

import { FigureContext, PlotContext } from "./context";
import { ColorLike, NumericScale } from "./scale";
import { color as d3color } from 'd3-color';
import { useAsAtom, isClose, nan_minmax } from "./utils";
import * as layout from "./layout";
import { StylesProps, useProps, useStyles } from "./theme";
import { Transform2D } from "./transform";
import { Atom } from "jotai";

/** Sentinel returned by the `img` atom while an underlying `Promise` hasn't resolved yet. */
const PENDING = Symbol('plotlib-img-pending');

type MinMaxObj = {vmin: number | null, vmax: number | null};
type DrawFunction = (ctx: CanvasRenderingContext2D, data: ImageData, scale: NumericScale<ColorLike>) => void | Promise<void>;
type AutoscaleFunction = () => MinMaxObj | Iterable<number> | Promise<MinMaxObj | Iterable<number>>;
/** Row-major 2D array or flat ArrayLike (TypedArray / plain array) of numeric data values. */
type PlotData = ReadonlyArray<ReadonlyArray<number>> | ArrayLike<number>;

const is_minmax_obj = (val: MinMaxObj | Iterable<number>): val is MinMaxObj => (
    typeof val === 'object' && Object.hasOwn(val, 'vmin') && Object.hasOwn(val, 'vmax')
);

const is_2d_data = (d: PlotData): d is ReadonlyArray<ReadonlyArray<number>> =>
    Array.isArray(d) && Array.isArray((d as any)[0]);

async function get_scale(fn: AutoscaleFunction): Promise<[number | null, number | null]> {
    const val = await fn();
    if (is_minmax_obj(val)) return [val.vmin, val.vmax];
    return nan_minmax(val);
}

interface PlotImageProps extends StylesProps {
    /**
     * Image to render. Accepts:
     *  - a row-major 2D array of numbers
     *  - a flat `ArrayLike<number>`, including TypedArrays such as `Float32Array`
     *  - a `Promise` resolving to either of the above. While pending, the canvas stays blank
     *    and this component registers itself as loading with the enclosing `Plot` (see its
     *    `suspense` prop). Pass a stable `Promise` reference (e.g. built outside the
     *    component, or memoized with an empty dependency array) — one recreated on every render
     *    can keep getting discarded and restarted by ancestor re-renders (such as layout
     *    settling) before it ever resolves, leaving it loading indefinitely.
     * or an atom of any of the above.
     */
    img?: PlotData | Promise<PlotData> | Atom<PlotData | Promise<PlotData>>

    /**
     * Low-level drawing function. Called with a `CanvasRenderingContext2D`, a pre-allocated
     * `ImageData` (sized to the canvas), and the resolved color scale. Should write RGBA pixel
     * data into `imageData.data`; the component calls `ctx.putImageData(imageData, 0, 0)` after
     * `draw_fn` resolves. May be async (return a `Promise<void>`); if a newer draw is triggered
     * before it resolves, its result is discarded.
     */
    draw_fn?: DrawFunction | Atom<DrawFunction>
    /**
     * Low-level function to calculate vmin and vmax of the data. May be async (return a
     * `Promise`); if a newer draw is triggered before it resolves, its result is discarded.
     */
    autoscale_fn?: AutoscaleFunction | Atom<AutoscaleFunction>

    /** Pixel width of the image drawing buffer. */
    width: number
    /** Pixel height of the image drawing buffer. */
    height: number
    /** Key of the color scale entry used to map values to colors. */
    scale: string

    /** Data-coordinate bounds `[min, max]` of the image along the x-axis. Defaults to the full x-axis domain. */
    xlim?: [number, number]
    /** Data-coordinate bounds `[min, max]` of the image along the y-axis. Defaults to the full y-axis domain. */
    ylim?: [number, number]

    /** image-rendering to use for canvas, defaults to 'pixelated'. */
    imageRendering?: Property.ImageRendering;
}

export default function PlotImage(props: PlotImageProps) {
    const fig = React.useContext(FigureContext);
    const plot = React.useContext(PlotContext);
    if (!fig || !plot) {
        throw new Error("Component 'PlotImage' must be used inside a 'Plot'");
    }
    props = useProps('PlotImage', props, {});
    const styles = useStyles('PlotImage', props);
    const [xscale, yscale] = [plot.xaxis, plot.yaxis].map(fig.get_continuous_scale);
    const [curr_xscale, curr_yscale] = [xscale, yscale].map((s) => useAtomValue(s.scale));
    const vscale = fig.get_color_scale(props.scale);
    const [curr_scale, set_curr_scale] = useAtom(vscale.scale);
    const [min_source, max_source] = [vscale.min_source, vscale.max_source].map((v) => useAtomValue(v));

    const xlim = curr_xscale.transform(props.xlim ?? curr_xscale.domain) as [number, number];
    const ylim = curr_yscale.transform(props.ylim ?? curr_yscale.domain) as [number, number];

    const imgAtom = useAsAtom(props.img);
    const imgUnwrappedAtom = React.useMemo(() => unwrap(imgAtom, (): typeof PENDING => PENDING), [imgAtom]);
    const imgOrPending = useAtomValue(imgUnwrappedAtom);
    const imgLoading = imgOrPending === PENDING;
    const img = imgOrPending === PENDING ? undefined : imgOrPending;
    let draw_fn = useAtomValue(useAsAtom(props.draw_fn));
    let autoscale_fn = useAtomValue(useAsAtom(props.autoscale_fn));

    draw_fn = React.useMemo(() => {
        if (draw_fn) {
            if (img) throw new Error("PlotImage: Cannot specify both 'img' and 'draw_fn'");
            return draw_fn;
        } else if (props.img === undefined) {
            throw new Error("PlotImage: either 'img' or 'draw_fn' must be specified");
        } else if (!img) {
            return undefined; // img was specified but hasn't resolved yet
        } else {
            return (ctx, imageData, scale) => {
                const [width, height] = [ctx.canvas.width, ctx.canvas.height];
                const pixels = imageData.data;
                if (is_2d_data(img)) {
                    for (let i = 0; i < Math.min(height, img.length); i++) {
                        const row = img[i];
                        let idx = i * width * 4;
                        for (let j = 0; j < Math.min(width, row.length); j++) {
                            const colorLike = scale.transform(row[j]);
                            const c = (typeof colorLike === 'string' ? d3color(colorLike)! : colorLike).rgb();
                            pixels[idx    ] = c.r;
                            pixels[idx + 1] = c.g;
                            pixels[idx + 2] = c.b;
                            pixels[idx + 3] = c.opacity * 255;
                            idx += 4;
                        }
                    }
                } else {
                    const colors = scale.transform(Array.from(img)).map((c) =>
                        (typeof c === 'string' ? d3color(c)! : c).rgb()
                    );
                    let idx = 0;
                    for (let i = 0; i < Math.min(height*width, colors.length); i++) {
                        const c = colors[i];
                        pixels[idx    ] = c.r;
                        pixels[idx + 1] = c.g;
                        pixels[idx + 2] = c.b;
                        pixels[idx + 3] = c.opacity * 255;
                        idx += 4;
                    }
                }
            }
        }
    }, [img, draw_fn]);

    autoscale_fn = React.useMemo(() => {
        if (!img || autoscale_fn) return autoscale_fn;
        return is_2d_data(img)
            ? () => (img as ReadonlyArray<ReadonlyArray<number>>).flat()
            : () => Array.from(img as ArrayLike<number>);
    }, [img, autoscale_fn])
    
    const canvasRef: React.RefObject<HTMLCanvasElement | null> = React.useRef(null);
    const [, set_draw_error] = React.useState<unknown>(null);
    const loadingKey = React.useId();
    const setLoading = useSetAtom(plot.loading);

    // unregister on unmount, in case it unmounts while still marked loading
    React.useEffect(() => () => {
        setLoading({ type: 'delete', value: loadingKey });
    }, [setLoading, loadingKey]);

    // draw effect
    React.useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        if (imgLoading || !draw_fn) {
            // img hasn't resolved yet; nothing to draw until it does (will re-run once it settles)
            setLoading({ type: 'set', value: [loadingKey, true] });
            return;
        }

        let cancelled = false;
        setLoading({ type: 'set', value: [loadingKey, true] });

        (async () => {
            try {
                let scale = curr_scale;
                let scale_changed = false;

                // check if we're autoscaling
                if (autoscale_fn && (min_source == 'auto' || max_source == 'auto')) {
                    let domain = [scale.domain[0], scale.domain[scale.domain.length - 1]] as [number, number];

                    const [vmin, vmax] = await get_scale(autoscale_fn);
                    if (cancelled) return;
                    if (min_source == 'auto' && vmin !== null && vmin !== undefined && !isClose(vmin, domain[0])) {
                        domain[0] = vmin;
                        scale_changed = true;
                    }
                    if (max_source == 'auto' && vmax !== null && vmax !== undefined && !isClose(vmax, domain[1])) {
                        domain[1] = vmax;
                        scale_changed = true;
                    }

                    if (scale_changed) {
                        scale = scale.with_domain(domain);
                    }
                }

                const ctx = canvas.getContext('2d')!;
                const image_data = ctx.createImageData(canvas.width, canvas.height);
                await draw_fn(ctx, image_data, scale);
                if (cancelled) return;
                ctx.putImageData(image_data, 0, 0);

                if (scale_changed) {
                    // TODO: currently this takes two passes to converge
                    set_curr_scale(scale);
                }
            } catch (err) {
                // surface the rejection during render so error boundaries can catch it,
                // instead of it becoming a silent unhandled promise rejection
                if (!cancelled) set_draw_error(() => { throw err; });
            } finally {
                if (!cancelled) setLoading({ type: 'delete', value: loadingKey });
            }
        })();

        return () => { cancelled = true; };
    }, [imgLoading, props.width, props.height, curr_scale, draw_fn, autoscale_fn, setLoading, loadingKey])

    let extra_styles: React.CSSProperties = {};

    // fix for safari rendering the canvas outside of the SVG context
    // this ensures that the child contents render with the correct transformation, with correct clip paths
    if (typeof navigator !== 'undefined' && /Version\/[\d\.]+.*Safari/.test(navigator.userAgent)) { // is safari
        let parent = layout.useParent();
        const [plot_x, plot_y] = [parent.x, parent.y].map((e) => layout.useExprValue(e, [parent]));
        const [w, h] = [Math.abs(curr_xscale.range[1] - curr_xscale.range[0]), Math.abs(curr_yscale.range[1] - curr_yscale.range[0])];
        let transform = Transform2D.from_1d(useAtomValue(xscale.transform), useAtomValue(yscale.transform));

        extra_styles.transform = `translate(${plot_x}px, ${plot_y}px) matrix(${transform.k[0]}, 0, 0, ${transform.k[1]}, ${transform.p[0]}, ${transform.p[1]})`;
        extra_styles.transformOrigin = "0px 0px";
        extra_styles.zIndex = "0";

        // make clip path, this basically unapplies the transform we applied above
        const pt1 = transform.unapply([0, 0]);
        const pt2 = transform.unapply([w, h]);
        extra_styles.clipPath = `rect(${pt1[1]}px ${pt2[0]}px ${pt2[1]}px ${pt1[0]}px)`;
    }

    return <foreignObject x={xlim[0]} y={ylim[0]} width={xlim[1] - xlim[0]} height={ylim[1] - ylim[0]}>
        <canvas width={props.width} height={props.height} ref={canvasRef} {...styles} style={{
            ...styles.style, display: "block", width: "100%", height: "100%",
            imageRendering: props.imageRendering, ...extra_styles
        }}></canvas>
    </foreignObject>;
}