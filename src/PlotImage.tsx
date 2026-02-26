import React from "react";
import { useAtom, useAtomValue, useStore } from "jotai/react";

import { FigureContext, PlotContext } from "./context";
import { ColorLike, NumericScale } from "./scale";
import { isClose, nan_minmax } from "./utils";

type MinMaxObj = {vmin: number | null, vmax: number | null};
type DrawFunction = (ctx: CanvasRenderingContext2D, data: ImageData, scale: NumericScale<ColorLike>) => void;
type AutoscaleFunction = () => MinMaxObj | Iterable<number>;

const is_minmax_obj = (val: MinMaxObj | Iterable<number>): val is MinMaxObj => (
    typeof val === 'object' && Object.hasOwn(val, 'vmin') && Object.hasOwn(val, 'vmax')
);

function get_scale(fn: AutoscaleFunction): [number | null, number | null] {
    const val = fn();
    if (is_minmax_obj(val)) return [val.vmin, val.vmax];
    return nan_minmax(val);
}

interface PlotImageProps {
    img: DrawFunction
    data_scale?: AutoscaleFunction

    width: number
    height: number
    scale: string

    xlim?: [number, number] // [min, max]
    ylim?: [number, number] // [min, max]
}

export default function (props: PlotImageProps) {
    const fig = React.useContext(FigureContext);
    const plot = React.useContext(PlotContext);
    if (!fig || !plot) {
        throw new Error("Component 'PlotImage' must be used inside a 'Plot'");
    }
    const [xscale, yscale] = [plot.xaxis, plot.yaxis].map(fig.get_continuous_scale);
    const [curr_xscale, curr_yscale] = [xscale, yscale].map((s) => useAtomValue(s.scale));
    const vscale = fig.get_color_scale(props.scale);
    let [curr_scale, set_curr_scale] = useAtom(vscale.scale);
    const [min_source, max_source] = [vscale.min_source, vscale.max_source].map((v) => useAtomValue(v));

    const xlim = curr_xscale.transform(props.xlim ?? curr_xscale.domain) as [number, number];
    const ylim = curr_yscale.transform(props.ylim ?? curr_yscale.domain) as [number, number];

    const canvasRef: React.RefObject<HTMLCanvasElement | null> = React.useRef(null);

    // draw effect
    React.useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        let scale_changed = false;

        // check if we're autoscaling
        if (props.data_scale && (min_source == 'auto' || max_source == 'auto')) {
            let domain = [curr_scale.domain[0], curr_scale.domain[curr_scale.domain.length - 1]] as [number, number];

            const [vmin, vmax] = get_scale(props.data_scale);
            if (min_source == 'auto' && vmin !== null && vmin !== undefined && !isClose(vmin, domain[0])) {
                domain[0] = vmin;
                scale_changed = true;
            }
            if (max_source == 'auto' && vmax !== null && vmax !== undefined && !isClose(vmax, domain[1])) {
                domain[1] = vmax;
                scale_changed = true;
            }

            if (scale_changed) {
                curr_scale = curr_scale.with_domain(domain);
            }
        }

        const ctx = canvas.getContext('2d')!;
        const image_data = ctx.createImageData(props.width, props.height);
        props.img(ctx, image_data, curr_scale);

        if (scale_changed) {
            // TODO: currently this takes two passes to converge
            set_curr_scale(curr_scale);
        }
    }, [props.width, props.height, curr_scale, props.img, props.data_scale])

    /*
    // fix for safari rendering the canvas outside of the SVG context
    // this ensures that the child contents render with the correct transformation, with correct clip paths
    if (typeof navigator !== 'undefined' && /Version\/[\d\.]+.*Safari/.test(navigator.userAgent)) { // is safari
        let xtrans = useAtomValue(xscale.transform);
        let ytrans = useAtomValue(yscale.transform);

        React.useEffect(() => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const parent = canvas.parentNode as SVGForeignObjectElement;
            const t = parent.getCTM()!;
            const viewbox = parent.ownerSVGElement!.viewBox.animVal;

            // we have to apply the SVG transformation stack manually
            canvas.style.transform = `matrix(${t.a}, ${t.b}, ${t.c}, ${t.d}, ${t.e}, ${t.f}`;
            canvas.style.transformOrigin = "0px 0px";

            // as well as the axis clip box
            // this basically untransforms the clip box by the transform we just applied
            const [left, right] = [(curr_xscale.range[0] - t.e - viewbox.x) / t.a, (curr_xscale.range[1] - t.e - viewbox.x) / t.a];
            const [top, bottom] = [(curr_yscale.range[0] - t.f - viewbox.y) / t.d, (curr_yscale.range[1] - t.f - viewbox.y) / t.d];
            canvas.style.clipPath = `rect(${top}px ${right}px ${bottom}px ${left}px)`;

            // and we make sure the canvas draws underneath the SVG object
            canvas.style.position = "relative";
            canvas.style.zIndex = "-1";
        }, [xtrans, ytrans, curr_xscale, curr_yscale]);
    }
    */

    return <foreignObject x={xlim[0]} y={ylim[0]} width={xlim[1] - xlim[0]} height={ylim[1] - ylim[0]}>
        <canvas width={props.width} height={props.height} ref={canvasRef} style={{display: "block", width: "100%", height: "100%", imageRendering: "pixelated"}}></canvas>
    </foreignObject>;
}