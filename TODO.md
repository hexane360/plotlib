TODO
====

# High Priority (publishability)

## Plot Components

- **Scatter** — per-point SVG marks (`<circle>`, `<use>` with symbol); API similar to `PlotLine` but renders one element per point rather than a single `<path>`

---

# Lower Priority

## Plot Components

- **Colormesh** — grid of rectangles colored by a colorscale (analogous to matplotlib `pcolormesh`)
- **Bar** — vertical/horizontal bars; requires thought on categorical/binned axis support
- **Legend** — series legend; should be designed together with toggle trace visibility

## Interactivity

- **Interaction bar visibility on mobile** — no hover state on touch devices means the toolbar is never revealed; needs an alternative show/hide mechanism
- **Axis-targeted zoom** — scrolling or pinching directly on an axis decoration should zoom only that axis; currently interaction is only wired to the plot area
- **Toggle trace visibility** — show/hide individual series; needs shared visibility state (Jotai atom), designed in conjunction with Legend
- **Export utility** — save figure as SVG or PNG

## Testing

### Unit tests (`npm run test-unit`)

Pure logic, no DOM or React required.

- **`scale.ts`** — gaps in existing coverage: `with_domain`, `apply_transform` (key zoom operation), `scale_factor`, `ticks`, `untransform`, `domain_from_unit`, `range_from_unit`, `range_to_unit`, all type guards (`is_continuous`, `is_spatial`, `is_numeric`, `is_discrete`), `log` with continuous range, `log.with_domain`
- **`utils.ts`** — zero coverage; test `map` (scalar and array branches), `clamp`, `isClose`, `mapValues`, `pick`, `omit`
- **`layout/length.tsx`** — zero coverage; test `parse_absolute_length` (all units + bare number + error), `parse_length` (`%`, `rem`, absolute, with Variable/Expression container), `parse_variable_length` (solver variables `a`–`f`, `%`, absolute)
- **`layout/expr.ts`** — zero coverage; test `as_expr` (Variable, Expression, number branches), `expr_equal` (Variable×Variable, Expression×Expression, cross-type, numbers)
- **`layout/Solver.ts`** — zero coverage; test `addConstraints`/`deleteConstraints` triggers rebuild, `addEditVariable`/`suggestValue`/`solve` produces correct variable values, `onSolve`/`onSolveOnce` callbacks (once fires exactly once)
- **`theme/utils.ts`** — zero coverage; test `deepMerge` with nested objects, array values (not merged), primitive override, missing keys added
- **`axis.ts`** — zero coverage; test `normalize_axis` with `translateExtent: true` (clamps to domain), `false` (infinite), explicit pair, `show` default

### Storybook stories (`npm run test-storybook`)

Visual rendering and component behavior in a real browser.

**New stories needed:**
- **Log scale** — plot with logarithmic x or y axis
- **Scalebar** — unit label, sizing relative to plot width, bottom-right positioning
- **TextBox** — `rotation`, `ha`/`va` alignment variants
- **Labeled axes** — `label` and `labelOffset` on both axes
- **Axis position variants** — `xaxis_pos: 'top'`, `yaxis_pos: 'right'`
- **`show: 'one'` in a grid** — verify only the outer edge axes render decorations
- **Fixed aspect ratio** — `fixedAspect` on a `<Plot>`
- **ThemeProvider** — custom `className` override applied to a component
- **Layout primitives** — `MarginBox` with asymmetric margins, `Centered`, `FlexBox` with `column` direction / `wrap` / gap

**Interaction tests (storybook `play` function):**
- **Pan** — mouse drag shifts the visible axis domain
- **Scroll-zoom** — wheel event scales the axis domain
- **`translateExtent` clamping** — pan at boundary is correctly clamped
- **Dynamic data** — updating `xs`/`ys` props on `PlotLine` re-renders the SVG path

## Examples

- Currently `examples/simple_plots` covers only basic line plots and layout primitives; add examples for:
  - Multi-panel figures with shared axes and zoom
  - Colormesh / colorscale usage
  - Scalebar and overlay components

## Refactoring

- **Shared mark hook** — `PlotLine` and future mark components all repeat the same pattern of reading `FigureContext` + `PlotContext` to obtain x/y scales; extract a `usePlotScales()` hook
- **Resolve inline TODOs** — `src/PlotAxis.tsx:39-40`, `src/layout/context.tsx:28`, `src/interaction/EventListener.ts:7`, `src/interaction/utils.ts:24` are either addressable or should be tracked here
