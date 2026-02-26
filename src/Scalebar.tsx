import React from 'react';
import { useAtomValue } from 'jotai';

import { FigureContext, PlotContext} from './context';
import { StylesProps, useProps, useStyles } from './theme';

const prefixes: Map<number, string> = new Map([
    [-18, "a"],
    [-15, "f"],
    [-12, "p"],
    [ -9, "n"],
    [ -6, "µ"],
    [ -3, "m"],
    [  0,  ""],
    [  3, "k"],
    [  6, "M"],
    [  9, "G"],
    [ 12, "T"],
    [ 15, "P"],
    [ 18, "E"],
]);

const mantissas: Array<number> = [1, 2, 5];

function divmod(dividend: number, divisor: number): [number, number] {
    const mod = ((dividend % divisor) + divisor) % divisor;
    const quot = (dividend - mod) / divisor;
    return [quot, mod];
}

interface ScalebarProps extends StylesProps {
    /** Unit label shown next to the scalebar value (e.g. `"m"`, `"Hz"`). Defaults to `"m"`. */
    unit?: string;
    /**
     * Conversion factor from plot data units to the display unit.
     * For example, if data is in angstroms and you want to display metres, use `1e-10`.
     * Defaults to `1`.
     */
    unitScale?: number;

    /** Minimum acceptable scalebar width as a fraction of the plot width. Defaults to `0.1`. */
    minFrac?: number;
    /** Maximum acceptable scalebar width as a fraction of the plot width. Defaults to `0.5`. */
    maxFrac?: number;

    /** Border radius of the scalebar rectangle in pixels. Defaults to `4`. */
    radius?: number;
    /** Height of the scalebar rectangle in pixels. Defaults to `15`. */
    height?: number;
    /** Margin from the bottom-right corner of the plot in pixels. Defaults to `10`. */
    margin?: number;
}

export default function Scalebar(props_: ScalebarProps) {
    const fig = React.useContext(FigureContext);
    const plot = React.useContext(PlotContext);
    if (!fig || !plot) {
        throw new Error("Component 'Scalebar' must be used inside a 'Plot'");
    }
    const props = useProps('Scalebar', props_, {
        unit: 'm',
        unitScale: 1.0,
        radius: 4,
        height: 15,
        margin: 10,
        minFrac: 0.1,
        maxFrac: 0.5,
    });
    const styles = useStyles('Scalebar', props);

    const [current, setCurrent] = React.useState<[number, string]>([0, "0 m"]);

    const xaxis = fig.get_continuous_scale(plot.xaxis);
    const yaxis = fig.get_continuous_scale(plot.yaxis);
    const xtransform = useAtomValue(xaxis.transform);

    const fullScale = useAtomValue(xaxis.scale);
    const scale = fullScale.apply_transform(xtransform);
    const frameWidth = Math.abs(scale.lin_domain[1] - scale.lin_domain[0]);
    const yscale = useAtomValue(yaxis.scale);

    let [currentSize, currentText] = current;
    let frac = currentSize / frameWidth;
    const force = false;

    if (force || frac < props.minFrac || frac > props.maxFrac) {
        const orderOfMagnitude = Math.floor(Math.log10(props.maxFrac * frameWidth * props.unitScale));

        const [engOrder, rem] = divmod(orderOfMagnitude, 3);
        const prefix = prefixes.get(3 * engOrder);
        if (prefix === undefined) {
            return <g {...styles}/>;
        }

        const mult = Math.pow(10, rem);

        for (const mantissa of mantissas) {
            const size = Math.pow(10, orderOfMagnitude) * mantissa / props.unitScale;
            frac = size / frameWidth;
            if (props.minFrac <= frac && frac <= props.maxFrac) {
                const val = mantissa * mult;
                const text = `${val} ${prefix}${props.unit}`

                setCurrent([size, text]);
                [currentSize, currentText] = [size, text];
            }
        }
    }

    const width = currentSize * scale.scale_factor();
    const x = scale.range_from_unit(1.0) - width - props.margin;
    const y = yscale.range_from_unit(1.0) - props.margin - props.height;
    const textX = scale.range_from_unit(1.0) - props.margin;

    return <g {...styles}>
        <rect rx={props.radius} height={props.height} x={x} y={y} width={width} />
        <text x={textX} y={y} dx={-5} dy={-props.margin} textAnchor="end">{currentText}</text>
    </g>
}