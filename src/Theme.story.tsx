import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { expect } from 'storybook/test';

import { Figure, Plot, PlotLine, ThemeProvider } from '.';
import type { ScaleSpec } from './Figure';
import { linear } from './scale';
import cssStyles from './styles.module.css';

const meta: Meta<typeof Figure> = {
    component: Figure,
    title: 'Styling',
};
export default meta;
type Story = StoryObj<typeof meta>;

// ── shared data ───────────────────────────────────────────────────────────────

const N = 100;
const xs = Array.from({ length: N }, (_, i) => (i / (N - 1)) * 2 * Math.PI);
const sinYs = xs.map(Math.sin);
const cosYs = xs.map(Math.cos);

const scales: Map<string, ScaleSpec> = new Map([
    ['x', { scale: linear([0, 2 * Math.PI], [0, 1]), size: '280px' }],
    ['y', { scale: linear([-1.2, 1.2], [0, 1]), size: '180px' }],
]);

const lightBg = (Story: React.ComponentType) => (
    <div style={{ background: '#fff', padding: 16, display: 'inline-block' }}>
        <Story />
    </div>
);

const darkBg = (Story: React.ComponentType) => (
    <div style={{ background: '#1a1a1a', padding: 16, display: 'inline-block' }}>
        <Story />
    </div>
);

// ── 1. className prop ─────────────────────────────────────────────────────────

export const DirectClassName: Story = {
    parameters: {
        docs: {
            description: {
                story: `
Pass \`className\` directly to a leaf component to override its appearance for that
specific instance. The two \`<PlotLine>\` elements each receive a different class.

- The sin wave should be **dashed orange** (\`className="dashed-line"\`).
- The cos wave should be a **thick steelblue** line (\`className="thick-line"\`).
- Both lines should still be clipped at the plot boundary.
`,
            },
        },
    },
    decorators: [lightBg],
    render: () => (
        <>
            <style>{`
                .dashed-line { stroke: darkorange; stroke-dasharray: 8 4; }
                .thick-line  { stroke: steelblue; stroke-width: 4; }
            `}</style>
            <Figure scales={scales}>
                <Plot xaxis="x" yaxis="y">
                    <Plot.Clip>
                        <PlotLine xs={xs} ys={sinYs} className="dashed-line" />
                        <PlotLine xs={xs} ys={cosYs} className="thick-line" />
                    </Plot.Clip>
                </Plot>
            </Figure>
        </>
    ),
};

// ── 2. classNames on compound component ──────────────────────────────────────

export const CompoundClassNames: Story = {
    parameters: {
        docs: {
            description: {
                story: `
\`<Plot>\` is a *compound* component with named sub-elements. Pass an object to
\`classNames\` to target individual sub-elements by name.

\`Plot\` sub-elements: \`root\` (outer SVG group), \`box\` (background rect + border).

Here \`classNames={{ box: 'custom-box' }}\` targets just the plot background:

- The plot should have a **light-blue background** with a matching border.
- The line and axes should be unaffected.
`,
            },
        },
    },
    decorators: [lightBg],
    render: () => (
        <>
            <style>{`
                .custom-box > rect { fill: #dbeafe; stroke: #3b82f6; stroke-width: 1.5; }
            `}</style>
            <Figure scales={scales}>
                <Plot xaxis="x" yaxis="y" classNames={{ box: 'custom-box' }}>
                    <Plot.Clip>
                        <PlotLine xs={xs} ys={sinYs} />
                    </Plot.Clip>
                </Plot>
            </Figure>
        </>
    ),
};

// ── 3. ThemeProvider with classNames ─────────────────────────────────────────

export const ThemeProviderClassNames: Story = {
    parameters: {
        docs: {
            description: {
                story: `
Wrap the figure in \`<ThemeProvider>\` and supply \`classNames\` under a component
name to apply that class to **every instance** of the component — no per-element props needed.

Here the theme adds \`theme-line\` to every \`PlotLine\`, making both lines crimson and dashed.

- Both lines should be **crimson and dashed** even though neither has a \`className\` prop.
- The theme only applies inside the \`ThemeProvider\` boundary.
`,
            },
        },
    },
    decorators: [lightBg],
    render: () => (
        <>
            <style>{`
                .theme-line { stroke: crimson; stroke-dasharray: 8 3; stroke-width: 2; }
            `}</style>
            <ThemeProvider theme={{ components: { PlotLine: { classNames: 'theme-line' } } }}>
                <Figure scales={scales}>
                    <Plot xaxis="x" yaxis="y">
                        <Plot.Clip>
                            <PlotLine xs={xs} ys={sinYs} />
                            <PlotLine xs={xs} ys={cosYs} />
                        </Plot.Clip>
                    </Plot>
                </Figure>
            </ThemeProvider>
        </>
    ),
};

// ── 4. ThemeProvider with defaultProps ───────────────────────────────────────

