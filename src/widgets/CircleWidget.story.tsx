import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { atom, PrimitiveAtom } from 'jotai';
import { useAtomValue } from 'jotai/react';

import { Figure, Plot, PlotLine, CircleWidget } from '..';
import type { ScaleSpec } from '../Figure';
import { linear } from '../scale';
import type { Point } from '.';

const meta: Meta<typeof Figure> = {
    component: Figure,
    title: "widgets/CircleWidget",
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

/** Reads `centerAtom`/`radiusAtom` and renders their current values. */
function CircleReadout({ centerAtom, radiusAtom }: { centerAtom: PrimitiveAtom<Point>, radiusAtom: PrimitiveAtom<number> }) {
    const [x, y] = useAtomValue(centerAtom);
    const radius = useAtomValue(radiusAtom);
    return <p style={{ fontFamily: 'monospace' }}>center: [{x.toFixed(3)}, {y.toFixed(3)}], radius: {radius.toFixed(3)}</p>;
}

// Each story gets its own atoms, so dragging in one doesn't affect the other.
const basicCenterAtom = atom<Point>([5.0, 0.0]);
const basicRadiusAtom = atom<number>(1.5);

export const Basic: Story = {
    parameters: {
        docs: {
            description: {
                story: `
A \`CircleWidget\` bound to \`centerAtom\`/\`radiusAtom\`.

- Drag anywhere inside the filled body to **pan**: \`center\` moves by the drag delta.
- Drag the small ring handle (always directly right of center) to **resize**:
  \`radius\` becomes the pointer's x-distance from \`center\`.
- Neither drag should start a pan/zoom gesture on the plot itself.
- The center "+" and the handle ring stay a constant screen size while zooming;
  the body's radius is a real data-space extent, so it scales with the zoom level.
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
                        <CircleWidget center={basicCenterAtom} radius={basicRadiusAtom} />
                    </Plot.Clip>
                </Plot>
            </Figure>
            <CircleReadout centerAtom={basicCenterAtom} radiusAtom={basicRadiusAtom} />
        </div>
    ),
};

const minRadiusCenterAtom = atom<Point>([5.0, 0.0]);
const minRadiusRadiusAtom = atom<number>(1.5);

export const MinRadius: Story = {
    parameters: {
        docs: {
            description: {
                story: `
Same as "Basic", but \`minRadius={0.5}\`: dragging the handle past the center (or to
its left) should stop shrinking the circle at radius \`0.5\` rather than collapsing
it or going negative.
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
                        <CircleWidget center={minRadiusCenterAtom} radius={minRadiusRadiusAtom} minRadius={0.5} />
                    </Plot.Clip>
                </Plot>
            </Figure>
            <CircleReadout centerAtom={minRadiusCenterAtom} radiusAtom={minRadiusRadiusAtom} />
        </div>
    ),
};
