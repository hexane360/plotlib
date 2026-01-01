import * as kiwi from '@lume/kiwi';
import { PrimitiveAtom, useStore, atom } from "jotai";

type Store = ReturnType<typeof useStore>;

export default class Variable extends kiwi.Variable {
    public atom: PrimitiveAtom<number>;
    public store: Store | undefined;

    constructor(name: string = '', store?: Store) {
        super(name);
        this.atom = atom(super.value());
        this.store = store;
    }

    public setValue(value: number): void {
        if (this.store && super.value() != value) {
            this.store.set(this.atom, value);
        };
        super.setValue(value);
    }

    public observe(cb: (value: number) => void): void {
        if (!this.store) throw new Error("Variable missing store!");
        let store = this.store;
        store.sub(this.atom, () => cb(store.get(this.atom)));
    }
}