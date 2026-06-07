import React from "react";
import { useAtomValue } from "jotai/react";

import { FigureContext, PlotContext } from "./context";
import { useStyles, StylesProps } from "./theme";
import { DataRef, useData1D } from "./data";

type MarkerProps<P> = { [K in keyof P]: any };

type KnownMarker = 'circle' | 'square';

const KNOWN_MARKER_LINECAPS: Record<KnownMarker, React.CSSProperties['strokeLinecap']> = {
    circle: 'round', square: 'square',
};

interface KnownMarkerProps {
    /** Per-point stroke color (`stroke`). Applied as an inline style so it isn't overridden by CSS classes. */
    color?: DataRef
    /** Per-point marker size (`stroke-width`). Applied as an inline style so it isn't overridden by CSS classes. */
    size?: DataRef
}

interface PlotScatterBaseProps extends StylesProps {
    /** X-coordinates in data space. */
    xs: DataRef
    /** Y-coordinates in data space. Must have the same length as `xs`. */
    ys: DataRef
}

interface PlotScatterPresetProps extends PlotScatterBaseProps {
    /** Built-in marker shape, drawn as a constant-screen-size dot; styled via `marker_props.color` / `marker_props.size`. */
    marker: KnownMarker
    marker_props?: KnownMarkerProps
}

interface PlotScatterCustomProps<P extends Record<string, DataRef>> extends PlotScatterBaseProps {
    /** Renders a single mark at the given (already scaled) pixel coordinates. */
    marker: (x: number, y: number, props: MarkerProps<P>, i: number) => React.ReactElement

    /**
     * Per-point properties, keyed by an arbitrary channel name (e.g. `fill`, `r`, `opacity`).
     * Each value is a {@link DataRef} resolved to an array the same length as `xs`/`ys`;
     * the resolved per-point values are passed to `marker` so individual marks can vary
     * in size, color, opacity, shape, etc.
     */
    marker_props?: P
}

function known_marker(name: KnownMarker) {
    const strokeLinecap = KNOWN_MARKER_LINECAPS[name];
    return (x: number, y: number, props: MarkerProps<KnownMarkerProps>) => {
        const style: React.CSSProperties = { strokeLinecap };
        if (props.color !== undefined) style.stroke = props.color;
        if (props.size !== undefined) style.strokeWidth = props.size;
        return <path d={`M ${x} ${y} h 0`} style={style} />;
    };
}

function PlotScatter(props: PlotScatterPresetProps): React.ReactElement;
function PlotScatter<P extends Record<string, DataRef>>(props: PlotScatterCustomProps<P>): React.ReactElement;
function PlotScatter(props: PlotScatterPresetProps | PlotScatterCustomProps<Record<string, DataRef>>): React.ReactElement {
    const fig = React.useContext(FigureContext);
    const plot = React.useContext(PlotContext);
    if (!fig || !plot) {
        throw new Error("Component 'PlotScatter' must be used inside a 'Plot'");
    }
    const styles = useStyles('PlotScatter', props);

    let xs = useData1D(props.xs);
    let ys = useData1D(props.ys);

    const xaxis = fig.get_continuous_scale(plot.xaxis);
    const yaxis = fig.get_continuous_scale(plot.yaxis);

    if (xs.length != ys.length) {
        throw new Error("In component 'PlotScatter': `xs` and `ys` must be the same length");
    }

    let x_scale = useAtomValue(xaxis.scale);
    let y_scale = useAtomValue(yaxis.scale);
    xs = x_scale.transform(xs, false);
    ys = y_scale.transform(ys, false);

    const marker_props = (props.marker_props ?? {}) as Record<string, DataRef>;
    const keys = Object.keys(marker_props);
    // `marker_props` is a literal in JSX, so its keys have a stable shape across renders,
    // keeping this `useData1D` call order consistent (rules of hooks).
    const resolved = keys.map((key) => useData1D(marker_props[key]));

    keys.forEach((key, j) => {
        if (resolved[j].length != xs.length)
            throw new Error(`In component 'PlotScatter': marker_props['${key}'] must be the same length as 'xs' and 'ys'`);
    });

    const marker = typeof props.marker == 'function' ? props.marker : known_marker(props.marker);

    const marks: React.ReactElement[] = [];
    for (let i = 0; i < xs.length; i++) {
        const x = xs[i];
        const y = ys[i];
        if (!isFinite(x) || !isFinite(y)) continue;

        const point_props: Record<string, any> = {};
        keys.forEach((key, j) => { point_props[key] = resolved[j][i]; });

        marks.push(React.cloneElement(marker(x, y, point_props, i), { key: i }));
    }

    return <g {...styles}>{marks}</g>;
}

export default PlotScatter;
