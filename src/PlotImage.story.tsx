import type { Meta, StoryObj } from '@storybook/react';
import { interpolateMagma } from 'd3-scale-chromatic';

import { Figure, Plot, PlotImage, Colorbar, Scalebar } from '.';
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

export const WithScalebar: Story = {
    parameters: {
        docs: {
            description: {
                story: `
PlotImage with a Colorbar on the left and a Scalebar overlay (bottom-right of the plot).

- At the initial zoom, the plot spans 10 m; verify the Scalebar shows a sensible SI value
  (e.g. "1 m" or "2 m") at roughly 10–50% of the plot width.
- Zoom in ~10× and verify the Scalebar label changes prefix (e.g. "1 m" → "10 cm" or similar).
- Zoom back out and verify the prefix switches the other way without getting stuck.
- The Colorbar should not move or resize during zoom — it is tied to the data range, not the view.
`,
            },
        },
    },
    args: { scales },
    render: (args) => (
        <Figure {...args} debug>
            <Decorated left={<Colorbar scale="color" />}>
                <Plot xaxis="x" yaxis="y" zoom>
                    <Plot.Clip>
                        <PlotImage img={pixelValues} width={N} height={N} scale="color" />
                    </Plot.Clip>
                    <Scalebar unit="m" unitScale={1e-9} />
                </Plot>
            </Decorated>
        </Figure>
    ),
};

export const Autoscale: Story = {
    parameters: {
        docs: {
            description: {
                story: `
Color scale domain starts wrong ([0, 1]) but data ranges 0–90.

- On load, autoscaling should immediately update the domain to [0, 90]; verify the colormap
  spans the full data range rather than saturating at the top-right corner.
- The Colorbar (rendered via \`Plot.colorbar\`) should reflect the corrected [0, 90] range.
`,
            },
        },
    },
    args: { scales: autoscaleScales },
    render: (args) => (
        <Figure {...args} debug>
            <Plot xaxis="x" yaxis="y" colorbar="color" zoom>
                <Plot.Clip>
                    <PlotImage img={autoscaleData} width={N} height={N} scale="color" />
                </Plot.Clip>
            </Plot>
        </Figure>
    ),
};


export const Colorbars: Story = {
    parameters: {
        docs: {
            description: {
                story: `
PlotImage with Colorbars on all four sides.

- Left/right Colorbars should be oriented vertically; top/bottom horizontally.
- Zoom the image (scroll wheel) and verify the Colorbars do **not** zoom — they show the
  data range [0, 1], not the view range.
- The four corner regions between Colorbars will be empty (Decorated corner behaviour).
`,
            },
        },
    },
    args: { scales },
    render: (args) => (
        <Figure {...args} debug>
            <Decorated left={<Colorbar scale="color" />} right={<Colorbar scale="color" />} top={<Colorbar scale="color" />} bottom={<Colorbar scale="color" />}>
                <Plot xaxis="x" yaxis="y" zoom>
                    <Plot.Clip>
                        <PlotImage img={pixelValues} width={N} height={N} scale="color" />
                    </Plot.Clip>
                </Plot>
            </Decorated>
        </Figure>
    ),
};