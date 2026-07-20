import React from 'react';
import * as kiwi from '@lume/kiwi';

import { ProvideSolver, ProvideLayout, SolverContext } from './context';
import { useEditVariables, useConstraints, useVariables } from './hooks';
import { omit } from '../utils';
import type { SolverLogLevel, SolverLogSink } from './Solver';
import { sizeIsClose } from './utils';

/**
 * Root layout container. Wraps children in a constraint solver and an SVG that resizes to match.
 * Place all layout components inside this component.
 */
export default function Constrained(props: {
    /** CSS width of the container `<div>`. If omitted, the div expands to fit the solver's computed width. */
    width?: string,
    /** CSS height of the container `<div>`. If omitted, the div expands to fit the solver's computed height. */
    height?: string,
    /** Optional external ref for the container `<div>`. */
    containerRef?: React.RefObject<HTMLDivElement | null>,
    /** Optional external ref for the `<svg>` element. */
    svgRef?: React.RefObject<SVGSVGElement | null>,
    /** Extra props forwarded to the container `<div>` (excluding `ref`). */
    containerProps?: React.ComponentPropsWithoutRef<'div'> & Record<`data-${string}`, string | undefined>,
    /** Extra props forwarded to the `<svg>` element (excluding `ref`, `width`, `height`). */
    svgProps?: Omit<React.SVGProps<SVGSVGElement>, 'ref' | 'width' | 'height'>,
    /** Pixel size of `1rem`. Required when the container application modifies `rem`. */
    rem_scale?: number,
    /**
     * Enable structured solver diagnostics (see {@link useSolver} to access the solver itself).
     * `true` sets the log level to `'debug'`; pass a specific `SolverLogLevel` for finer control.
     * Defaults to `'silent'` (no diagnostics).
     */
    debug?: boolean | SolverLogLevel,
    /** Custom sink for structured solver diagnostic events. Defaults to a console sink prefixed `[plotlib:solver]`. */
    onSolverLog?: SolverLogSink,
    children?: React.ReactNode
}) {
    return <ProvideSolver rem_scale={props.rem_scale} debug={props.debug} onSolverLog={props.onSolverLog}>
        <ConstrainedInner {...omit(props, ['rem_scale', 'debug', 'onSolverLog', 'children'])}>{props.children}</ConstrainedInner>
    </ProvideSolver>;
}

function ConstrainedInner(props: {
    width?: string, height?: string,
    containerRef?: React.RefObject<HTMLDivElement | null>,
    svgRef?: React.RefObject<SVGSVGElement | null>,
    containerProps?: React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>,
    svgProps?: React.SVGProps<SVGSVGElement>,
    children?: React.ReactNode
}) {
    const [x, y] = useVariables(['x', 'y']);
    const [width] = useEditVariables(['width'], props.width ? kiwi.Strength.strong : kiwi.Strength.weak);
    const [height] = useEditVariables(['height'], props.height ? kiwi.Strength.strong : kiwi.Strength.weak);
    //const [width, height] = useEditVariables(['width', 'height'], kiwi.Strength.strong);
    const solver = React.useContext(SolverContext)!.solver;

    const containerRef = props.containerRef ?? React.useRef(null);
    const svgRef = props.svgRef ?? React.useRef(null);
    const containerStyle = props.containerProps?.style ?? {};
    containerStyle.width = props.width;
    containerStyle.height = props.height;
    const svgStyle = props.svgProps?.style ?? {};
    svgStyle.position = 'absolute';

    useConstraints(() => [
        new kiwi.Constraint(x, kiwi.Operator.Eq, 0, kiwi.Strength.required),
        new kiwi.Constraint(y, kiwi.Operator.Eq, 0, kiwi.Strength.required),
    ], [])

    function layout() {
        const rect = containerRef.current!.getBoundingClientRect();
        solver.log('debug', 'solve', 'container-resize', { width: rect.width, height: rect.height });
        if (containerStyle.width) solver.suggestValue(width, rect.width);
        if (containerStyle.height) solver.suggestValue(height, rect.height);
        solver.scheduleSolve(containerRef.current!);
    }

    React.useEffect(() => {
        const resizeObserver = new ResizeObserver((_) => layout());
        resizeObserver.observe(containerRef.current!);
        return () => { resizeObserver.disconnect(); };
    })
    React.useLayoutEffect(layout, []);

    // observe width changes, update svg to match
    width.observe((w) => {
        if (!svgRef.current || sizeIsClose(w, Number(svgRef.current.getAttribute('width')))) return;
        svgRef.current.setAttribute('width', w.toString());
        // also update container size if it's not fixed
        // this allows changes to propagate upstream
        if (!containerStyle.width) { containerRef.current!.style.width = `${w}px`; }
    });

    height.observe((h) => {
        if (!svgRef.current || sizeIsClose(h, Number(svgRef.current.getAttribute('height')))) return;
        svgRef.current.setAttribute('height', h.toString());

        if (!containerStyle.height) { containerRef.current!.style.height = `${h}px`; }
    });

    return <div ref={containerRef} style={containerStyle} {...omit(props.containerProps ?? {}, ['style'])}>
        <svg ref={svgRef} width={0} height={0} style={svgStyle} {...omit(props.svgProps ?? {}, ['style'])}>
            <ProvideLayout x={x} y={y} width={width} height={height}>{props.children}</ProvideLayout>
        </svg>
    </div>;
}