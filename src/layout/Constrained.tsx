import React from 'react';
import * as kiwi from '@lume/kiwi';

import { ProvideSolver, ProvideLayout, SolverContext } from './context';
import { useEditVariables, useConstraints, useVariables } from './hooks';
import { pick, omit } from '../utils';

export default function Constrained(props: {
    width?: string, height?: string,
    containerRef?: React.RefObject<HTMLDivElement | null>,
    svgRef?: React.RefObject<SVGSVGElement | null>,
    containerProps?: Omit<React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>, 'ref'>,
    svgProps?: Omit<React.SVGProps<SVGSVGElement>, 'ref' | 'width' | 'height'>,
    rem_scale?: number, children?: React.ReactNode
}) {
    return <ProvideSolver rem_scale={props.rem_scale}>
        <ConstrainedInner {...omit(props, ['rem_scale', 'children'])}>{props.children}</ConstrainedInner>
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
        //console.log(`Solving Constrained, width: ${rect.width} height: ${rect.height}`);
        if (containerStyle.width) solver.suggestValue(width, rect.width);
        if (containerStyle.height) solver.suggestValue(height, rect.height);
        solver.scheduleSolve();
    }

    React.useEffect(() => {
        const resizeObserver = new ResizeObserver((_) => layout());
        resizeObserver.observe(containerRef.current!);
        return () => { resizeObserver.disconnect(); };
    })
    React.useLayoutEffect(layout, []);

    // observe width changes, update svg to match
    width.observe((w) => {
        svgRef.current?.setAttribute('width', w.toString());
        // also update container size if it's not fixed
        // this allows changes to propagate upstream
        if (!containerStyle.width) { containerRef.current!.style.width = `${w}px`; }
    });

    height.observe((h) => {
        svgRef.current?.setAttribute('height', h.toString());
        if (!containerStyle.height) { containerRef.current!.style.height = `${h}px`; }
    });

    return <div ref={containerRef} style={containerStyle} {...omit(props.containerProps ?? {}, ['style'])}>
        <svg ref={svgRef} width={0} height={0} style={svgStyle} {...omit(props.svgProps ?? {}, ['style'])}>
            <ProvideLayout x={x} y={y} width={width} height={height}>{props.children}</ProvideLayout>
        </svg>
    </div>;
}