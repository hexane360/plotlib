import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { interpolateMagma } from 'd3-scale-chromatic';

import { Figure, Plot, PlotImage, Colorbar } from '.';
import { Decorated } from './layout';
import { linear } from './scale';
import type { ScaleSpec } from './Figure';

const meta: Meta<typeof Figure> = {
    component: Figure,
    title: "PlotImage",
};
export default meta;

type Story = StoryObj<typeof meta>;

const N = 10;

// 10x10 array of values in [0, 1]: diagonal gradient
const pixelValues: number[][] = Array.from({ length: N }, (_, row) =>
    Array.from({ length: N }, (_, col) => (col + row) / (2 * (N - 1)))
);

const scales: Map<string, ScaleSpec> = new Map([
    ['x', { scale: linear([0.0, 10.0], undefined, { label: 'x' }), size: '300px' }],
    ['y', { scale: linear([0.0, 10.0], undefined, { label: 'y' }), size: '300px' }],
    ['color', {
        scale: linear([0.0, 1.0], interpolateMagma, { label: "test" }),
        autoscale_min: false,
        autoscale_max: false,
    }],
]);

export const Magma: Story = {
    args: { scales },
    render: (args) => (
        <Figure {...args}>
            <Decorated left={<Colorbar scale="color" />} right={<Colorbar scale="color" />} top={<Colorbar scale="color" />} bottom={<Colorbar scale="color" />}>
                <Plot xaxis="x" yaxis="y" zoom>
                    <Plot.Clip>
                        <PlotImage
                            img={pixelValues}
                            width={N}
                            height={N}
                            scale="color"
                        />
                    </Plot.Clip>
                </Plot>
            </Decorated>
        </Figure>
    ),
};

// 10x10 array with values outside [0, 1] to exercise autoscaling
const autoscaleData: number[][] = Array.from({ length: N }, (_, row) =>
    Array.from({ length: N }, (_, col) => (col + row) * 5.0)  // 0..90
);

const autoscaleScales: Map<string, ScaleSpec> = new Map([
    ['x', { scale: linear([0.0, 10.0], undefined, { label: 'x' }), size: '300px' }],
    ['y', { scale: linear([0.0, 10.0], undefined, { label: 'y' }), size: '300px' }],
    // Initial domain [0, 1] is intentionally wrong; autoscaling updates it to [0, 90]
    ['color', { scale: linear([0.0, 1.0], interpolateMagma, { label: 'color' }) }],
]);

export const Autoscale: Story = {
    args: { scales: autoscaleScales },
    render: (args) => (
        <Figure {...args}>
                <Plot xaxis="x" yaxis="y" colorbar="color" zoom>
                    <Plot.Clip>
                        <PlotImage
                            img={autoscaleData}
                            width={N}
                            height={N}
                            scale="color"
                        />
                    </Plot.Clip>
                </Plot>
        </Figure>
    ),
};
