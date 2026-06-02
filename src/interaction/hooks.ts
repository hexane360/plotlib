import React from "react";

import { SpatialScaleEntry } from "../context";
import { InteractionContext } from "./context";


export function usePlotInteraction(
    ref: React.RefObject<SVGGraphicsElement | null>,
    xaxis: SpatialScaleEntry,
    yaxis: SpatialScaleEntry,
    fixed_aspect: boolean,
    zoom: boolean,
) {
    const ctx = React.useContext(InteractionContext);
    React.useEffect(() => {
        if (!ctx || !zoom) return;
        if (!ref.current) throw new Error("null ref passed to usePlotInteraction");
        const elem = ref.current;
        ctx.add_plot(elem, xaxis, yaxis, fixed_aspect);
        return () => ctx.remove_plot(elem);
    }, [ref, ctx, xaxis, yaxis, fixed_aspect, zoom]);
}
