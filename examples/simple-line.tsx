import React from "react";
import * as d3_format from "d3-format";
import { AxisSpec, Figure, LogPlotScale, Plot, PlotLine, PlotScale, styles } from "../src";


export function makeId(prefix: string): string {
    return prefix + `-${d3_format.format("06g")(Math.floor(Math.random() * 1000000))}`;
}


export const SimpleLineFigure = () => {
    const markerId = React.useMemo(() => makeId("marker"), []);
    const markerRef = `url(#${markerId})`;

    const axes: Map<string, AxisSpec> = new Map([
        ["iter", {
            scale: new PlotScale([0, 5], [0.0, 500.0]),
            label: "Iteration",
            show: true,
        }],
        ["error", {
            scale: (new LogPlotScale([1.0e-1, 1.0e+1], [0.0, 300.0])).pad_frac(0.1),
            label: "Error",
            labelOffset: 110,
            show: true,
            tickFormat: ".2e",
        }],
    ]);

    const xs = [0, 1, 2, 3, 4, 5];
    const ys = [0.2, 0.5, 1.5, 5.0];

    return <Figure axes={axes}>
        <Plot xaxis="iter" yaxis="error">
            <marker id={markerId} viewBox="0 0 10 10" refX="5" refY="5" className={styles["plot-marker"]}>
                <circle cx={5} cy={5} r={4}/>
            </marker>
            <PlotLine xs={xs} ys={ys} markerStart={markerRef} markerMid={markerRef} markerEnd={markerRef}/>
        </Plot>
    </Figure>;
};

