import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { Figure, Plot, PlotLine, layout } from '.';
import type { ScaleSpec } from './Figure';
import { linear } from './scale';

const meta: Meta<typeof layout.Grid> = {
    component: layout.Grid,
    title: 'Layout/Grid',
};
export default meta;
type Story = StoryObj<typeof meta>;

// ── helpers ───────────────────────────────────────────────────────────────────

const COLORS = ['#4e79a7', '#f28e2c', '#e15759', '#76b7b2', '#59a14f', '#edc949'];

function Box({
    fill = '#4e79a7', stroke, width, height, label, children,
}: {
    fill?: string, stroke?: string, width?: number, height?: number, label?: string,
    children?: React.ReactNode,
}) {
    const parent = layout.useParent();
    const [w, h, x, y] = [parent.width, parent.height, parent.x, parent.y].map(
        e => layout.useExprValue(e, [e])
    );
    layout.useConstraints(() => [
        ...(width  != null ? [new layout.Constraint(parent.width,  layout.Operator.Eq, width,  layout.Strength.strong)] : []),
        ...(height != null ? [new layout.Constraint(parent.height, layout.Operator.Eq, height, layout.Strength.strong)] : []),
    ], [parent.width, parent.height, width, height]);
    return <>
        <rect x={x} y={y} width={w} height={h} fill={fill} stroke={stroke ?? 'none'} />
        {label && <text x={x + w / 2} y={y + h / 2} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={11}>{label}</text>}
        {children}
    </>;
}

function Note({ children }: { children: React.ReactNode }) {
    return (
        <div style={{
            fontFamily: 'sans-serif', fontSize: 12, lineHeight: 1.5,
            background: '#f6f8fa', border: '1px solid #d0d7de',
            borderRadius: 6, padding: '8px 12px', marginBottom: 8,
            maxWidth: 520, color: '#24292f',
        }}>
            {children}
        </div>
    );
}

const resizableStyle: React.CSSProperties = {
    resize: 'both', overflow: 'hidden',
    border: '1px dashed #999',
    display: 'inline-block', boxSizing: 'border-box',
    paddingRight: 12, paddingBottom: 12,
};

// ── plot data ──────────────────────────────────────────────────────────────────

const N = 200;
const xs = Array.from({ length: N }, (_, i) => (i / (N - 1)) * 2 * Math.PI);
const sinYs  = xs.map(Math.sin);
const cosYs  = xs.map(Math.cos);
const sin2Ys = xs.map(x => Math.sin(2.0 * x));
const cos2Ys = xs.map(x => Math.cos(2.0 * x));

// ── stories ───────────────────────────────────────────────────────────────────

/**
 * Full Controls story — every Grid prop is wired to a Storybook control.
 * Uses six fixed-size boxes so spacing and alignment effects are clearly visible.
 */
