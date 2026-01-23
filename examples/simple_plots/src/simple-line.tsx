import React from "react";
import * as d3_format from "d3-format";
import { AxisSpec, Figure, layout, Plot, PlotLine, styles } from "plotlib";
import 'plotlib/styles.css';

function makeId(prefix: string): string {
    return prefix + `-${d3_format.format("06g")(Math.floor(Math.random() * 1000000))}`;
}


export const SimpleLineFigure = () => {
    const markerId = React.useMemo(() => makeId("marker"), []);
    const markerRef = `url(#${markerId})`;

    const axes: Map<string, AxisSpec> = React.useMemo(() => new Map([
        ["iter", {
            domain: [0, 10],
            size: "300.0px",
            label: "Iteration",
            show: 'one',
            translateExtent: true,
        }],
        ["error", {
            domain: [5.0, 0.0],
            size: "150px",
            //scale: (new LogPlotScale([1.0e-1, 1.0e+1], [0.0, 300.0])).pad_frac(0.1),
            label: "Error Error Error Error",
            labelOffset: 110,
            show: 'one',
            translateExtent: true,
            //tickFormat: ".2e",
        }],
    ]), []);

    let [[xs, ys], update_plot_data] = React.useReducer<[number[], number[]], []>(([xs, ys]) => {
        let new_x = xs.at(-1)! + 0.2;
        return [[...xs, new_x], [...ys, Math.sqrt(new_x)]];
    }, [[0], [0]]);

    /*
    React.useEffect(() => {
        const timer = setInterval(() => update_plot_data(), 200);
        return () => { clearInterval(timer); }
    }, []);
    */

    return <div style={{display: "flex", flexDirection: "column", alignItems: "center", width: "100%"}}>
    <button style={{display: "block", margin: "auto"}} onClick={update_plot_data}>Update</button>
    <Figure axes={axes} width="70%">
        <layout.FlexBox flexDirection="row" justifyContent="space-around" columnGap="16pt" rowGap="24pt" wrap={true}>
            <Plot xaxis="iter" yaxis="error">
                <marker id={markerId} viewBox="0 0 22 22" refX="11" refY="11" className={styles["plot-marker"]}>
                    <circle cx={11} cy={11} r={10}/>
                </marker>
                <PlotLine xs={xs} ys={ys} markerStart={markerRef} markerMid={markerRef} markerEnd={markerRef}/>
            </Plot>
            <Plot xaxis="iter" yaxis="error">
                <marker id={markerId} viewBox="0 0 22 22" refX="11" refY="11" className={styles["plot-marker"]}>
                    <circle cx={11} cy={11} r={10}/>
                </marker>
                <PlotLine xs={xs} ys={ys} markerStart={markerRef} markerMid={markerRef} markerEnd={markerRef}/>
            </Plot>
            <Plot xaxis="iter" yaxis="error">
                <marker id={markerId} viewBox="0 0 22 22" refX="11" refY="11" className={styles["plot-marker"]}>
                    <circle cx={11} cy={11} r={10}/>
                </marker>
                <PlotLine xs={xs} ys={ys} markerStart={markerRef} markerMid={markerRef} markerEnd={markerRef}/>
            </Plot>
            <Plot xaxis="iter" yaxis="error">
                <marker id={markerId} viewBox="0 0 22 22" refX="11" refY="11" className={styles["plot-marker"]}>
                    <circle cx={11} cy={11} r={10}/>
                </marker>
                <PlotLine xs={xs} ys={ys} markerStart={markerRef} markerMid={markerRef} markerEnd={markerRef}/>
            </Plot>
        </layout.FlexBox>
    </Figure>
    </div>;
};
