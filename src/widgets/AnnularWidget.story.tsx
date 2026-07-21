import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { atom, PrimitiveAtom } from 'jotai';
import { useAtomValue } from 'jotai/react';

import { Figure, Plot, PlotLine, AnnularWidget } from '..';
import type { ScaleSpec } from '../Figure';
import { linear } from '../scale';
import type { Point } from '.';

const meta: Meta<typeof Figure> = {
    component: Figure,
    title: "widgets/AnnularWidget",
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

/** Reads `centerAtom`/`innerAtom`/`outerAtom` and renders their current values. */
function AnnularReadout(
    { centerAtom, innerAtom, outerAtom }:
    { centerAtom: PrimitiveAtom<Point>, innerAtom: PrimitiveAtom<number>, outerAtom: PrimitiveAtom<number> }
) {
    const [x, y] = useAtomValue(centerAtom);
    const inner = useAtomValue(innerAtom);
    const outer = useAtomValue(outerAtom);
    return <p style={{ fontFamily: 'monospace' }}>
        center: [{x.toFixed(3)}, {y.toFixed(3)}], inner: {inner.toFixed(3)}, outer: {outer.toFixed(3)}
    </p>;
}

// Each story gets its own atoms, so dragging in one doesn't affect the other.
const basicCenterAtom = atom<Point>([5.0, 0.0]);
const basicInnerAtom = atom<number>(0.8);
const basicOuterAtom = atom<number>(1.5);

export const Basic: Story = {
    parameters: {
        docs: {
            description: {
                story: `
An \`AnnularWidget\` bound to \`centerAtom\`/\`innerAtom\`/\`outerAtom\`.

- Drag the shaded ring (the band between the two radii) to **pan**: \`center\` moves
  by the drag delta. Dragging inside the empty hole does nothing — it's outside the
  shaded (and hit-tested) region.
- Drag the inner or outer handle (both directly right of center) to **resize** the
  corresponding radius.
- Neither drag should start a pan/zoom gesture on the plot itself.
- The center "+" and both handles stay a constant screen size while zooming; the
  ring's radii are real data-space extents, so they scale with the zoom level.
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
                        <AnnularWidget center={basicCenterAtom} innerRadius={basicInnerAtom} outerRadius={basicOuterAtom} />
                    </Plot.Clip>
                </Plot>
            </Figure>
            <AnnularReadout centerAtom={basicCenterAtom} innerAtom={basicInnerAtom} outerAtom={basicOuterAtom} />
        </div>
    ),
};

const minGapCenterAtom = atom<Point>([5.0, 0.0]);
const minGapInnerAtom = atom<number>(0.8);
const minGapOuterAtom = atom<number>(1.5);

export const MinGap: Story = {
    parameters: {
        docs: {
            description: {
                story: `
Same as "Basic", but \`minGap={0.3}\`: dragging either handle toward the other should
stop \`outer - inner\` from shrinking below \`0.3\` rather than letting the radii cross.
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
                        <AnnularWidget center={minGapCenterAtom} innerRadius={minGapInnerAtom} outerRadius={minGapOuterAtom} minGap={0.3} />
                    </Plot.Clip>
                </Plot>
            </Figure>
            <AnnularReadout centerAtom={minGapCenterAtom} innerAtom={minGapInnerAtom} outerAtom={minGapOuterAtom} />
        </div>
    ),
};
