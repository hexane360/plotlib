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

- **Split `zoom.tsx`** — the file mixes a React component (`Zoomer`) with two large imperative classes (`ZoomManager`, `EventListenerManager`); the classes should move to a separate file
- **Shared mark hook** — `PlotLine` and future mark components all repeat the same pattern of reading `FigureContext` + `PlotContext` to obtain x/y scales; extract a `usePlotScales()` hook
- **`normalize_axis` purity** — the function mutates its `AxisSpec` input before returning; it should derive a new `Axis` object without modifying the caller's value

## Code Style

- **Remove active `console.log` calls** — `src/zoom.tsx:56` ("Constructing zoomer…") and `src/layout/Solver.ts:30` ("Rebuilding solver") / `:66` (`printConstraints`); many more are commented out and can be deleted
- **Naming consistency** — internal names mix `snake_case` (`normalize_axis`, `ax_size_vars`, `set_x_trans`) with the otherwise `camelCase` codebase; align to one convention
- **Resolve inline TODOs** — `src/PlotAxis.tsx:39-40`, `src/zoom.tsx:18,151,156,293`, `src/layout/context.tsx:28` are either addressable or should be tracked here