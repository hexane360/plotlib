import React from 'react';
import ReactDOM from 'react-dom';
import type { Meta, StoryObj } from '@storybook/react';

import { Figure, Plot, PlotLine, layout } from '.';

/** Renders a floating button that dumps the Cassowary constraint table to the console. */
function SolverDebugger() {
    const solverCtx = React.useContext(layout.SolverContext);
    return ReactDOM.createPortal(
        <button
            style={{ position: 'fixed', bottom: 12, right: 12, zIndex: 9999, padding: '4px 10px', fontFamily: 'monospace' }}
            onClick={() => {
                if (!solverCtx) { console.warn('no solver'); return; }
                console.log('=== CONSTRAINTS ===');
                solverCtx.solver.printConstraints();
                console.log('=== VARIABLES ===');
                solverCtx.solver.printVariables();
            }}
        >
            dump solver
        </button>,
        document.body
    );
}
import { linear, log } from './scale';
import type { ScaleSpec } from './Figure';

const meta: Meta<typeof Figure> = {
    component: Figure,
    title: "Figure",
    argTypes: {
        colorScheme: { control: 'radio', options: ['light', 'dark'] },
    },
};
export default meta;
type Story = StoryObj<typeof meta>;

// ── data ──────────────────────────────────────────────────────────────────────

const N = 300;
const xs = Array.from({ length: N }, (_, i) => (i / (N - 1)) * 2 * Math.PI);
const sinYs = xs.map(Math.sin);
const cosYs = xs.map(Math.cos);

const linearScales: Map<string, ScaleSpec> = new Map([
    ['x', { scale: linear([0, 2 * Math.PI], [0, 1], { label: 'x' }), size: '300px' }],
    ['y', { scale: linear([-1.2, 1.2], [0, 1], { label: 'y' }), size: '200px' }],
]);

// Exponential curve: y = 10^x over [0, 3]
const logXs = Array.from({ length: 200 }, (_, i) => i / 66.0);
const logYs = logXs.map(x => Math.pow(10.0, x));

// Unit circle
const circleTs = Array.from({ length: 201 }, (_, i) => (i / 200) * 2 * Math.PI);
const circleXs = circleTs.map(t => Math.cos(t));
const circleYs = circleTs.map(t => Math.sin(t));

// ── shared decorator ──────────────────────────────────────────────────────────

function darkBg(colorScheme: string | undefined) {
    return (Story: React.ComponentType) => (
        <div style={{ background: colorScheme === 'dark' ? '#1a1a1a' : '#ffffff', padding: 16 }}>
            <Story />
        </div>
    );
}

// ── stories ───────────────────────────────────────────────────────────────────

export const SingleLine = {
    parameters: {
        docs: {
            description: {
                story: `
- Hover over the plot to reveal the interaction bar (top-right corner); verify pan and
  box-zoom modes are both selectable and functional.
- Shift+scroll should zoom only the axis parallel to the scroll direction (x or y), not both.
- The line should be clipped at the plot boundary — verify no rendering outside the axes.
`,
            },
        },
    },
    args: { scales: linearScales, colorScheme: 'dark' as const },
    decorators: [
        (Story, { args }) => (
            <div style={{ background: args.colorScheme === 'dark' ? '#1a1a1a' : '#ffffff', padding: 16 }}>
                <Story />
            </div>
        ),
    ],
    render: (args) => (
        <Figure {...args} debug>
            <Plot xaxis="x" yaxis="y" zoom>
                <Plot.Clip>
                    <PlotLine xs={xs} ys={sinYs} />
                </Plot.Clip>
            </Plot>
        </Figure>
    ),
} satisfies Story;

export const TwoLines = {
    parameters: {
        docs: {
            description: {
                story: `
- Both lines move together during pan and zoom — they share the same axes.
- Box-zoom should select a rectangle and zoom both lines simultaneously.
`,
            },
        },
    },
    args: { scales: linearScales, colorScheme: 'dark' as const, name: "Two Lines" },
    decorators: [
        (Story, { args }) => (
            <div style={{ background: args.colorScheme === 'dark' ? '#1a1a1a' : '#ffffff', padding: 16 }}>
                <Story />
            </div>
        ),
    ],
    render: (args) => (
        <Figure {...args} debug>
            <Plot xaxis="x" yaxis="y" zoom>
                <Plot.Clip>
                    <PlotLine xs={xs} ys={sinYs} />
                    <PlotLine xs={xs} ys={cosYs} style={{ stroke: 'steelblue' }} />
                </Plot.Clip>
            </Plot>
        </Figure>
    ),
} satisfies Story;

