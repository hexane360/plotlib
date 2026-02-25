import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { Figure, Plot, PlotLine, layout } from '.';
import { linear } from './scale';
import type { SpatialAxisSpec } from './Figure';

const meta: Meta<typeof Figure> = {
    component: Figure,
    title: "Figure",
};
export default meta;

type Story = StoryObj<typeof meta>;

// --- data ---

const N = 300;
const xs = Array.from({ length: N }, (_, i) => (i / (N - 1)) * 2 * Math.PI);
const sinYs = xs.map(Math.sin);
const cosYs = xs.map(Math.cos);

// --- scales ---

const linearScales: Map<string, SpatialAxisSpec> = new Map([
    ['x', { scale: linear([0, 2 * Math.PI], [0, 1], { label: 'x' }), size: '300px' }],
    ['y', { scale: linear([-1.2, 1.2], [0, 1], { label: 'y' }), size: '200px' }],
]);

// --- stories ---

export const SingleLine = {
    args: {
        scales: linearScales,
    },
    render: (args, ctx) => (
        <Figure {...args}>
            <Plot xaxis="x" yaxis="y" zoom>
                <Plot.Clip>
                    <PlotLine xs={xs} ys={sinYs} />
                </Plot.Clip>
            </Plot>
        </Figure>
    ),
} satisfies Story;

export const TwoLines = {
    args: {
        scales: linearScales,
    },
    render: (args, ctx) => (
        <Figure {...args}>
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
    args: {
        scales: new Map([
            ['x1', { scale: linear([0, 2 * Math.PI], [0, 1], { show: 'one' }), size: '200px' }],
            ['x2', { scale: linear([0, 2 * Math.PI], [0, 1], { show: 'one' }), size: '200px' }],
            ['y',  { scale: linear([-1.2, 1.2], [0, 1], { show: 'one' }), size: '150px' }],
        ]),
    },
    render: (args, ctx) => (
        <Figure {...args}>
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
