# plotlib

A React component library for building interactive scientific figures. Plots are rendered as SVG, layout is solved by a Cassowary constraint engine, and interactivity (zoom, pan) is driven by Jotai atoms — giving a declarative, composable API that fits naturally into any React application.

## Features

- **Declarative figure API** — define scales once on `<Figure>`, reference them by name across any number of `<Plot>` panels; the layout engine keeps them aligned automatically
- **Constraint-based layout** — panel sizing uses a Cassowary solver ([`@lume/kiwi`](https://github.com/lume/kiwi)), supporting proportional sizes, shared axis dimensions, and flexible multi-panel grids
- **Interactive zoom & pan** — scroll to zoom, drag to pan, with configurable zoom extent, translate extent, and optional fixed aspect ratio
- **Composable marks** — `PlotLine` for line series, `PlotImage` for colormapped bitmap data
- **Color scales** — `linear` and `log` scales support numeric→color mapping via `d3-interpolate` piecewise interpolation
- **Colorbar** — axis-aligned colorbar with configurable size and gradient stops
- **Scalebar** — auto-ranging physical scale bar with SI prefix selection, zoom-aware
- **Theming** — lightweight CSS-module-backed theme system; components accept style override props

## Installation

```bash
npm install @hexane/plotlib
```

Peer dependencies — install these alongside plotlib if not already present:

```bash
npm install react react-dom jotai
```

Then import the default stylesheet once in your application:

```tsx
import '@hexane/plotlib/styles.css';
```

## Quick Start

```tsx
import React from 'react';
import { Figure, Plot, PlotLine, layout } from '@hexane/plotlib';
import type { ScaleSpec } from '@hexane/plotlib';
import '@hexane/plotlib/styles.css';

const scales = new Map<string, ScaleSpec>([
    ['x', { domain: [0, 10], size: '400px' }],
    ['y', { domain: [0, 4], size: '200px' }],
]);

const xs = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const ys = xs.map(Math.sqrt);

export function MyFigure() {
    return (
        <Figure scales={scales} width="600px">
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
const scales = new Map<string, ScaleSpec>([
    ['x',      { domain: [0, 10], size: '400px', show: 'one' }],
    ['signal', { domain: [-1, 1], size: '150px', show: 'one' }],
    ['error',  { domain: [0, 0.5], size: '150px', show: 'one' }],
]);

<Figure scales={scales} width="600px">
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

Each axis is declared as a `ScaleSpec` in the `scales` map passed to `<Figure>`:

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
import { linear, log } from '@hexane/plotlib/scale';

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

### Theming

Components ship with default styles via CSS modules. There are four ways to override them, from narrowest to broadest scope:

**1. `className` / `classNames` props** — per-instance overrides. Simple components accept `className`; compound components (e.g. `Plot`) also accept `classNames` to target named sub-elements:

```tsx
<PlotLine xs={xs} ys={ys} className="my-line" />

<Plot xaxis="x" yaxis="y" classNames={{ box: 'custom-box' }}>
```

**2. Global CSS via static prefix classes** — every component receives a static `plotlib-<Component>-<sub>` class that can be targeted from any stylesheet without touching props:

```css
.plotlib-PlotLine-root { stroke: steelblue; stroke-width: 2; }
```

**3. `ThemeProvider`** — applies `classNames` or `defaultProps` to all instances of a component within the subtree:

```tsx
<ThemeProvider theme={{
    components: {
        PlotLine: { classNames: 'my-line' },
        Plot: { defaultProps: { zoom: true } },
    }
}}>
    <Figure scales={scales}>...</Figure>
</ThemeProvider>
```

**4. `unstyled`** — strips the default CSS-module class from a single component, leaving interactions and `className` props intact:

```tsx
<PlotLine xs={xs} ys={ys} unstyled className="my-line" />
```

The `classNamesPrefix` option on `ThemeProvider` lets you change the `plotlib-` prefix to namespace classes for your application.

## Components

### PlotImage

Renders a colormapped bitmap image aligned to data coordinates. The image is drawn onto a canvas at the specified resolution and composited into the SVG.

```tsx
const scales = new Map<string, ScaleSpec>([
    ['x', { domain: [0, 1], size: '400px' }],
    ['y', { domain: [0, 1], size: '400px' }],
    ['color', { scale: linear([0, 1], ['blue', 'red']) }],
]);

<Figure scales={scales}>
    <Plot xaxis="x" yaxis="y">
        <Plot.Clip>
            <PlotImage img={data} scale="color" width={256} height={256} />
        </Plot.Clip>
    </Plot>
</Figure>
```

| Prop | Type | Description |
|---|---|---|
| `img` | `number[][] \| ArrayLike<number>` | Row-major image data |
| `scale` | `string` | Key of a color axis declared on `<Figure>` |
| `width` | `number` | Canvas pixel width |
| `height` | `number` | Canvas pixel height |
| `xlim` | `[number, number]` | Data bounds along x; defaults to the x-axis domain |
| `ylim` | `[number, number]` | Data bounds along y; defaults to the y-axis domain |

### Colorbar

An axis-aligned colorbar that reads from a color axis declared on `<Figure>`. Place it inside a `<Plot>` or alongside one using `layout.Decorated`.

```tsx
import { Figure, Plot, PlotImage } from '@hexane/plotlib';

<Figure scales={scales}>
    <Plot xaxis="x" yaxis="y" colorbar="color" zoom>
        <Plot.Clip>
            <PlotImage img={data} scale="color" width={256} height={256} />
        </Plot.Clip>
    </Plot>
</Figure>
```

### TextBox

A rotatable SVG text element with alignment control. Used internally for axis labels; also available for annotations.

| Prop | Type | Description |
|---|---|---|
| `ha` | `'left' \| 'center' \| 'right'` | Horizontal alignment; defaults to `'center'` |
| `va` | `'top' \| 'center' \| 'bottom'` | Vertical alignment; defaults to `'center'` |
| `rotation` | `number` | Rotation in degrees about the element's centre |

### ThemeProvider

Wraps a subtree with a custom theme. Components read style defaults from the nearest `ThemeProvider`.

```tsx
import { ThemeProvider } from '@hexane/plotlib';

<ThemeProvider theme={{ components: { PlotLine: { defaultProps: { stroke: 'red' } } } }}>
    <Figure scales={scales}>...</Figure>
</ThemeProvider>
```

| Prop | Type | Description |
|---|---|---|
| `theme` | `ThemeOverride` | Partial theme to apply |
| `inherit` | `boolean` | Whether to merge with the parent theme; defaults to `true` |

## Development

```bash
# build the library
npm run build

# watch mode
npm run watch

# run tests
npm run test

# view storybook
npm run storybook
```

The `examples/simple_plots` directory contains a Vite app that imports from the local build and is a convenient testbed during development.

## Further Reading

- [ARCHITECTURE.md](ARCHITECTURE.md) — component hierarchy, scale system, layout engine, zoom system, and context/atom graph
- [TODO.md](TODO.md) — planned features and known cleanup items