export const ThemeProviderDefaultProps: Story = {
    parameters: {
        docs: {
            description: {
                story: `
Supply \`defaultProps\` for a component via \`<ThemeProvider>\` to inject prop
defaults without touching each call site.

Here the theme sets \`zoom: true\` as the default for all \`<Plot>\` components.
Neither \`<Plot>\` below has a \`zoom\` prop, but both should still be pannable and zoomable.

- Verify that pan and scroll-zoom work on the plot even though \`zoom\` is not written on the element.
- The interaction toolbar should appear on hover.
`,
            },
        },
    },
    decorators: [darkBg],
    render: () => (
        <ThemeProvider theme={{ components: { Plot: { classNames: {}, defaultProps: { zoom: true } } } }}>
            <Figure scales={scales} colorScheme="dark">
                <Plot xaxis="x" yaxis="y">
                    <Plot.Clip>
                        <PlotLine xs={xs} ys={sinYs} />
                        <PlotLine xs={xs} ys={cosYs} />
                    </Plot.Clip>
                </Plot>
            </Figure>
        </ThemeProvider>
    ),
};

// ── 5. unstyled ───────────────────────────────────────────────────────────────

export const Unstyled: Story = {
    parameters: {
        docs: {
            description: {
                story: `
Pass \`unstyled\` to strip the default CSS-module classes from a component while
leaving everything else intact.

What \`unstyled\` removes:
- The CSS-module class (e.g. \`.PlotLine\` — default stroke color, stroke-width, line-caps)
- The \`globalClasses\` lookup used by the global-classnames-prefix mechanism

What \`unstyled\` does **not** remove:
- The static \`plotlib-*\` prefix class (still present for external targeting)
- Any \`className\` / \`classNames\` passed directly as props
- Any classNames supplied via \`ThemeProvider\`
- Interactions (zoom/pan)

The story uses \`unstyled\` on both lines and restores their appearance via:
- **sin** — direct \`className\` prop (\`"direct-line"\`)
- **cos** — \`ThemeProvider\` classNames (\`"theme-line"\`)

Both lines should be styled. An unstyled line with no \`className\` and no theme classNames
would have no stroke and be invisible, since the default SVG fill and stroke are both \`none\`.

Zoom and pan should still work normally.
`,
            },
        },
    },
    decorators: [darkBg],
    render: () => (
        <>
            <style>{`
                .direct-line { stroke: gold; stroke-width: 3; fill: none; }
                .theme-line-u { stroke: deepskyblue; stroke-dasharray: 6 3; fill: none; }
            `}</style>
            <ThemeProvider theme={{ components: { PlotLine: { classNames: 'theme-line-u' } } }}>
                <Figure scales={scales} colorScheme="dark">
                    <Plot xaxis="x" yaxis="y" zoom>
                        <Plot.Clip>
                            <PlotLine xs={xs} ys={sinYs} unstyled className="direct-line" />
                            <PlotLine xs={xs} ys={cosYs} unstyled />
                        </Plot.Clip>
                    </Plot>
                </Figure>
            </ThemeProvider>
        </>
    ),
    play: async ({ canvasElement }) => {
        // Use the static prefix class (never removed by `unstyled`) to locate PlotLines.
        const paths = Array.from(
            canvasElement.querySelectorAll<SVGPathElement>('.plotlib-PlotLine-root')
        );
        expect(paths).toHaveLength(2);
        const [sinPath, cosPath] = paths;

        // CSS-module default class is stripped by `unstyled`
        expect(sinPath.classList.contains(cssStyles.PlotLine)).toBe(false);
        expect(cosPath.classList.contains(cssStyles.PlotLine)).toBe(false);

        // Static prefix class is always present (not gated on `unstyled`)
        expect(sinPath.classList.contains('plotlib-PlotLine-root')).toBe(true);
        expect(cosPath.classList.contains('plotlib-PlotLine-root')).toBe(true);

        // Theme classNames survive `unstyled`
        expect(sinPath.classList.contains('theme-line-u')).toBe(true);
        expect(cosPath.classList.contains('theme-line-u')).toBe(true);

        // Passed className survives `unstyled` (sin line only)
        expect(sinPath.classList.contains('direct-line')).toBe(true);
        expect(cosPath.classList.contains('direct-line')).toBe(false);
    },
};

// ── 6. Global CSS via classNamesPrefix ────────────────────────────────────────

export const GlobalClassNamesPrefix: Story = {
    parameters: {
        docs: {
            description: {
                story: `
Every component automatically receives a static class
\`<prefix>-<ComponentName>-<subcomponent>\` (default prefix: \`plotlib\`).
These classes can be targeted from any global stylesheet without modifying props.

Here a \`<style>\` tag targets \`.plotlib-PlotLine-root\` to turn all lines **green and dashed**.

You can also change the prefix via
\`<ThemeProvider theme={{ classNamesPrefix: "myapp" }}>\` to namespace the classes.

- Both lines should be **green and dashed** with no \`className\` or \`ThemeProvider\` on
  the individual components.
`,
            },
        },
    },
    decorators: [lightBg],
    render: () => (
        <>
            <style>{`
                .plotlib-PlotLine-root { stroke: green; stroke-dasharray: 5 4; stroke-width: 2; }
            `}</style>
            <Figure scales={scales}>
                <Plot xaxis="x" yaxis="y">
                    <Plot.Clip>
                        <PlotLine xs={xs} ys={sinYs} />
                        <PlotLine xs={xs} ys={cosYs} />
                    </Plot.Clip>
                </Plot>
            </Figure>
        </>
    ),
};
