import React from 'react';
import { Atom, useStore } from 'jotai';

import { ContinuousScaleEntry } from '../context';
import EventListener from '../interaction/EventListener';
import { getEventCoords } from '../interaction/utils';

/** A data-coordinate point, `[x, y]`. */
export type Point = readonly [number, number];

export interface DragHandlers {
    /** Called once when a drag gesture starts (mousedown/touchstart), with the pointer's data coordinates. */
    onStart?: (point: Point) => void;
    /** Called on every drag move (mousemove/touchmove), with the pointer's data coordinates. */
    onMove: (point: Point) => void;
    /** Called once when the drag gesture ends (mouseup/touchend/touchcancel). */
    onEnd?: () => void;
}

export interface DragTarget<E extends SVGGraphicsElement = SVGGraphicsElement> {
    ref: React.RefObject<E | null>;
    handlers: DragHandlers;
}

/**
 * Wire native mouse+touch drag listeners onto any number of independent
 * `targets` (e.g. a rectangle's 8 resize handles) in a single effect, converting
 * pointer events to data coordinates via `xaxis`/`yaxis`. `useDrag` is a thin
 * wrapper over this for the common single-target case.
 *
 * Uses native listeners (not React synthetic events) attached directly to each
 * element, so `stopPropagation()` reliably runs before `PlotManager`'s ancestor
 * `mousedown`/`touchstart` listeners (which would otherwise start a pan). Each
 * target's element must therefore carry no `transform` of its own —
 * `getEventCoords` inverts its `getScreenCTM()`, which folds in a node's own
 * transform along with its ancestors', so any per-element offset has to live
 * elsewhere (e.g. a `cx`/`cy` or `d` attribute on a child, not a `transform` on
 * this node).
 *
 * `targets.length` is assumed stable for the lifetime of the calling component
 * (it's part of the effect's dependency list); only the `ref`s and `handlers`
 * inside each target may vary. Only the first touch point is tracked per target;
 * multi-touch is not supported.
 */
export function useMultiDrag(
    targets: ReadonlyArray<DragTarget>,
    xaxis: ContinuousScaleEntry,
    yaxis: ContinuousScaleEntry,
    deps: React.DependencyList,
): void {
    const store = useStore();

    // Keep the latest per-target handlers reachable without re-attaching the
    // native listeners (and thus tearing down an in-progress drag) on every render.
    const handlersRef = React.useRef(targets.map((t) => t.handlers));
    React.useLayoutEffect(() => { handlersRef.current = targets.map((t) => t.handlers); });

    React.useEffect(() => {
        const listener = new EventListener();

        targets.forEach(({ ref }, i) => {
            const elem = ref.current;
            if (!elem) return;

            const toPoint = (src: MouseEvent | Touch): Point => {
                const [px, py] = getEventCoords(elem, src);
                return [store.get(xaxis.scale).untransform([px])[0], store.get(yaxis.scale).untransform([py])[0]];
            };

            const end_drag = () => {
                handlersRef.current[i].onEnd?.();
                listener.removeWindowListeners();
            };

            listener.addEventListener(elem, 'mousedown', (down_ev) => {
                down_ev.stopPropagation();
                down_ev.preventDefault();
                handlersRef.current[i].onStart?.(toPoint(down_ev));
                listener.addWindowListener('mousemove', (move_ev) => handlersRef.current[i].onMove(toPoint(move_ev)));
                listener.addWindowListener('mouseup', end_drag);
            });

            listener.addEventListener(elem, 'touchstart', (start_ev) => {
                start_ev.stopPropagation();
                start_ev.preventDefault();
                // First touch only; multi-touch is out of scope.
                handlersRef.current[i].onStart?.(toPoint(start_ev.touches[0]));
                listener.addWindowListener('touchmove', (move_ev) => handlersRef.current[i].onMove(toPoint(move_ev.touches[0])), { passive: false });
                listener.addWindowListener('touchend', end_drag);
                listener.addWindowListener('touchcancel', end_drag);
            }, { passive: false });
        });

        return () => {
            for (const { ref } of targets) {
                if (ref.current) listener.removeElementListeners(ref.current);
            }
            listener.removeWindowListeners();
        };
    }, [store, xaxis, yaxis, targets.length, ...deps]);
}

/** Single-target convenience wrapper over {@link useMultiDrag}. See its doc comment for details. */
export function useDrag<E extends SVGGraphicsElement>(
    ref: React.RefObject<E | null>,
    xaxis: ContinuousScaleEntry,
    yaxis: ContinuousScaleEntry,
    handlers: DragHandlers,
    deps: React.DependencyList,
): void {
    useMultiDrag([{ ref, handlers }], xaxis, yaxis, deps);
}

/**
 * Subscribe to `valueAtom` and imperatively re-draw `ref`'s element on every change
 * (and once on mount), bypassing React re-renders — mirrors how `PlotManager` writes
 * the zoom transform directly via `setAttribute` rather than through props/state.
 */
export function useDrawOnChange<E extends Element, T>(
    ref: React.RefObject<E | null>,
    valueAtom: Atom<T>,
    draw: (elem: E, value: T) => void,
    deps: React.DependencyList,
): void {
    const store = useStore();

    const drawRef = React.useRef(draw);
    React.useLayoutEffect(() => { drawRef.current = draw; });

    React.useLayoutEffect(() => {
        const elem = ref.current;
        if (!elem) return;
        const run = () => drawRef.current(elem, store.get(valueAtom));
        run();
        return store.sub(valueAtom, run);
    }, [store, valueAtom, ...deps]);
}
