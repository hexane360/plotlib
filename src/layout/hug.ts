import * as kiwi from '@lume/kiwi';

/**
 * Strength at which the outermost component ({@link Constrained}) hugs.
 */
export const HUG_BASE = 0.05 * kiwi.Strength.weak;

/**
 * Ceiling for the hug ladder, one tenth of `medium`. Two `medium` constraints must never lose to a hug.
 */
export const HUG_MAX = 0.1 * kiwi.Strength.medium;

/**
 * Hug strength for the children of a component which hugs at `hug` with `n_hugs` constraints.
 *
 * Inner components hug more strongly than outer ones, so that a container releases the slack
 * it was allotted back to whichever ancestor is holding it — which then donates it onward as
 * free space (see `x_space` on {@link LayoutContextData}). The `n_hugs + 1` factor guarantees
 * that invariant.
 * 
 * @param hug - The parent's own hug strength.
 * @param n_hugs - How many hug constraints the parent contributes, maximum across both axes.
 */
export function child_hug(hug: number, n_hugs: number): number {
    return Math.min(hug * (n_hugs + 1), HUG_MAX);
}
