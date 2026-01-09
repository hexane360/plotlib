import { Expression, Constraint, Operator } from "@lume/kiwi"
import { Atom, atom } from "jotai";

import Variable from "./Variable"

export function expr_atom(expr: Variable | Expression): Atom<number> {
    if (expr instanceof Variable) { return expr.atom; }

    return atom((get) => {
        let val = expr.constant();
        const terms = expr.terms();
        for (let i = 0, n = terms.size(); i < n; i++) {
            let pair = terms.itemAt(i)
            val += get((pair.first as Variable).atom) * pair.second
        }
        return val;
    })
}