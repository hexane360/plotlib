import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { color } from 'd3-color';
import { interpolateMagma } from 'd3-scale-chromatic';

import { Figure, Plot, PlotImage } from '.';
import { linear } from './scale';
import type { ColorLike, NumericScale } from './scale';
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

function drawImage(ctx: CanvasRenderingContext2D, data: ImageData, scale: NumericScale<ColorLike>) {
    const pixels = data.data;
    for (let row = 0; row < N; row++) {
        for (let col = 0; col < N; col++) {
            const c = color(scale.transform(pixelValues[row][col]) as string)!.rgb();
            const idx = (row * N + col) * 4;
            pixels[idx    ] = c.r;
            pixels[idx + 1] = c.g;
            pixels[idx + 2] = c.b;
            pixels[idx + 3] = 255;
        }
    }
    ctx.putImageData(data, 0, 0);
}

const scales: Map<string, ScaleSpec> = new Map([
    ['x', { scale: linear([0.0, 10.0], undefined, { label: 'x' }), size: '300px' }],
    ['y', { scale: linear([0.0, 10.0], undefined, { label: 'y' }), size: '300px' }],
    ['color', {
        scale: linear([0.0, 1.0], interpolateMagma),
        autoscale_min: false,
        autoscale_max: false,
    }],
]);

export const Magma: Story = {
    args: { scales },
    render: (args) => (
        <Figure {...args}>
            <Plot xaxis="x" yaxis="y" zoom>
                <Plot.Clip>
                    <PlotImage
                        img={drawImage}
                        width={N}
                        height={N}
                        scale="color"
                    />
                </Plot.Clip>
            </Plot>
        </Figure>
    ),
};
