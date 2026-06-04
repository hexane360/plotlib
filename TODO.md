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

- **`Figure.tsx` (axis normalization)** — zero coverage; test `normalize_axis` logic (inline in `Figure.tsx`) with `translateExtent: true` (clamps to domain), `false` (infinite), explicit pair, `show` default

### Storybook stories (`npm run test-storybook`)

Stories are in `src/Layout.story.tsx`, `src/Figure.story.tsx`, and `src/PlotImage.story.tsx`.
Each story renders inline notes describing what to verify manually.
No docs addon is installed; notes appear in the Canvas via a `Note` component.

**Still missing:**
- **ThemeProvider** — custom `className` override applied to a component

## Examples

- `examples/simple_plots` examples are now mirrored as Storybook stories and are no longer the
  primary place to run them. The example app is currently unmaintained.
- Add examples for: multi-panel figures with shared axes and zoom, Colormesh/colorscale usage

## Refactoring

- **Shared mark hook** — `PlotLine` and future mark components all repeat the same pattern of reading `FigureContext` + `PlotContext` to obtain x/y scales; extract a `usePlotScales()` hook
- **Resolve inline TODOs** — `src/layout/context.tsx:28` (rem_scale not updated dynamically), `src/interaction/EventListener.ts:7` (RAII listener cleanup ergonomics), `src/interaction/utils.ts:38` (Safari investigation needed)