export const Controls: Story = {
    argTypes: {
        n_cols: { control: { type: 'number', min: 1, max: 6, step: 1 } },
        justifyContent: {
            control: 'select',
            options: ['start', 'center', 'end', 'space-between', 'space-around', 'space-evenly'],
        },
        alignContent: {
            control: 'select',
            options: ['start', 'center', 'end', 'space-between', 'space-around', 'space-evenly'],
        },
        justifyItems: {
            control: 'select',
            options: ['start', 'center', 'end'],
        },
        alignItems: {
            control: 'select',
            options: ['start', 'center', 'end'],
        },
        rowGap: { control: { type: 'number', min: 0, max: 40 } },
        columnGap: { control: { type: 'number', min: 0, max: 40 } },
    },
    parameters: {
        docs: {
            description: {
                story: `
Use the Controls panel below to explore the full Grid API interactively.
Drag the dashed border to resize the container.

**\`justifyContent\` / \`alignContent\`** — distributes free space between column/row tracks.
- \`center\` (default): tracks bunch together in the middle.
- \`space-between\`: first/last tracks touch the edges, space is evenly distributed between them.
- \`space-around\`: each track gets equal space on both sides (edge space is half of interior space).
- \`space-evenly\`: all gaps — including outer margins — are equal.
- \`start\` / \`end\`: tracks are packed to one edge.

**\`justifyItems\` / \`alignItems\`** — aligns each item inside its grid cell.
Switch to \`start\` or \`end\` to anchor items to one side of the cell.

**\`n_cols\`** — reflows all children; try 1, 2, 3, 6.

**\`rowGap\` / \`columnGap\`** — fixed gap in pixels between tracks (independent of spacing mode).
`,
            },
        },
    },
    args: {
        n_cols: 3,
        justifyContent: 'center',
        alignContent: 'center',
        justifyItems: 'center',
        alignItems: 'center',
        rowGap: 8,
        columnGap: 8,
    },
    render: (args) => (
        <div>
            <Note>
                Six 80×50 px boxes in a resizable container. Use the Controls panel to explore all Grid props.
            </Note>
            <div style={{ ...resizableStyle, width: 420, height: 260 }}>
                <layout.Constrained width="100%" height="100%">
                    <Box fill="none" stroke="#ccc">
                        <layout.Grid {...args}>
                            {/* varied sizes so justifyItems/alignItems alignment is visible */}
                            <Box width={90} height={50} fill={COLORS[0]} label="A 90×50" />
                            <Box width={70} height={70} fill={COLORS[1]} label="B 70×70" />
                            <Box width={80} height={50} fill={COLORS[2]} label="C 80×50" />
                            <Box width={60} height={40} fill={COLORS[3]} label="D 60×40" />
                            <Box width={90} height={40} fill={COLORS[4]} label="E 90×40" />
                            <Box width={55} height={60} fill={COLORS[5]} label="F 55×60" />
                        </layout.Grid>
                    </Box>
                </layout.Constrained>
            </div>
        </div>
    ),
};

/**
 * Track sizing — items in the same column/row share a single kiwi Variable for
 * their track size. The solver sets it to the size needed by the largest item in
 * that track; smaller items receive the leftover as `justifyItems`/`alignItems` space.
 */
export const TrackSizing: Story = {
    parameters: {
        docs: {
            description: {
                story: `
Each column's width and each row's height is a single shared solver variable.
The solver drives it to the size of the widest/tallest item in that track.

- **Column 0**: contains 60 px and 100 px wide items — should settle at 100 px.
  The 60 px item gets 40 px of \`x_space\`, centred by default.
- **Row 0**: contains 50 px and 80 px tall items — should settle at 80 px.
`,
            },
        },
    },
    render: () => (
        <div style={{ ...resizableStyle, width: 420, height: 260 }}>
            <layout.Constrained width="100%" height="100%">
                <Box fill="none" stroke="#ccc">
                    <layout.Grid n_cols={3} justifyContent="center" alignContent="center" columnGap={12} rowGap={12}>
                        <Box width={60}  height={50} fill={COLORS[0]} label="60×50" />
                        <Box width={80}  height={80} fill={COLORS[1]} label="80×80" />
                        <Box width={80}  height={50} fill={COLORS[2]} label="80×50" />
                        <Box width={100} height={50} fill={COLORS[3]} label="100×50" />
                        <Box width={80}  height={50} fill={COLORS[4]} label="80×50" />
                        <Box width={80}  height={50} fill={COLORS[5]} label="80×50" />
                    </layout.Grid>
                </Box>
            </layout.Constrained>
        </div>
    ),
};

/**
 * Two plots sharing a y-axis in a 1×2 grid — the most common use case.
 */
