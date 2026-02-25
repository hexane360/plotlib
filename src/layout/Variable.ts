import * as kiwi from '@lume/kiwi';
import { PrimitiveAtom, useStore, atom } from "jotai";

type Store = ReturnType<typeof useStore>;

/**
 * A kiwi solver {@link kiwi.Variable} extended with a reactive Jotai atom.
 * Every time the solver updates the variable's value, the atom is updated so that
 * React components subscribed via `useAtomValue` re-render automatically.
 */
export default class Variable extends kiwi.Variable {
    /** Jotai atom holding the current pixel value of this variable. */
    public atom: PrimitiveAtom<number>;
    /** Jotai store used to push value updates into {@link atom}. */
    public store: Store | undefined;

    constructor(name: string = '', store?: Store) {
        super(name);
        this.atom = atom(super.value());
        this.store = store;
    }

    /** Set the variable's value and sync it into the Jotai atom. */
    public setValue(value: number): void {
        if (this.store && super.value() != value) {
            this.store.set(this.atom, value);
        };
        super.setValue(value);
    }

    /** Subscribe to value changes via the Jotai store. */
    public observe(cb: (value: number) => void): void {
        if (!this.store) throw new Error("Variable missing store!");
        let store = this.store;
        store.sub(this.atom, () => cb(store.get(this.atom)));
    }
}