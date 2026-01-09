import React from 'react';
import { Constraint, LayoutContextData, Operator, SolverContext, Strength, useConstraints, useEditVariables, useParent, useVariables, Variable } from './layout';

type HorizontalAlignment = 'left' | 'center' | 'right';
type VerticalAlignment = 'top' | 'center' | 'bottom';

export interface TextBoxProps extends React.SVGAttributes<SVGTextElement> {
    ha?: HorizontalAlignment,
    va?: VerticalAlignment,
}

export default function TextBox(props: TextBoxProps) {
    const ref = React.useRef<SVGTextElement | null>(null);
    const solver = React.useContext(SolverContext)!;
    const parent = useParent();
    const ha = props.ha ?? 'center';
    const va = props.va ?? 'center';

    const [x, y] = useVariables(['x', 'y']);
    const [width, height] = useEditVariables(['width', 'height'], Strength.strong);

    useConstraints(() => [
        new Constraint(parent.width, Operator.Ge, width, Strength.medium),
        new Constraint(parent.height, Operator.Ge, height, Strength.medium),
        horz_align(x, width, parent, ha),
        vert_align(y, height, parent, va),
    ], [ha, va]);

    function layout() {
        const rect = ref.current!.getBoundingClientRect();
        console.log(`TextBox layout() width: ${rect.width} height: ${rect.height}`);

        solver.suggestValue(width, rect.width);
        solver.suggestValue(height, rect.height);
        solver.solve();

        console.log(`after solve: width ${width.value()} parent: ${parent.width.value()}`);
        console.log(`height ${height.value()} parent: ${parent.height.value()}  y: ${y.value() - parent.y.value()}`);
    }

    React.useEffect(() => {
        const resizeObserver = new ResizeObserver((_) => { layout(); });
        resizeObserver.observe(ref.current!);
        return () => { resizeObserver.disconnect(); };
    })
    React.useLayoutEffect(layout, []);
    x.observe((x) => ref.current?.setAttribute('x', x.toString()));
    y.observe((y) => ref.current?.setAttribute('y', y.toString()));

    return <text ref={ref} dominant-baseline="text-before-edge" {...props}>{props.children}</text>;
}

function horz_align(x: Variable, width: Variable, parent: LayoutContextData, ha: HorizontalAlignment): Constraint {
    let expr;
    if (ha == 'left') {
        expr = parent.x;
    } else if (ha == 'center') {
        expr = parent.x.plus(
            parent.width.minus(width).divide(2.0)
        )
    } else if (ha == 'right') {
        expr = parent.x.plus(parent.width).minus(width)
    } else {
        throw new Error(`Invalid horizontal alignment ${ha}. Expected 'left', 'center', or 'right'`);
    }
    return new Constraint(expr, Operator.Eq, x, Strength.weak)
}

function vert_align(y: Variable, height: Variable, parent: LayoutContextData, va: VerticalAlignment): Constraint {
    let expr;
    if (va == 'top') {
        expr = parent.y.plus(height);
    } else if (va == 'center') {
        expr = parent.y.plus(
            parent.height.minus(height).divide(2.0)
        );
    } else if (va == 'bottom') {
        expr = parent.y.plus(parent.height)
    } else {
        throw new Error(`Invalid vertical alignment ${va}. Expected 'top', 'center', or 'bottom'`);
    }
    return new Constraint(expr, Operator.Eq, y, Strength.weak)
}