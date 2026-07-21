import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { atom, PrimitiveAtom } from 'jotai';
import { useAtomValue } from 'jotai/react';

import { Figure, Plot, PlotLine, RectangleWidget } from '..';
import type { ScaleSpec } from '../Figure';
import { linear } from '../scale';
import type { Point } from '.';

const meta: Meta<typeof Figure> = {
    component: Figure,
    title: "widgets/RectangleWidget",
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

/** Reads `minAtom`/`maxAtom` and renders their current values. */
function RectReadout({ minAtom, maxAtom }: { minAtom: PrimitiveAtom<Point>, maxAtom: PrimitiveAtom<Point> }) {
    const [minX, minY] = useAtomValue(minAtom);
    const [maxX, maxY] = useAtomValue(maxAtom);
    return <p style={{ fontFamily: 'monospace' }}>
        min: [{minX.toFixed(3)}, {minY.toFixed(3)}], max: [{maxX.toFixed(3)}, {maxY.toFixed(3)}]
    </p>;
}

// Each story gets its own atoms, so dragging in one doesn't affect the other.
const basicMinAtom = atom<Point>([3.0, -0.5]);
const basicMaxAtom = atom<Point>([6.0, 0.8]);

export const Basic: Story = {
    parameters: {
        docs: {
            description: {
                story: `
A \`RectangleWidget\` bound to \`minAtom\`/\`maxAtom\`. Unlike the other widgets, it has
no visible handle chrome — only the shaded \`<rect>\` body.

- Drag inside the body to **pan**: both corners move together by the drag delta.
- Drag near a corner (invisible hit target) to resize both of that corner's
  coordinates; drag near an edge to resize just one.
- The rectangle can shrink but not collapse or invert — dragging a corner/edge past
  the opposite bound stops at zero width/height (\`minWidth\`/\`minHeight\` default \`0\`).
- None of the 8 hit targets should start a pan/zoom gesture on the plot itself.
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
                        <RectangleWidget min={basicMinAtom} max={basicMaxAtom} />
                    </Plot.Clip>
                </Plot>
            </Figure>
            <RectReadout minAtom={basicMinAtom} maxAtom={basicMaxAtom} />
        </div>
    ),
};

const minSizeMinAtom = atom<Point>([3.0, -0.5]);
const minSizeMaxAtom = atom<Point>([6.0, 0.8]);

export const MinSize: Story = {
    parameters: {
        docs: {
            description: {
                story: `
Same as "Basic", but \`minWidth={1.0}\`/\`minHeight={0.3}\`: dragging a corner or edge
past the opposite bound should stop at that minimum size rather than collapsing the
rectangle further.
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
                        <RectangleWidget min={minSizeMinAtom} max={minSizeMaxAtom} minWidth={1.0} minHeight={0.3} />
                    </Plot.Clip>
                </Plot>
            </Figure>
            <RectReadout minAtom={minSizeMinAtom} maxAtom={minSizeMaxAtom} />
        </div>
    ),
};
