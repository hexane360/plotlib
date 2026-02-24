TODO
====

# Features

## Plot Components

- **Raster image** (`PlotImage`) — render a bitmap image aligned to data coordinates (in progress)
- **Colormesh** — grid of rectangles colored by a colorscale (analogous to matplotlib `pcolormesh`); distinct from raster image in that the geometry is computed from data rather than decoded from a bitmap
- **Scatter** — per-point SVG marks (`<circle>`, `<use>` with symbol); API similar to `PlotLine` but renders one element per point rather than a single `<path>`
- **Bar** — vertical/horizontal bars; requires thought on categorical/binned axis support
- **Colorbar** — visual legend for color-mapped data (gradient strip + ticks); companion to colormesh and raster image
- **Legend** — series legend; should be designed together with toggle trace visibility

## Interactivity

- **Interaction menu / toolbar** — floating overlay for selecting interaction mode (box zoom, pan, reset zoom) and saving an image; can follow the same positioning pattern as `Scalebar`
- **Touch events** — pinch-to-zoom and drag pan in `ZoomManager`; currently only mouse and wheel events are handled
- **Toggle trace visibility** — show/hide individual series; needs shared visibility state (Jotai atom), designed in conjunction with Legend
- **Export utility** — save figure as SVG or PNG

---

# Cleanup & Improvement

## Testing

- **Layout / solver** — no tests exist for constraint setup, variable resolution, or `FlexBox`/`Decorated` geometry
- **Zoom** — `ZoomManager` pan, scroll-zoom, translate-extent clamping, and fixed-aspect logic are all untested
- **Components** — no render tests for `Figure`, `Plot`, `PlotLine`, `Scalebar`, or axis components

## Examples

- Currently `examples/simple_plots` covers only basic line plots and layout primitives; add examples for:
  - Multi-panel figures with shared axes and zoom
  - Colormesh / colorscale usage
  - Scalebar and overlay components

## Refactoring & Reorganization

- **Zoom architecture refactor** — to be done when implementing broader interactivity (toolbar, box zoom, etc.). The current design is intentional: `ZoomManager` bypasses React for transform updates (direct DOM attribute writes) to avoid re-rendering the plot hierarchy on every pan/wheel event; only axis components re-render via Jotai atoms. Known issue within this design: `ZoomManager` holds stale `Axis` references (captures `xaxis`/`yaxis` at construction, never updates them), so changes to `translateExtent` or other axis metadata after mount have no effect. Fix alongside any zoom redesign, not in isolation. Also: split `ZoomManager` and `EventListenerManager` out of `zoom.tsx` into a separate file.
- **Shared mark hook** — `PlotLine` and future mark components all repeat the same pattern of reading `FigureContext` + `PlotContext` to obtain x/y scales; extract a `usePlotScales()` hook
- **`FlexBox` wrap detection** — the current approach goes through a derived Jotai atom → debounced React state → re-render → new constraints, causing a visible flash on the first render and multi-frame latency. A cleaner alternative: register an `onSolve` callback on the solver, read current item sizes synchronously via `store.get(variable.atom)`, compute new wrap indices, and call `solver.scheduleRebuild()` if they changed. This keeps the feedback loop inside the solver (solver → solver via `setTimeout`) with no React render cycle in the hot path and no debounce needed.

## Code Style

- **Remove active `console.log` calls** — `src/zoom.tsx:56` ("Constructing zoomer…") and `src/layout/Solver.ts:30` ("Rebuilding solver") / `:66` (`printConstraints`); many more are commented out and can be deleted
- **Naming consistency** — internal names mix `snake_case` (`normalize_axis`, `ax_size_vars`, `set_x_trans`) with the otherwise `camelCase` codebase; align to one convention
- **Resolve inline TODOs** — `src/PlotAxis.tsx:39-40`, `src/zoom.tsx:18,151,156,293`, `src/layout/context.tsx:28` are either addressable or should be tracked here