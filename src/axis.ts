import { atom, Atom } from 'jotai';
import { PlotScale, Pair } from './scale';
import * as layout from './layout';


export interface AxisSpec {
    domain: Pair;
    size: layout.VariableLength;

    translateExtent?: Pair | boolean;
    //label?: string
    //labelOffset?: number
    show?: boolean | 'one';

    /*
    ticks?: number
    tickFormat?: string
    tickLength?: number
    */
}

export interface Axis {
    scale: Atom<PlotScale>
    size: layout.Variable

    translateExtent: Pair
    label?: string
    labelOffset?: number
    show: boolean | 'one'

    ticks?: number
    tickFormat?: string
    tickLength?: number
}

export function normalize_axis(axis: AxisSpec, size: layout.Variable): Axis {
    axis.show = ("show" in axis) ? axis.show : true;

    if (axis.translateExtent === true || !("translateExtent" in axis)) {
        axis.translateExtent = axis.domain;
    } else if (!axis.translateExtent) {
        axis.translateExtent = [-Infinity, Infinity];
    }

    return {
        ...axis,
        scale: atom((get) => new PlotScale(axis.domain, [0, get(size.atom)])), size,
    } as Axis;
}