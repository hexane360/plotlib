import React from 'react';
import * as kiwi from '@lume/kiwi';

import { ProvideSolver, ProvideLayout, SolverContext } from './context';
import { useEditVariables, useConstraints, useVariables } from './hooks';
import { pick } from '../utils';

export default function Constrained(props: {width?: string, height?: string, children?: React.ReactNode}) {
    return <ProvideSolver>
        <ConstrainedInner width={props.width} height={props.height}>{props.children}</ConstrainedInner>
    </ProvideSolver>;
}

function ConstrainedInner(props: {width?: string, height?: string, children?: React.ReactNode}) {
    const [x, y] = useVariables(['x', 'y']);
    const [width] = useEditVariables(['width'], props.width ? kiwi.Strength.strong : kiwi.Strength.weak);
    const [height] = useEditVariables(['height'], props.height ? kiwi.Strength.strong : kiwi.Strength.weak);
    //const [width, height] = useEditVariables(['width', 'height'], kiwi.Strength.strong);
    const solver = React.useContext(SolverContext)!;

    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const containerStyle = pick(props, ['width', 'height']);
    const svgRef = React.useRef<SVGSVGElement | null>(null);

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

    return <div ref={containerRef} style={containerStyle}>
        <svg ref={svgRef} width={0} height={0} style={{position: 'absolute'}}>
            <ProvideLayout x={x} y={y} width={width} height={height}>{props.children}</ProvideLayout>
        </svg>
    </div>;
}