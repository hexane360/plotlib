# plotlib

A React component library for building interactive scientific figures. Plots are rendered as SVG, layout is solved by a Cassowary constraint engine, and interactivity (zoom, pan) is driven by Jotai atoms — giving a declarative, composable API that fits naturally into any React application.

## Features

- **Declarative figure API** — define axes once on `<Figure>`, reference them by name across any number of `<Plot>` panels; the layout engine keeps them aligned automatically
- **Constraint-based layout** — panel sizing uses a Cassowary solver ([`@lume/kiwi`](https://github.com/lume/kiwi)), supporting proportional sizes, shared axis dimensions, and flexible multi-panel grids
- **Interactive zoom & pan** — scroll to zoom, drag to pan, with configurable zoom extent, translate extent, and optional fixed aspect ratio
- **Composable marks** — `PlotLine` renders line series inside a `Plot.Clip` region; more mark types planned
- **Color scales** — `linear` and `log` scales support numeric→color mapping via `d3-interpolate` piecewise interpolation
- **Scalebar** — auto-ranging physical scale bar with SI prefix selection, zoom-aware
- **Theming** — lightweight CSS-module-backed theme system; components accept style override props

## Installation

```bash
npm install plotlib
```

Peer dependencies — install these alongside plotlib if not already present:

```bash
npm install react react-dom jotai
```

Then import the default stylesheet once in your application:

```tsx
import 'plotlib/styles.css';
```

## Quick Start

```tsx
import React from 'react';
import { Figure, Plot, PlotLine, layout } from 'plotlib';
import type { AxisSpec } from 'plotlib';
import 'plotlib/styles.css';

const axes = new Map<string, AxisSpec>([
    ['x', { domain: [0, 10], size: '400px' }],
    ['y', { domain: [0, 4], size: '200px' }],
]);

const xs = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const ys = xs.map(Math.sqrt);

export function MyFigure() {
    return (
        <Figure axes={axes} width="600px">
            <Plot xaxis="x" yaxis="y" zoom>
                <Plot.Clip>
                    <PlotLine xs={xs} ys={ys} />
                </Plot.Clip>
            </Plot>
        </Figure>
    );
}
```

## Multi-Panel Figures

Axes declared on `<Figure>` are shared across panels by name. Placing two `<Plot>` components with the same `xaxis` key aligns them horizontally and links their zoom state.

```tsx
const axes = new Map<string, AxisSpec>([
    ['x',      { domain: [0, 10], size: '400px', show: 'one' }],
    ['signal', { domain: [-1, 1], size: '150px', show: 'one' }],
    ['error',  { domain: [0, 0.5], size: '150px', show: 'one' }],
]);

<Figure axes={axes} width="600px">
    <layout.FlexBox flexDirection="column" rowGap="8px">
        <Plot xaxis="x" yaxis="signal" zoom>
            <Plot.Clip><PlotLine xs={xs} ys={signal} /></Plot.Clip>
        </Plot>
        <Plot xaxis="x" yaxis="error" zoom>
            <Plot.Clip><PlotLine xs={xs} ys={error} /></Plot.Clip>
        </Plot>
    </layout.FlexBox>
</Figure>
```

`show: 'one'` suppresses duplicate axis labels when panels share an axis — only the outermost panel renders it.

## Core Concepts

### Axes

Each axis is declared as an `AxisSpec` in the `axes` map passed to `<Figure>`:

| Property | Type | Description |
|---|---|---|
| `domain` | `[number, number]` | Data range |
| `size` | `string \| number` | CSS length or solver variable expression |
| `show` | `boolean \| 'one'` | Whether to render the axis; `'one'` shows it only on the first/last panel in a grid |
| `translateExtent` | `[number, number] \| boolean` | Pan boundary; `true` clamps to domain |
| `label` | `string` | Axis label text |

### Scales

Standalone scale constructors are available for use outside the component tree:

```ts
import { linear, log } from 'plotlib/scale';

const s = linear([0, 100], [0, 500]);   // data → pixels
s.transform(50);                         // → 250
s.ticks(5);                              // → [0, 25, 50, 75, 100]

const color = linear([0, 1], ['blue', 'red']);
color.transform(0.5);                    // → interpolated color string
```

### Layout

The `layout` export exposes the constraint-based layout primitives directly, for building custom compositions:

| Component | Purpose |
|---|---|
| `layout.FlexBox` | Flex-like arrangement of child plots |
| `layout.MarginBox` | Adds fixed or proportional margins |
| `layout.Centered` | Centers content within parent bounds |
| `layout.Decorated` | Attaches decorations (axis, label) to any edge |
| `layout.Constrained` | SVG root; feeds container size into the solver |

## Development

```bash
# build the library
npm run build

# watch mode
npm run watch

# run tests
npm run test
```

The `examples/simple_plots` directory contains a Vite app that imports from the local build and is a convenient testbed during development.

## Further Reading

- [ARCHITECTURE.md](ARCHITECTURE.md) — component hierarchy, scale system, layout engine, zoom system, and context/atom graph
- [TODO.md](TODO.md) — planned features and known cleanup items