export const SharedYAxis: Story = {
    parameters: {
        docs: {
            description: {
                story: `
Two plots in a single row; the shared y-axis (\`show: 'one'\`) appears once, on the
left of the left-hand panel only (col === 0).

- Zooming the y-axis on either plot (scroll without Shift) moves both simultaneously.
- The x-axes are independent — zooming one does not affect the other.
- Resize: both panels stay equal width and the y-axis remains pixel-aligned.
`,
            },
        },
    },
    render: () => {
        const scales: Map<string, ScaleSpec> = new Map([
            ['x1', { scale: linear([0, 2 * Math.PI], [0, 1], { show: 'one', label: 'x' }),  size: '1a' }],
            ['x2', { scale: linear([0, 2 * Math.PI], [0, 1], { show: 'one', label: 'x' }),  size: '1a' }],
            ['y',  { scale: linear([-1.2, 1.2],       [0, 1], { show: 'one', label: 'y' }), size: '150px' }],
        ]);
        return (
            <div style={{
                background: '#1a1a1a', padding: 16,
                ...resizableStyle, width: 520, height: 220,
                border: '1px dashed #555',
            }}>
                <Figure scales={scales} colorScheme="dark" width="100%" height="100%" toolbar={false}>
                    <layout.Grid n_cols={2} columnGap={8}>
                        <Plot xaxis="x1" yaxis="y" zoom>
                            <Plot.Clip><PlotLine xs={xs} ys={sinYs} /></Plot.Clip>
                        </Plot>
                        <Plot xaxis="x2" yaxis="y" zoom>
                            <Plot.Clip><PlotLine xs={xs} ys={cosYs} /></Plot.Clip>
                        </Plot>
                    </layout.Grid>
                </Figure>
            </div>
        );
    },
};

/**
 * 2×2 multi-panel figure with per-column shared x-axes and per-row shared y-axes.
 *
 * show: 'one' placement:
 *   x (bottom): shows only in the last row  → bottom row only
 *   y (left):   shows only in col 0         → left column only
 */
export const MultiPanel: Story = {
    parameters: {
        docs: {
            description: {
                story: `
2×2 grid. Columns share an x-axis; rows share a y-axis. \`show: 'one'\` suppresses
redundant decorations so each axis appears exactly once.

Expected layout:
- x-axis labels appear only along the **bottom row** (rows 0 hides its x-axis).
- y-axis labels appear only along the **left column** (col 1 hides its y-axis).
- Zooming y on any panel in a row moves the shared y-axis for that row only.
- Zooming x on any panel in a column moves the shared x-axis for that column only.
- Resize: all four panels stay equal-sized with perfect axis alignment.
`,
            },
        },
    },
    render: () => {
        const scales: Map<string, ScaleSpec> = new Map([
            ['x1', { scale: linear([0, 2 * Math.PI], [0, 1], { show: 'one', label: 'x' }),  size: '1a' }],
            ['x2', { scale: linear([0, 2 * Math.PI], [0, 1], { show: 'one', label: 'x' }),  size: '1a' }],
            ['y1', { scale: linear([-1.2, 1.2],       [0, 1], { show: 'one', label: 'y' }), size: '1a' }],
            ['y2', { scale: linear([-1.2, 1.2],       [0, 1], { show: 'one', label: 'y' }), size: '1a' }],
        ]);
        return (
            <div style={{
                background: '#1a1a1a', padding: 16,
                ...resizableStyle, width: 520, height: 380,
                border: '1px dashed #555',
            }}>
                <Figure scales={scales} colorScheme="dark" width="100%" height="100%" toolbar={false}>
                    <layout.Grid n_cols={2} columnGap={8} rowGap={8}>
                        <Plot xaxis="x1" yaxis="y1" zoom>
                            <Plot.Clip><PlotLine xs={xs} ys={sinYs} /></Plot.Clip>
                        </Plot>
                        <Plot xaxis="x2" yaxis="y1" zoom>
                            <Plot.Clip><PlotLine xs={xs} ys={cosYs} /></Plot.Clip>
                        </Plot>
                        <Plot xaxis="x1" yaxis="y2" zoom>
                            <Plot.Clip><PlotLine xs={xs} ys={sin2Ys} /></Plot.Clip>
                        </Plot>
                        <Plot xaxis="x2" yaxis="y2" zoom>
                            <Plot.Clip><PlotLine xs={xs} ys={cos2Ys} /></Plot.Clip>
                        </Plot>
                    </layout.Grid>
                </Figure>
            </div>
        );
    },
};
