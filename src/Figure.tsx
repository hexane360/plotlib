import React, { useMemo } from 'react';
import { atom } from 'jotai';

import { Transform1D } from './transform';
import {
    ContinuousScaleEntry, SpatialScaleEntry, ColorScaleEntry,
    ScaleEntry, FigureContext,
    ScaleSource, DataMap,
} from './context';
import * as layout from './layout';
import { useCompoundStyles, CompoundStylesProps, useProps } from "./theme";
import { ColorLike, ContinuousScale, NumericScale, Scale, SpatialScale } from './scale';
import { InteractionManager } from './interaction/InteractionManager';

export interface BaseScaleSpec {
    scale: Scale<any, any>;
}

/** Configuration for a spatial axis scale. */
export interface SpatialScaleSpec extends BaseScaleSpec {
    scale: SpatialScale<any>;
    /** Display size in the layout. Supports absolute units (`px`, `pt`, `in`, `cm`, `mm`), `%` of figure width, `rem`, and solver variables `a`–`f`. */
    size: layout.VariableLength;
}

export interface ContinuousScaleSpec extends SpatialScaleSpec {
    scale: ContinuousScale;
    /** Pan limits. `true` clamps to `domain`, `false` disables clamping, or provide explicit `[min, max]` bounds. Defaults to `true`. */
    translateExtent?: [number, number] | boolean;
    /** Allowed zoom scale range `[min, max]`. Defaults to `[1, Infinity]` (no zoom-out past original). */
    zoomExtent?: [number, number];
}

/** Configuration for a color (numeric→color) scale. */
export interface ColorScaleSpec {
    scale: NumericScale<ColorLike>;
    size?: never;
    /** Whether to autoscale min bound. Defaults to true (but may be modified by interaction) */
    autoscale_min?: boolean;
    /** Whether to autoscale max bound. Defaults to true (but may be modified by interaction) */
    autoscale_max?: boolean;
}

export type ScaleSpec = SpatialScaleSpec | ContinuousScaleSpec | ColorScaleSpec;

const spec_is_spatial = (spec: ScaleSpec): spec is SpatialScaleSpec | ContinuousScaleSpec => spec.scale.is_spatial();
const spec_is_continuous = (spec: ScaleSpec): spec is ContinuousScaleSpec => spec.scale.is_continuous();

interface FigureProps extends CompoundStylesProps<'cont' | 'root'> {
    scales: Map<string, ScaleSpec>
    /** Named data atoms, referenced by mark components via string keys or DSL expressions. */
    data?: DataMap

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

    /** Show a floating interaction toolbar (pan, box zoom, zoom in/out, reset). */
    toolbar?: boolean

    /**
     * Force a color scheme. 'light' and 'dark' are supported by default, more
     * can be added through CSS. Defaults to 'light'.
     */
    colorScheme?: string

    children?: React.ReactNode
}

const true_fn = () => true;
const false_fn = () => false;

// Height of the interaction bar (buttons + padding + border) plus its top offset.
const TOOLBAR_EXTRA_PX = 40;

export default React.memo(function Figure(props_: FigureProps) {
    const props = useProps('Figure', props_, { margin: "10px" as layout.Length });

    const getStyles = useCompoundStyles('Figure', props);
    const containerRef = React.useRef<HTMLDivElement | null>(null);

    const inner = (
        <FigureInner {...props} containerRef={containerRef}>
            {props.children}
        </FigureInner>
    );

    return <layout.Constrained width={props.width} height={props.height}
        rem_scale={props.rem_scale}
        containerRef={containerRef}
        containerProps={{...getStyles('cont'), 'data-color-scheme': props.colorScheme}}
        svgProps={getStyles('root')}
    >
        <layout.MarginBox left={props.margin} right={props.margin} top={props.margin} bottom={props.margin}>
            {(props.toolbar ?? true)
                ? <layout.MarginBox top={`${TOOLBAR_EXTRA_PX}px` as layout.Length} bottom={0} left={0} right={0}>{inner}</layout.MarginBox>
                : inner
            }
        </layout.MarginBox>
    </layout.Constrained>;
});

function FigureInner({
    scales: inputScales,
    data,
    toolbar,
    children,
    containerRef,
}: FigureProps & { containerRef: React.RefObject<HTMLDivElement | null> }) {
    const parent = layout.useParent();

    const all_keys = [...inputScales.keys()];
    const spatial_keys = all_keys.filter(k => 'size' in inputScales.get(k)!);
    const size_vars = layout.useVariables(spatial_keys);

    const parsed_sizes = spatial_keys.map(k =>
        layout.parse_variable_length((inputScales.get(k) as SpatialScaleSpec).size, parent.width)
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
        const result = new Map<string, ScaleEntry>();
        let si = 0;
        for (const [k, spec] of inputScales) {
            if (spec_is_spatial(spec)) {
                const size_var = size_vars[si++];
                const scale = atom((get) => spec.scale.with_range([0, get(size_var.atom)]));

                const extra = spec_is_continuous(spec)
                    ? {
                        transform: atom(new Transform1D()),
                        translateExtent: (spec.translateExtent ?? true) === true
                            ? spec.scale.domain : spec.translateExtent ? spec.translateExtent : [-Infinity, Infinity],
                        zoomExtent: spec.zoomExtent ?? [1, Infinity],
                        is_continuous: true_fn as any
                    } : {is_continuous: false_fn as any};

                result.set(k, {
                    scale, size: size_var, ...extra,
                    is_spatial: (): this is SpatialScaleEntry => true,
                    is_color: (): this is ColorScaleEntry => false,
                } satisfies SpatialScaleEntry | ContinuousScaleEntry)
            } else {
                const scale = atom(spec.scale);
                result.set(k, {
                    scale,
                    min_source: atom<ScaleSource>((spec.autoscale_min ?? true) ? 'auto' : 'manual'),
                    max_source: atom<ScaleSource>((spec.autoscale_max ?? true) ? 'auto' : 'manual'),
                    is_continuous: (): this is ContinuousScaleEntry => false,
                    is_spatial: (): this is SpatialScaleEntry => false,
                    is_color: (): this is ColorScaleEntry => true,
                } satisfies ColorScaleEntry)
            }
        }
        return result;
    }, [inputScales, size_vars]);

    const context = useMemo(() => {
        const get_scale = (key: string): ScaleEntry => scales.get(key) ?? (function() {
            throw new Error(
                `Scale '${key}' not found. Available: [${[...scales.keys()].join(', ')}]`
            )
        })();

        return {
            scales, data: data ?? {}, get_scale,
            get_spatial_scale: (key: string) => {
                const entry = get_scale(key);
                if (!entry.is_spatial()) throw new Error(`Expected scale '${key}' to be spatial`);
                return entry;
            },
            get_continuous_scale: (key: string) => {
                const entry = get_scale(key);
                if (!entry.is_continuous()) throw new Error(`Expected scale '${key}' to be continuous`);
                return entry;
            },
            get_color_scale: (key: string) => {
                const entry = get_scale(key);
                if (!entry.is_color()) throw new Error(`Expected scale '${key}' to be a colorscale`);
                return entry;
            },
        }
    }, [scales, data]);

    return <FigureContext.Provider value={context}>
        <InteractionManager toolbar={toolbar} containerRef={containerRef}>{children}</InteractionManager>
    </FigureContext.Provider>;
}
