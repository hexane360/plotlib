import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { Figure, Plot, PlotLine, layout } from '@hexane/plotlib';
import type { AxisSpec } from '@hexane/plotlib';

const meta: Meta = {
    title: 'Figure',
};
export default meta;

type Story = StoryObj<typeof Figure>;

// --- data ---

const N = 300;
const xs = Array.from({ length: N }, (_, i) => (i / (N - 1)) * 2 * Math.PI);
const sinYs = xs.map(Math.sin);
const cosYs = xs.map(Math.cos);

// --- axes ---

const linearAxes: Map<string, AxisSpec> = new Map([
    ['x', { domain: [0, 2 * Math.PI], size: '300px', label: 'x' }],
    ['y', { domain: [-1.2, 1.2], size: '200px', label: 'y' }],
]);

// --- stories ---

export const SingleLine: Story = {
    render: () => (
        <Figure axes={linearAxes} width="400px">
            <Plot xaxis="x" yaxis="y" zoom>
                <Plot.Clip>
                    <PlotLine xs={xs} ys={sinYs} />
                </Plot.Clip>
            </Plot>
        </Figure>
    ),
};

export const TwoLines: Story = {
    render: () => (
        <Figure axes={linearAxes} width="400px">
            <Plot xaxis="x" yaxis="y" zoom>
                <Plot.Clip>
                    <PlotLine xs={xs} ys={sinYs} />
                    <PlotLine xs={xs} ys={cosYs} style={{ stroke: 'steelblue' }} />
                </Plot.Clip>
            </Plot>
        </Figure>
    ),
};

export const Grid: Story = {
    render: () => {
        const gridAxes: Map<string, AxisSpec> = new Map([
            ['x1', { domain: [0, 2 * Math.PI], size: '200px', show: 'one' }],
            ['x2', { domain: [0, 2 * Math.PI], size: '200px', show: 'one' }],
            ['y', { domain: [-1.2, 1.2], size: '150px', show: 'one' }],
        ]);
        return (
            <Figure axes={gridAxes} width="500px">
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
        );
    },
};
