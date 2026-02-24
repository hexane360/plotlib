import { atom, Atom } from 'jotai';
import { Scale, NumericScale, ContinuousScale, linear } from './scale';
import * as layout from './layout';


export interface AxisSpec {
    domain: [number, number];
    size: layout.VariableLength;

    translateExtent?: [number, number] | boolean;
    label?: string
    labelOffset?: number
    show?: boolean | 'one';

    ticks?: number
    tickFormat?: string
    tickLength?: number
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
    const translateExtent = axis.translateExtent ?? true;

    return {
        ...axis,
        show: axis.show ?? true,
        translateExtent: translateExtent
            ? (translateExtent === true) ? axis.domain : translateExtent
            : [-Infinity, Infinity],
        scale: atom((get) => linear(axis.domain, [0, get(size.atom)])), size,
    };
}