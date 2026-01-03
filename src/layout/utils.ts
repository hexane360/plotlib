import { Expression, Constraint, Operator } from "@lume/kiwi"

import Variable from "./Variable"
import { useVariables, useConstraints } from "./hooks";


export function as_variable(expr: Variable | Expression, name: string): Variable {
    //if (expr instanceof Variable) { return expr; }
    const variable = useVariables([name])[0];
    useConstraints(() => [new Constraint(expr, Operator.Eq, variable)], [expr]);
    return variable
}