import { atom, Atom } from 'jotai';
import { Scale, NumericScale, ContinuousScale, linear } from './scale';
import * as layout from './layout';


export interface AxisSpec {
    domain: [number, number];
    size: layout.VariableLength;

    translateExtent?: [number, number] | boolean;
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
    scale: Atom<ContinuousScale>
    size: layout.Variable

    translateExtent: [number, number]
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
        scale: atom((get) => linear(axis.domain, [0, get(size.atom)])), size,
    } as Axis;
}