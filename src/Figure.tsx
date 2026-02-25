import React, { useMemo } from 'react';
import { atom } from 'jotai';

import { Transform1D } from './transform';
import {
    AxisEntry, ContinuousAxisEntry, ColorAxisEntry,
    isContinuousAxis, isColorAxis,
    FigureContext,
} from './context';
import Constrained from './layout/Constrained';
import * as layout from './layout';
import { useCompoundStyles, CompoundStylesProps } from "./theme";
import { ColorLike, ContinuousScale, NumericScale } from './scale';

// ── Spec types (public, user-facing) ─────────────────────────────────────────

/** Configuration for a continuous (numeric→numeric) spatial axis. */
export interface SpatialAxisSpec {
    scale: ContinuousScale;
    /** Display size in the layout. Supports absolute units (`px`, `pt`, `in`, `cm`, `mm`), `%` of figure width, `rem`, and solver variables `a`–`f`. */
    size: layout.VariableLength;
    /** Pan limits. `true` clamps to `domain`, `false` disables clamping, or provide explicit `[min, max]` bounds. Defaults to `true`. */
    translateExtent?: [number, number] | boolean;
    /** Allowed zoom scale range `[min, max]`. Defaults to `[1, Infinity]` (no zoom-out past original). */
    zoomExtent?: [number, number];
}

/** Configuration for a color (numeric→color) scale. */
export interface ColorAxisSpec {
    scale: NumericScale<ColorLike>;
    size?: never;
}

/** Union of all valid scale specifications passed to `Figure.scales`. */
export type AxisSpec = SpatialAxisSpec | ColorAxisSpec;

// ── Figure component ──────────────────────────────────────────────────────────

interface FigureProps extends CompoundStylesProps<'cont' | 'root'> {
    scales: Map<string, AxisSpec>

    /** CSS width of the figure container element. */
    width?: string
    /** CSS height of the figure container element. */
    height?: string
    /** Uniform outer margin around the figure content. Defaults to `"10px"`. */
    margin?: layout.Length

    /**
     * Pixel size of `1rem`. Required when the container application modifies `rem`.
     */
    rem_scale?: number

    children?: React.ReactNode
}

export default React.memo(function Figure(props: FigureProps) {
    const margin = props.margin ?? "10px";

    const getStyles = useCompoundStyles('Figure', props);

    return <Constrained width={props.width} height={props.height}
        rem_scale={props.rem_scale}
        containerProps={getStyles('cont')}
        svgProps={getStyles('root')}
    >
        <layout.MarginBox left={margin} right={margin} top={margin} bottom={margin}>
            <FigureInner {...props}>
                {props.children}
            </FigureInner>
        </layout.MarginBox>
    </Constrained>;
});

function FigureInner({
    scales: inputScales,
    children,
}: FigureProps) {
    const parent = layout.useParent();

    const all_keys = [...inputScales.keys()];
    const spatial_keys = all_keys.filter(k => 'size' in inputScales.get(k)!);
    const size_vars = layout.useVariables(spatial_keys);

    const parsed_sizes = spatial_keys.map(k =>
        layout.parse_variable_length((inputScales.get(k) as SpatialAxisSpec).size, parent.width)
    );

    const extra_var_names = [...new Set(parsed_sizes.flatMap(s => s instanceof Array ? [s[0]] : []))];
    const extra_vars = layout.useVariables(extra_var_names);
    const var_map = new Map(extra_var_names.map((v, i) => [v, extra_vars[i]]));

    layout.useConstraints(() =>
        parsed_sizes.map((size, i) =>
            new layout.Constraint(size_vars[i], layout.Operator.Eq,
                size instanceof Array ? var_map.get(size[0])!.multiply(size[1]) : size)
        ), [inputScales]
    );

    const scales = useMemo(() => {
        const result = new Map<string, AxisEntry>();
        let si = 0;
        for (const [k, spec] of inputScales) {
            if ('size' in spec) {
                const s = spec as SpatialAxisSpec;
                const sizeVar = size_vars[si++];
                const e = s.translateExtent;
                const translateExtent: [number, number] =
                    e == null || e === true ? s.scale.domain as [number, number]
                    : e === false ? [-Infinity, Infinity]
                    : e;
                result.set(k, {
                    kind: 'continuous',
                    scale: atom((get) => s.scale.with_range([0, get(sizeVar.atom)])),
                    transform: atom(new Transform1D()),
                    size: sizeVar,
                    translateExtent,
                    zoomExtent: s.zoomExtent ?? [1, Infinity],
                } satisfies ContinuousAxisEntry);
            } else {
                const s = spec as ColorAxisSpec;
                result.set(k, { kind: 'color', scale: atom(s.scale) } satisfies ColorAxisEntry);
            }
        }
        return result;
    }, [inputScales, size_vars]);

    const context = useMemo(() => ({
        scales,
        getContinuousAxis(key: string): ContinuousAxisEntry {
            const entry = scales.get(key);
            if (!entry) throw new Error(
                `Axis '${key}' not found. Available: [${[...scales.keys()].join(', ')}]`
            );
            if (!isContinuousAxis(entry)) throw new Error(
                `Axis '${key}' is not a continuous (spatial) axis (got '${entry.kind}')`
            );
            return entry;
        },
        getColorAxis(key: string): ColorAxisEntry {
            const entry = scales.get(key);
            if (!entry) throw new Error(
                `Axis '${key}' not found. Available: [${[...scales.keys()].join(', ')}]`
            );
            if (!isColorAxis(entry)) throw new Error(
                `Axis '${key}' is not a color axis (got '${entry.kind}')`
            );
            return entry;
        },
    }), [scales]);

    return <FigureContext.Provider value={context}>
        {children}
    </FigureContext.Provider>;
}
