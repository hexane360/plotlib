import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { atom, PrimitiveAtom } from 'jotai';
import { useAtomValue } from 'jotai/react';

import { Figure, Plot, PlotLine, PointWidget } from '..';
import type { ScaleSpec } from '../Figure';
import { linear } from '../scale';
import type { Point } from '.';

const meta: Meta<typeof Figure> = {
    component: Figure,
    title: "widgets/PointWidget",
};
export default meta;

type Story = StoryObj<typeof meta>;

// ── data ──────────────────────────────────────────────────────────────────────

const N = 200;
const xs = Array.from({ length: N }, (_, i) => (i / (N - 1)) * 10.0);
const ys = xs.map(x => Math.sin(x));

const scales: Map<string, ScaleSpec> = new Map([
    ['x', { scale: linear([0.0, 10.0], undefined, { label: 'x' }), size: '400px' }],
    ['y', { scale: linear([-1.5, 1.5], undefined, { label: 'y' }), size: '300px' }],
]);

/** Reads `pointAtom` and renders its current value, to show the widget is controlled by the atom. */
function PositionReadout({ pointAtom }: { pointAtom: PrimitiveAtom<Point> }) {
    const [x, y] = useAtomValue(pointAtom);
    return <p style={{ fontFamily: 'monospace' }}>position: [{x.toFixed(3)}, {y.toFixed(3)}]</p>;
}

// Each story gets its own atom, so dragging in one doesn't affect the other.
const basicPointAtom = atom<Point>([5.0, 0.0]);
const clampedPointAtom = atom<Point>([5.0, 0.0]);

export const Basic: Story = {
    parameters: {
        docs: {
            description: {
                story: `
A \`PointWidget\` bound to \`pointAtom\`, dragged with either mouse or touch.

- Drag the handle; the readout below the plot should track the atom's live value.
- The handle should stay a constant screen size while zooming, and should never
  start a pan/zoom gesture when dragged (it lives inside \`Plot.Clip\`, ahead of
  the plot's own pan listener in the bubble phase).
- Pan/zoom the plot itself (drag/scroll elsewhere); the handle should track the
  underlying data point through the transform, since it renders in base-scale
  pixels inside the zoom group.
`,
            },
        },
    },
    args: { scales },
    render: (args) => (
        <div>
            <Figure {...args} debug>
                <Plot xaxis="x" yaxis="y" zoom>
                    <Plot.Clip>
                        <PlotLine xs={xs} ys={ys} />
                        <PointWidget position={basicPointAtom} />
                    </Plot.Clip>
                </Plot>
            </Figure>
            <PositionReadout pointAtom={basicPointAtom} />
        </div>
    ),
};

export const ClampedToDomain: Story = {
    parameters: {
        docs: {
            description: {
                story: `
Same as "Basic", but the point can be dragged outside the visible plot area and the
underlying data value should still clamp to each axis's domain (\`clampToDomain\`
defaults to \`true\`) rather than following the cursor unbounded.
`,
            },
        },
    },
    args: { scales },
    render: (args) => (
        <div>
            <Figure {...args} debug>
                <Plot xaxis="x" yaxis="y" zoom>
                    <Plot.Clip>
                        <PlotLine xs={xs} ys={ys} />
                        <PointWidget position={clampedPointAtom} r={10.0} />
                    </Plot.Clip>
                </Plot>
            </Figure>
            <PositionReadout pointAtom={clampedPointAtom} />
        </div>
    ),
};
