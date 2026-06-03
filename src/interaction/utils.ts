
import type { Styles } from '../theme';

export type Pair = readonly [number, number];

export function applyStyles(elem: SVGElement, { className, style }: Styles): void {
    elem.setAttribute('class', className);
    const entries = Object.entries(style);
    if (entries.length > 0) {
        elem.setAttribute('style', entries.map(([k, v]) =>
            `${k.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)}: ${v}`
        ).join('; '));
    } else {
        elem.removeAttribute('style');
    }
}

export function isClose(
    left: number | ReadonlyArray<number>, right: number | ReadonlyArray<number>,
    rtol: number = 1e-6, atol: number = 1e-6
): boolean {
    if (typeof left == "number") {
        return typeof right == "number" && (
            Math.abs(left - right) < Math.max(rtol * Math.max(Math.abs(left), Math.abs(right)), atol)
        );
    }
    if (typeof right == "number" || left.length != right.length) return false;
    for (let i = 0; i < left.length; i++) {
        if (!isClose(left[i], right[i], rtol, atol)) return false;
    }
    return true;
}

export function getEventCoords(node: SVGGraphicsElement, event: MouseEvent | WheelEvent | Touch): Pair {
    let svg = node.ownerSVGElement || node as SVGSVGElement;
    let pt = svg.createSVGPoint();
    pt.x = event.clientX; pt.y = event.clientY;
    // TODO: investigate & fix on safari
    pt = pt.matrixTransform(node.getScreenCTM()!.inverse());
    return [pt.x, pt.y];
}