export const Grid = {
    parameters: {
        docs: {
            description: {
                story: `
- The shared y-axis (\`'y'\`) should appear exactly once — between the two plots, not on the
  outer edges. \`show: 'one'\` suppresses the outer axes.
- Zooming the y-axis on either plot (scroll without shift) affects both plots simultaneously
  since they share the same axis key and transform atom.
- Zooming x on the left plot does not affect the right plot (different axis keys).
`,
            },
        },
    },
    args: {
        scales: new Map([
            ['x1', { scale: linear([0, 2 * Math.PI], [0, 1], { show: 'one' }), size: '200px' }],
            ['x2', { scale: linear([0, 2 * Math.PI], [0, 1], { show: 'one' }), size: '200px' }],
            ['y',  { scale: linear([-1.2, 1.2], [0, 1], { show: 'one' }), size: '150px' }],
        ]),
        colorScheme: 'dark' as const,
    },
    decorators: [
        (Story, { args }) => (
            <div style={{ background: args.colorScheme === 'dark' ? '#1a1a1a' : '#ffffff', padding: 16 }}>
                <Story />
            </div>
        ),
    ],
    render: (args) => (
        <Figure {...args} debug>
            <layout.FlexBox flexDirection="row" columnGap="8px">
                <Plot xaxis="x1" yaxis="y" zoom>
                    <Plot.Clip>
                        <PlotLine xs={xs} ys={sinYs} />
                    </Plot.Clip>
                </Plot>
                <Plot xaxis="x2" yaxis="y" zoom>
                    <Plot.Clip>
                        <PlotLine xs={xs} ys={cosYs} />
                    </Plot.Clip>
                </Plot>
            </layout.FlexBox>
        </Figure>
    ),
} satisfies Story;

// ── DynamicData ───────────────────────────────────────────────────────────────

function DynamicDataStory() {
    const [[xs, ys], addPoint] = React.useReducer(
        ([xs, ys]: [number[], number[]]) => {
            const x = xs.at(-1)! + 0.5;
            return [[...xs, x], [...ys, Math.sqrt(x)]] as [number[], number[]];
        },
        [[0.0], [0.0]]
    );

    const scales = React.useMemo<Map<string, ScaleSpec>>(() => new Map([
        ['x', { scale: linear([0.0, 10.0], [0, 1], { label: 'x' }), size: '300px', translateExtent: true }],
        ['y', { scale: linear([0.0, 3.5], [0, 1], { label: '√x' }), size: '200px' }],
    ]), []);

    return (
        <div style={{ background: '#1a1a1a', padding: 16, display: 'inline-flex', flexDirection: 'column', gap: 8 }}>
            <button onClick={addPoint} style={{ alignSelf: 'flex-start' }}>Add point</button>
            <Figure scales={scales} colorScheme="dark" debug>
                <Plot xaxis="x" yaxis="y" zoom>
                    <Plot.Clip>
                        <PlotLine xs={xs} ys={ys} />
                    </Plot.Clip>
                </Plot>
            </Figure>
        </div>
    );
}

export const DynamicData = {
    parameters: {
        docs: {
            description: {
                story: `
Ported from \`examples/simple_plots/src/simple-line.tsx\`.

- Add many points until x >> 10, then try panning left past x=0 — \`translateExtent: true\`
  should clamp it. Panning right should also clamp at the last data point.
- Each click should extend the line smoothly with no re-render flicker or path discontinuity.
- The y domain is fixed at [0, 3.5]; data points beyond y=3.5 (at x > 12.25) are clipped.
`,
            },
        },
    },
    render: () => <DynamicDataStory />,
} satisfies Story;

// ── LogScale ──────────────────────────────────────────────────────────────────

export const LogScale = {
    parameters: {
        docs: {
            description: {
                story: `
Log y-axis with an exponential curve (y = 10^x).

- The curve should appear as a **straight line** — the log transform linearises it.
- Tick labels at the initial view should be 1, 10, 100, 1000 and evenly spaced pixel-wise.
- Zoom into one decade (e.g. 10–100) and verify sub-decade ticks appear (2, 5, 20, 50 etc.).
- Shift+scroll to zoom only the y-axis; x-axis ticks should not move.
`,
            },
        },
    },
    args: {
        scales: new Map<string, ScaleSpec>([
            ['x', { scale: linear([0.0, 3.0], [0, 1], { label: 'x' }), size: '300px' }],
            ['y', { scale: log([1.0, 1000.0] as const, undefined, undefined, { label: 'y (log)' }), size: '220px' }],
        ]),
        colorScheme: 'dark' as const,
    },
    decorators: [(Story, { args }) => darkBg(args.colorScheme ?? 'dark')(Story)],
    render: (args) => (
        <Figure {...args} debug>
            <Plot xaxis="x" yaxis="y" zoom>
                <Plot.Clip>
                    <PlotLine xs={logXs} ys={logYs} />
                </Plot.Clip>
            </Plot>
        </Figure>
    ),
} satisfies Story;

