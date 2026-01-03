import React from 'react';
import { useAtomValue } from 'jotai';

import { layout } from "plotlib";
import { TextBox } from "plotlib";
import { LayoutContext } from '../../../dist/layout';

export function AlignTest(props: {width?: string, height?: string}) {
    //<Decorated.Left><Box width={30}/></Decorated.Left>
    //<Decorated.Top><Box height={30}/></Decorated.Top>

    return <layout.Constrained>
        <Decorated>
            <Decorated.Left><Box width={20} fill="blue"/></Decorated.Left>
            <Decorated.Bottom><Box height={20} fill="blue"/></Decorated.Bottom>
            <Decorated.Left><Box width={20} fill="red"/></Decorated.Left>
            <Box width={100} height={100}/>
        </Decorated>
    </layout.Constrained>
}

export function Box(props: {width?: number, height?: number, fill?: string}) {
    const parent = layout.useParent();
    if (!parent) throw new Error('Box must be placed in a LayoutContext');

    const width = layout.as_variable(parent.width, 'box-width');
    const height = layout.as_variable(parent.height, 'box-height');
    const x = layout.as_variable(parent.x, 'box-x');
    const y = layout.as_variable(parent.y, 'box-y');

    layout.useConstraints(() => [
        (props.width ? [new layout.Constraint(width, layout.Operator.Eq, props.width)] : []),
        (props.height ? [new layout.Constraint(height, layout.Operator.Eq, props.height)] : []),
    ].flat(), [props.width, props.height]);

    const [currX, currY, currW, currH] = [x.atom, y.atom, width.atom, height.atom].map((v) => useAtomValue(v));
    console.log(`Box, w: ${currW}, h: ${currH}`);
    return <rect x={currX} y={currY} width={currW} height={currH} fill={props.fill ?? "red"} />;
}

interface DecoratedContextData {
    min_x: layout.Variable | layout.Expression,
    max_x: layout.Variable | layout.Expression,
    min_y: layout.Variable | layout.Expression,
    max_y: layout.Variable | layout.Expression,
    pad_x: layout.Expression,
    pad_y: layout.Expression,
}
const DecoratedContext = React.createContext<DecoratedContextData | null>(null);

export function DecoratedInner({children, side}: {children: React.ReactNode, side: 'bottom' | 'top' | 'left' | 'right'}) {
    console.log("DecoratedInner");
    const parent = layout.useParent();
    //const solver = React.useContext(layout.SolverContext)!;
    const [size, pos] = layout.useVariables(['decorator-size', 'decorator-pos']);
    const context = React.useContext(DecoratedContext)!;

    const is_horz = ['left', 'right'].includes(side);

    const innerContext = {
        width: !is_horz ? parent.width : size,
        height: is_horz ? parent.height : size,
        x: parent.x,
        y: parent.y,
    };

    let constraint;

    if (is_horz) {
        if (side == 'right') {
            innerContext.x = context.max_x;
            constraint = new layout.Constraint(context.max_x.plus(size), layout.Operator.Eq, pos);
            context.max_x = pos;
        } else { // left
            constraint = new layout.Constraint(pos.plus(size), layout.Operator.Eq, context.min_x);
            context.min_x = innerContext.x = pos;
            context.pad_x = context.pad_x.plus(size);
        }
    } else {
        if (side == 'bottom') {
            innerContext.y = context.max_y;
            constraint = new layout.Constraint(context.max_y.plus(size), layout.Operator.Eq, pos);
            context.max_y = pos;
        } else { // top
            constraint = new layout.Constraint(pos.plus(size), layout.Operator.Eq, context.min_y);
            context.min_y = innerContext.y = pos;
            context.pad_y = context.pad_y.plus(size);
        }
    }
    layout.useConstraints(() => [constraint], []);

    return <layout.LayoutContext.Provider value={innerContext}>{children}</layout.LayoutContext.Provider>
}

export function Decorated(props: {children: React.ReactNode}) {
    const parent = layout.useParent();
    console.log("Decorated");

    const [width, height, x, y] = layout.useVariables(['inner-width', 'inner-height', 'inner-x', 'inner-y']);

    const context = {
        min_x: x,
        min_y: y,
        max_x: x.plus(width),
        max_y: y.plus(height),
        pad_x: new layout.Expression(0),
        pad_y: new layout.Expression(0),
    };

    layout.useConstraints(() => [
        new layout.Constraint(parent.x.plus(context.pad_x), layout.Operator.Eq, x),
        new layout.Constraint(parent.y.plus(context.pad_y), layout.Operator.Eq, y),
        new layout.Constraint(context.max_x, layout.Operator.Eq, parent.x.plus(parent.width)),
        new layout.Constraint(context.max_y, layout.Operator.Eq, parent.y.plus(parent.height)),
    ], [props.children]);

    return <DecoratedContext.Provider value={context}>
        <LayoutContext.Provider value={{width: width, height: height, x: x, y: y}}>
            {props.children}
        </LayoutContext.Provider>
    </DecoratedContext.Provider>
}

Decorated.Top = ({children}: {children: React.ReactNode}) => DecoratedInner({side: 'top', children});
Decorated.Bottom = ({children}: {children: React.ReactNode}) => DecoratedInner({side: 'bottom', children});
Decorated.Left = ({children}: {children: React.ReactNode}) => DecoratedInner({side: 'left', children});
Decorated.Right = ({children}: {children: React.ReactNode}) => DecoratedInner({side: 'right', children});