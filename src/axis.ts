import { PlotScale, Pair } from './scale';

export interface AxisSpec {
    scale: PlotScale

    translateExtent?: Pair | boolean
    label?: string
    labelOffset?: number
    show?: boolean | 'one'

    ticks?: number
    tickFormat?: string
    tickLength?: number
}

export interface Axis {
    scale: PlotScale

    translateExtent: Pair
    label?: string
    labelOffset?: number
    show: boolean | 'one'

    ticks?: number
    tickFormat?: string
    tickLength?: number
}

export function normalize_axis(axis: AxisSpec | PlotScale): Axis {
    if (axis instanceof PlotScale) {
        axis = {
            scale: axis
        };
    }

    axis.show = ("show" in axis) ? axis.show : true;

    if (axis.translateExtent === true || !("translateExtent" in axis)) {
        axis.translateExtent = axis.scale.domain;
    } else if (!axis.translateExtent) {
        axis.translateExtent = [-Infinity, Infinity];
    }

    return axis as Axis;
}