// ── AxisPositions ─────────────────────────────────────────────────────────────

export const AxisPositions = {
    parameters: {
        docs: {
            description: {
                story: `
X-axis on top, y-axis on the right.

- Ticks should extend **downward** from the top axis and **leftward** from the right axis
  (i.e. into the plot area, not away from it).
- Axis labels ('x', 'y') should appear outside the plot — above the top axis and to the
  right of the right axis.
- Zoom and pan should still work normally; the interaction bar appears on hover.
`,
            },
        },
    },
    args: { scales: linearScales, colorScheme: 'dark' as const },
    decorators: [(Story, { args }) => darkBg(args.colorScheme ?? 'dark')(Story)],
    render: (args) => (
        <Figure {...args} debug>
            <Plot xaxis="x" yaxis="y" xaxis_pos="top" yaxis_pos="right" zoom>
                <Plot.Clip>
                    <PlotLine xs={xs} ys={sinYs} />
                </Plot.Clip>
            </Plot>
        </Figure>
    ),
} satisfies Story;

// ── FixedAspect ───────────────────────────────────────────────────────────────

export const FixedAspect = {
    parameters: {
        docs: {
            description: {
                story: `
Fixed aspect ratio — x and y pixel/data scales are constrained to be equal.
The unit circle is the ideal test: any aspect distortion makes it visibly oval.

- After zoom, the circle must remain circular — \`fixedAspect\` applies to zoomed views too.
- Change one axis \`size\` to \`'150px'\` in args (making specified sizes unequal) and verify the
  constraint overrides it — the plot area is still square, just smaller overall.
- Shift+scroll (single-axis zoom) should be blocked or move both axes equally.
`,
            },
        },
    },
    args: {
        scales: new Map<string, ScaleSpec>([
            ['x', { scale: linear([-1.5, 1.5], [0, 1], { label: 'x' }), size: '300px' }],
            ['y', { scale: linear([-1.5, 1.5], [0, 1], { label: 'y' }), size: '300px' }],
        ]),
        colorScheme: 'dark' as const,
    },
    decorators: [(Story, { args }) => darkBg(args.colorScheme ?? 'dark')(Story)],
    render: (args) => (
        <Figure {...args} debug>
            <Plot xaxis="x" yaxis="y" fixedAspect zoom>
                <Plot.Clip>
                    <PlotLine xs={circleXs} ys={circleYs} />
                </Plot.Clip>
            </Plot>
        </Figure>
    ),
} satisfies Story;

// ── Resizable ─────────────────────────────────────────────────────────────────

export const Resizable: Story = {
    parameters: {
        docs: {
            description: {
                story: `
Shared-axis grid inside a resizable container — drag the bottom-right corner to resize.

- The shared y-axis (\`show: 'one'\`) should appear exactly once, between the two panels;
  neither outer edge should show y-axis decorations.
- After resize, the two panels should remain equal width and the y-axis should stay
  pixel-perfect aligned between them — no gap or overlap at the join.
- Zooming y on either panel moves the shared y-axis on both (same atom); x-axes are independent.
`,
            },
        },
    },
    args: {
        scales: new Map<string, ScaleSpec>([
            ['x1', { scale: linear([0, 2 * Math.PI], [0, 1], { show: 'one', 'label': "X axis" }), size: '1a' }],
            ['x2', { scale: linear([0, 2 * Math.PI], [0, 1], { show: 'one', 'label': "Other X axis" }), size: '1a' }],
            ['y',  { scale: linear([-1.2, 1.2], [0, 1], { show: 'one', 'label': "Y axis" }), size: '1a' }],
        ]),
        colorScheme: 'dark' as const,
        width: '100%', height: '100%'
    },
    decorators: [
        (Story, { args }) => (
            <div style={{
                background: args.colorScheme === 'dark' ? '#1a1a1a' : '#ffffff',
                padding: 16,
                paddingRight: 12,
                paddingBottom: 12,
                resize: 'both',
                overflow: 'hidden',
                width: 520,
                height: 220,
                border: '1px dashed #666',
                boxSizing: 'border-box',
            }}>
                <Story />
            </div>
        ),
    ],
    render: (args) => (
        <Figure toolbar={false} {...args} debug>
            <SolverDebugger />
            <layout.FlexBox flexDirection="row" columnGap="8px">
                <Plot xaxis="x1" yaxis="y" zoom>
                    <Plot.Clip>
                        <PlotLine xs={xs} ys={sinYs} />
                    </Plot.Clip>
                </Plot>
                <Plot xaxis="x2" yaxis="y" zoom>
                    <Plot.Clip>
                        <PlotLine xs={xs} ys={cosYs} />
                    </Plot.Clip>
                </Plot>
            </layout.FlexBox>
        </Figure>
    ),
} satisfies Story;
