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

export function expr_equal(left: Variable | Expression, right: Variable | Expression): boolean {
    if (left instanceof Variable) {
        return right instanceof Variable && left.id() == right.id();
    }
    if (!(right instanceof Expression)) return false;
    if (left.constant() != right.constant()) return false;

    const left_terms = left.terms().array;
    const right_terms = right.terms().array;
    if (left_terms.length != right_terms.length) return false;

    for (let i = 0; i < left_terms.length; i++) {
        if (
            left_terms[i].first.id() != right_terms[i].first.id() ||
            left_terms[i].second != right_terms[i].second
        ) return false;
    }
    return true;
}