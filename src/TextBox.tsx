import React from 'react';
import { Constraint, LayoutContextData, Operator, SolverContext, Strength, useConstraints, useEditVariables, useParent, useVariables } from './layout';
import * as layout from './layout';
import { omit } from './utils';
import { useProps } from './theme';
import { atom } from 'jotai';
import { useAtomValue } from 'jotai/react';

type HorizontalAlignment = 'left' | 'center' | 'right';
type VerticalAlignment = 'top' | 'center' | 'bottom';

export interface TextBoxProps extends React.SVGAttributes<SVGTextElement> {
    /** Horizontal alignment within the parent layout cell. Defaults to `'center'`. */
    ha?: HorizontalAlignment,
    /** Vertical alignment within the parent layout cell. Defaults to `'center'`. */
    va?: VerticalAlignment,

    /** Rotation angle in degrees, applied about the text's own centre. */
    rotation?: number,
}

export default function TextBox(props_: TextBoxProps) {
    let {rotation, ha, va, children, ...textProps} = useProps('TextBox', props_, {
        ha: 'center', va: 'center'
    } as const);
    const ref = React.useRef<SVGTextElement | null>(null);
    const parent = useParent();

    const [x, y] = useVariables(['x', 'y']);
    const [width, height] = layout.useObserveSize(ref);

    textProps.transform = useAtomValue(React.useMemo(() => atom((get) => {
        const [curr_x, curr_y] = [get(x.atom), get(y.atom)];
        const [curr_w, curr_h] = [get(width.atom), get(height.atom)];
        if (!ref.current) {
            if (rotation !== null && rotation !== undefined)
                return `rotate(${rotation})`;
            return "";
        }
        const bbox = ref.current.getBBox();
        const shift_x = curr_x - bbox.x + (curr_w - bbox.width)/2;
        const shift_y = curr_y - bbox.y + (curr_h - bbox.height)/2;
        let transform = `translate(${shift_x} ${shift_y})`
        if (rotation !== null && rotation !== undefined) {
            transform += ` rotate(${rotation} ${bbox.x + bbox.width/2} ${bbox.y + bbox.height/2})`;
        }
        return transform;
    }), [width, height, rotation]));

    useConstraints(() => {
        return [
            new Constraint(parent.width, Operator.Ge, width, Strength.strong),
            new Constraint(parent.height, Operator.Ge, height, Strength.strong),
            new Constraint(parent.width, Operator.Le, width, Strength.medium),
            new Constraint(parent.height, Operator.Le, height, Strength.medium),
            horz_align(x, width, parent, ha),
            vert_align(y, height, parent, va),
        ];
    }, [parent, width, height, ha, va]);

    return <text ref={ref} dominantBaseline="text-before-edge" {...textProps}>{children}</text>;
}

function horz_align(
    x: layout.Variable | layout.Expression,
    width: layout.Variable | layout.Expression,
    parent: LayoutContextData, ha: HorizontalAlignment
): Constraint {
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
    return new Constraint(expr, Operator.Eq, x, Strength.medium)
}

function vert_align(
    y: layout.Variable | layout.Expression,
    height: layout.Variable | layout.Expression,
    parent: LayoutContextData, va: VerticalAlignment
): Constraint {
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
    return new Constraint(expr, Operator.Eq, y, Strength.medium)
}