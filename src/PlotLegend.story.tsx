import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { Figure, Plot, PlotLine } from '.';
import PlotLegend, { Location } from './PlotLegend';
import { linear } from './scale';
import type { ScaleSpec } from './Figure';

// `Length` presets spanning each supported unit — used for select controls below, since
// free-text controls would feed `parse_length` malformed intermediate strings while typing.
const lengthPresets = ['0px', '5px', '10px', '20px', '40px', '0.5rem', '1rem', '2rem', '5%', '10%', '20%'];

const meta: Meta<typeof PlotLegend> = {
    component: PlotLegend,
    title: 'PlotLegend',
    argTypes: {
        location: {
            control: 'select',
            options: [
                'upper left', 'upper center', 'upper right',
                'center left', 'center center', 'center right',
                'lower left', 'lower center', 'lower right',
            ] satisfies Location[],
        },
        // free-text controls fire on every keystroke, and `parse_length` throws on the
        // malformed intermediate strings that produces (e.g. "1" or "10p" while typing
        // "10px") — so offer a curated set of valid Length presets instead.
        margin: { control: 'select', options: lengthPresets },
        padding: { control: 'select', options: lengthPresets },
        markWidth: { control: 'select', options: lengthPresets },
        markHeight: { control: 'select', options: lengthPresets },
        rowGap: { control: 'select', options: lengthPresets },
        columnGap: { control: 'select', options: lengthPresets },
    },
};
export default meta;
type Story = StoryObj<typeof meta>;

// ── data ──────────────────────────────────────────────────────────────────────

const N = 300;
const xs = Array.from({ length: N }, (_, i) => (i / (N - 1)) * 2 * Math.PI);
const sinYs = xs.map(Math.sin);
const cosYs = xs.map(Math.cos);

const scales: Map<string, ScaleSpec> = new Map([
    ['x', { scale: linear([0, 2 * Math.PI], [0, 1], { label: 'x' }), size: '300px' }],
    ['y', { scale: linear([-1.2, 1.2], [0, 1], { label: 'y' }), size: '200px' }],
]);

// ── shared decorator ──────────────────────────────────────────────────────────

function darkBg(Story: React.ComponentType) {
    return <div style={{ background: '#1a1a1a', padding: 16 }}><Story /></div>;
}

// ── stories ───────────────────────────────────────────────────────────────────

export const Default = {
    parameters: {
        docs: {
            description: {
                story: `
- The legend should show two entries, "sin(x)" and "cos(x)", each with a mark matching
  the corresponding line's stroke color.
- Lines without a \`label\` (none here) would be omitted from the legend.
`,
            },
        },
    },
    args: { location: 'upper right' as const },
    decorators: [(Story) => darkBg(Story)],
    render: (args) => (
        <Figure scales={scales} colorScheme="dark">
            <Plot xaxis="x" yaxis="y">
                <Plot.Clip>
                    <PlotLine xs={xs} ys={sinYs} label="sin(x)" />
                    <PlotLine xs={xs} ys={cosYs} style={{ stroke: 'steelblue' }} label="cos(x)" />
                </Plot.Clip>
                <PlotLegend {...args} />
            </Plot>
        </Figure>
    ),
} satisfies Story;

export const Locations = {
    parameters: {
        docs: {
            description: {
                story: `
Use the \`location\` control to move the legend between the nine anchor points
('upper'/'center'/'lower' × 'left'/'center'/'right').

- The legend box should stay \`margin\` pixels from the corresponding plot edges
  (or centered, for 'center' anchors) regardless of which corner is selected.
`,
            },
        },
    },
    args: { location: 'lower left' as const },
    decorators: [(Story) => darkBg(Story)],
    render: (args) => (
        <Figure scales={scales} colorScheme="dark">
            <Plot xaxis="x" yaxis="y">
                <Plot.Clip>
                    <PlotLine xs={xs} ys={sinYs} label="sin(x)" />
                    <PlotLine xs={xs} ys={cosYs} style={{ stroke: 'steelblue' }} label="cos(x)" />
                </Plot.Clip>
                <PlotLegend {...args} />
            </Plot>
        </Figure>
    ),
} satisfies Story;

export const UnlabeledSeries = {
    parameters: {
        docs: {
            description: {
                story: `
A mix of labeled and unlabeled lines.

- Only "sin(x)" should appear in the legend — the unlabeled cosine curve is filtered out.
`,
            },
        },
    },
    args: { location: 'upper right' as const },
    decorators: [(Story) => darkBg(Story)],
    render: (args) => (
        <Figure scales={scales} colorScheme="dark">
            <Plot xaxis="x" yaxis="y">
                <Plot.Clip>
                    <PlotLine xs={xs} ys={sinYs} label="sin(x)" />
                    <PlotLine xs={xs} ys={cosYs} style={{ stroke: 'steelblue' }} />
                </Plot.Clip>
                <PlotLegend {...args} />
            </Plot>
        </Figure>
    ),
} satisfies Story;

export const Sizing = {
    parameters: {
        docs: {
            description: {
                story: `
Use the Controls panel to explore \`margin\`, \`padding\`, \`markWidth\`, \`markHeight\`,
\`rowGap\`, and \`columnGap\` interactively.

- \`margin\` — gap between the legend box and the plot edge.
- \`padding\` — gap between the legend box border and its contents.
- \`markWidth\` / \`markHeight\` — size of each entry's line-sample mark.
- \`rowGap\` — vertical gap between entries.
- \`columnGap\` — horizontal gap between a mark and its label.
`,
            },
        },
    },
    args: {
        location: 'upper right' as const,
        margin: '10px',
        padding: '10px',
        markWidth: '20px',
        markHeight: '5px',
        rowGap: '10px',
        columnGap: '10px',
    },
    decorators: [(Story) => darkBg(Story)],
    render: (args) => (
        <Figure scales={scales} colorScheme="dark">
            <Plot xaxis="x" yaxis="y">
                <Plot.Clip>
                    <PlotLine xs={xs} ys={sinYs} label="sin(x)" />
                    <PlotLine xs={xs} ys={cosYs} style={{ stroke: 'steelblue' }} label="cos(x)" />
                </Plot.Clip>
                <PlotLegend {...args} />
            </Plot>
        </Figure>
    ),
} satisfies Story;
