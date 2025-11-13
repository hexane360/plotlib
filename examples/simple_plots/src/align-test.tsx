import React from 'react';
import * as kiwi from '@lume/kiwi';
import { atom, PrimitiveAtom, useAtom, useAtomValue, useSetAtom, Provider, useStore, createStore } from 'jotai';

const store = createStore();


export class Variable extends kiwi.Variable {
    public atom: PrimitiveAtom<number>;

    constructor(name: string = '') {
        super(name);
        this.atom = atom(super.value());
    }

    public setValue(value: number): void {
        if (super.value() != value) {
            store.set(this.atom, value);
        };
        super.setValue(value);
    }
}

export interface SolverContextData {
    solverCallbacks: Array<() => ReadonlyArray<kiwi.Constraint>>;
}

export const SolverContext = React.createContext<SolverContextData | null>(null);

export interface LayoutContextData {
    x: Variable;
    y: Variable;
    width: Variable;
    height: Variable;
}

export const LayoutContext = React.createContext<LayoutContextData | null>(null);

export function AlignTest(props: {width?: string, height?: string}) {
    const ctx: LayoutContextData = {
        x: new Variable('x'),
        y: new Variable('y'),
        width: new Variable('width'),
        height: new Variable('height'),
    };

    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const svgRef = React.useRef<SVGSVGElement | null>(null);
    const solver = React.useRef<kiwi.Solver | null>(null);

    const solverCtx: SolverContextData = {solverCallbacks: []};

    function createSolver() {
        console.log("createSolver()");
        solver.current = new kiwi.Solver();
        solver.current!.addEditVariable(ctx.width, kiwi.Strength.weak);
        solver.current!.addEditVariable(ctx.height, kiwi.Strength.weak);
        solver.current!.addConstraint(new kiwi.Constraint(ctx.x, kiwi.Operator.Eq, 0, kiwi.Strength.required));
        solver.current!.addConstraint(new kiwi.Constraint(ctx.y, kiwi.Operator.Eq, 0, kiwi.Strength.required));

        for (const cb of solverCtx.solverCallbacks) {
            for (const constraint of cb()) {
                solver.current!.addConstraint(constraint);
            }
        }
    }

    function layout() {
        if (!solver.current) createSolver();
        console.log("Solving");

        const rect = containerRef.current!.getBoundingClientRect();

        solver.current!.suggestValue(ctx.width, rect.width);
        solver.current!.suggestValue(ctx.height, rect.height);
        solver.current!.updateVariables();

        const [w, h] = [ctx.width.value(), ctx.height.value()];

        svgRef.current!.setAttribute('width', w.toString());
        svgRef.current!.setAttribute('height', h.toString());
        svgRef.current!.setAttribute('viewBox', `0 0 ${w} ${h}`);
    }

    React.useEffect(() => {
        const resizeObserver = new ResizeObserver((_) => { layout(); });
        resizeObserver.observe(containerRef.current!);
        return () => { resizeObserver.disconnect(); };
    })
    React.useLayoutEffect(layout, []);

    const containerStyle = {
        width: props.width ?? '100%',
        height: props.height ?? '100%',
    } as const;

    return <div ref={containerRef} style={containerStyle}><svg ref={svgRef} width={0} height={0} style={{position: 'absolute'}}>
        <Provider store={store}><SolverContext.Provider value={solverCtx}><LayoutContext.Provider value={ctx}>
            <Box></Box>
        </LayoutContext.Provider></SolverContext.Provider></Provider>
    </svg></div>;
}

export function Box(props: {}) {
    const solver = React.useContext(SolverContext);
    if (!solver) throw new Error('Box must be placed in a SolverContext');

    const parent = React.useContext(LayoutContext);
    if (!parent) throw new Error('Box must be placed in a LayoutContext');

    const [x, y, width, height] = React.useState(() => [
        new Variable('box-x'), new Variable('box-y'), new Variable('box-width'), new Variable('box-height')
    ])[0];

    solver.solverCallbacks.push(() => [
        new kiwi.Constraint(width.multiply(3.0), kiwi.Operator.Eq, parent.width),
        new kiwi.Constraint(height.multiply(3.0), kiwi.Operator.Eq, parent.height),
        new kiwi.Constraint(parent.x.plus(parent.width.divide(3.0)), kiwi.Operator.Eq, x),
        new kiwi.Constraint(parent.y.plus(parent.height.divide(3.0)), kiwi.Operator.Eq, y),
    ]);

    const [currX, currY, currW, currH] = [x.atom, y.atom, width.atom, height.atom].map((v) => useAtomValue(v));
    console.log(`Box, w: ${currW}, h: ${currH}`);
    return <rect x={currX} y={currY} width={currW} height={currH} fill="red" />;
}

/* flow of info:

Figure holds layout solver, which can be grabbed by objects from the figure context.
Each variable to the figure context is an atom, which can be set by the figure and read by objects.

How are edit variables set by objects, in order to trigger a re-layout?

*/