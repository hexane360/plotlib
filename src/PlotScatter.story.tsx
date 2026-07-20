import type { Meta, StoryObj } from '@storybook/react';
import { interpolateViridis } from 'd3-scale-chromatic';

import { Figure, Plot, PlotScatter } from '.';
import { linear } from './scale';
import type { ScaleSpec } from './Figure';

const meta: Meta<typeof Figure> = {
    component: Figure,
    title: "PlotScatter",
};
export default meta;

type Story = StoryObj<typeof meta>;

// ── data ──────────────────────────────────────────────────────────────────────

// Deterministic pseudo-random sequence (avoids Math.random in stories).
function mulberry32(seed: number): () => number {
    return () => {
        seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const N = 150;
const rand = mulberry32(42);

const xs = Array.from({ length: N }, () => rand() * 10.0);
const ys = Array.from({ length: N }, () => rand() * 10.0);
const sizes = Array.from({ length: N }, () => 2.0 + rand() * 10.0);
const fills = Array.from({ length: N }, (_, i) => interpolateViridis(i / (N - 1)));
const opacities = Array.from({ length: N }, () => 0.4 + rand() * 0.6);

const scales: Map<string, ScaleSpec> = new Map([
    ['x', { scale: linear([0.0, 10.0], undefined, { label: 'x' }), size: '300px' }],
    ['y', { scale: linear([0.0, 10.0], undefined, { label: 'y' }), size: '300px' }],
]);

export const VaryingMarkerProps: Story = {
    parameters: {
        docs: {
            description: {
                story: `
PlotScatter with per-point radius, fill color, and opacity, all driven by \`marker_props\`.

- Marks should vary smoothly in radius, color, and opacity across the plot.
- Zoom and pan; mark positions should track the data, but radii should stay constant
  in screen space (PlotScatter scales positions, not the rendered marks).
`,
            },
        },
    },
    args: { scales },
    render: (args) => (
        <Figure {...args} debug>
            <Plot xaxis="x" yaxis="y" zoom>
                <Plot.Clip>
                    <PlotScatter
                        xs={xs} ys={ys}
                        marker_props={{ r: sizes, opacity: opacities }}
                        marker={(x, y, props) => (
                            <circle cx={x} cy={y} r={props.r} opacity={props.opacity} />
                        )}
                    />
                </Plot.Clip>
            </Plot>
        </Figure>
    ),
};

export const CirclePreset: Story = {
    parameters: {
        docs: {
            description: {
                story: `
PlotScatter using the built-in \`'circle'\` marker preset, with per-point \`color\` and \`size\`
driven by \`marker_props\`.

- Each mark is a degenerate \`path\` segment drawn with a round line cap and sized via
  \`stroke-width\` (an inline style) rather than a geometric radius.
- \`color\`/\`size\` should vary smoothly across the plot, matching the same data as
  "Varying Marker Props" above.
`,
            },
        },
    },
    args: { scales },
    render: (args) => (
        <Figure {...args} debug>
            <Plot xaxis="x" yaxis="y" zoom>
                <Plot.Clip>
                    <PlotScatter
                        xs={xs} ys={ys}
                        marker="circle"
                        marker_props={{ color: fills }}
                    />
                </Plot.Clip>
            </Plot>
        </Figure>
    ),
};

export const SquarePreset: Story = {
    parameters: {
        docs: {
            description: {
                story: `
PlotScatter using the built-in \`'square'\` marker preset.

Identical setup to the \`'circle'\` preset, but each mark is drawn with a square line cap
instead of a round one.
`,
            },
        },
    },
    args: { scales },
    render: (args) => (
        <Figure {...args} debug>
            <Plot xaxis="x" yaxis="y" zoom>
                <Plot.Clip>
                    <PlotScatter
                        xs={xs} ys={ys}
                        marker="square"
                        marker_props={{ color: fills, size: sizes }}
                    />
                </Plot.Clip>
            </Plot>
        </Figure>
    ),
};
