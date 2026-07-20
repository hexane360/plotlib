import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { vi, expect } from 'vitest';

import { Figure, Plot, PlotLine, layout } from '.';
import type { ScaleSpec } from './Figure';
import { linear } from './scale';
import type { JustifyItems, AlignItems } from './layout/types';

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
                <layout.Constrained width="100%" height="100%" debug>
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
            <layout.Constrained width="100%" height="100%" debug>
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
                <Figure scales={scales} colorScheme="dark" width="100%" height="100%" toolbar={false} debug>
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
                <Figure scales={scales} colorScheme="dark" width="100%" height="100%" toolbar={false} debug>
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

// ── Grid position tests ───────────────────────────────────────────────────────
//
// Fixed geometry: 400×300 container, n_cols=2, justifyContent/alignContent='center', no gap.
//
//   Box sizes:  A=90×50  B=70×80  C=60×40  D=80×60
//
//   Track sizes (max per track):
//     col0 = max(A.w=90, C.w=60) = 90   col1 = max(B.w=70, D.w=80) = 80
//     row0 = max(A.h=50, B.h=80) = 80   row1 = max(C.h=40, D.h=60) = 60
//
//   Center distribution (no gap):
//     col_space = (400 - 90 - 80) / 2 = 115   row_space = (300 - 80 - 60) / 2 = 80
//
//   Cell origins:  A → (115,  80)  B → (205,  80)
//                  C → (115, 160)  D → (205, 160)
//
//   Slack inside each cell:
//     A: x_space=0,  y_space=30   B: x_space=10, y_space=0
//     C: x_space=30, y_space=20   D: x_space=0,  y_space=0  (fills cell exactly)
//
// For each justifyItems / alignItems combination the play function reads the SVG
// rect attributes and compares them to analytically computed expected values.

function TestBox({ id, width, height, fill }: { id: string, width: number, height: number, fill: string }) {
    const parent = layout.useParent();
    const [w, h, x, y] = [parent.width, parent.height, parent.x, parent.y].map(
        e => layout.useExprValue(e, [e])
    );
    layout.useConstraints(() => [
        new layout.Constraint(parent.width,  layout.Operator.Eq, width,  layout.Strength.strong),
        new layout.Constraint(parent.height, layout.Operator.Eq, height, layout.Strength.strong),
    ], [parent.width, parent.height, width, height]);
    return (
        <g data-testid={id}>
            <rect x={x} y={y} width={w} height={h} fill={fill} />
        </g>
    );
}

function readRect(root: HTMLElement, id: string) {
    const rect = root.querySelector<SVGRectElement>(`[data-testid="${id}"] rect`);
    if (!rect) throw new Error(`TestBox "${id}" not found`);
    return {
        x: parseFloat(rect.getAttribute('x') ?? '0'),
        y: parseFloat(rect.getAttribute('y') ?? '0'),
        w: parseFloat(rect.getAttribute('width') ?? '0'),
        h: parseFloat(rect.getAttribute('height') ?? '0'),
    };
}

// Cell geometry constants
const CELLS = {
    A: { cx: 115, cy:  80, xs:  0, ys: 30, bw: 90, bh: 50 },
    B: { cx: 205, cy:  80, xs: 10, ys:  0, bw: 70, bh: 80 },
    C: { cx: 115, cy: 160, xs: 30, ys: 20, bw: 60, bh: 40 },
    D: { cx: 205, cy: 160, xs:  0, ys:  0, bw: 80, bh: 60 },
} as const;

function xOff(ji: JustifyItems, xs: number) {
    return ji === 'start' ? 0 : ji === 'center' ? xs / 2 : xs;
}
function yOff(ai: AlignItems, ys: number) {
    return ai === 'start' ? 0 : ai === 'center' ? ys / 2 : ys;
}

function makeItemAlignStory(justifyItems: JustifyItems, alignItems: AlignItems): Story {
    return {
        name: `ItemAlign ${justifyItems}/${alignItems}`,
        render: () => (
            <layout.Constrained width="400px" height="300px" debug>
                <layout.Grid n_cols={2} justifyContent="center" alignContent="center"
                    justifyItems={justifyItems} alignItems={alignItems}>
                    <TestBox id="A" width={90} height={50} fill={COLORS[0]} />
                    <TestBox id="B" width={70} height={80} fill={COLORS[1]} />
                    <TestBox id="C" width={60} height={40} fill={COLORS[2]} />
                    <TestBox id="D" width={80} height={60} fill={COLORS[3]} />
                </layout.Grid>
            </layout.Constrained>
        ),
        play: async ({ canvasElement }) => {
            // Wait for the Cassowary solver to settle (debounced via setTimeout(0))
            await vi.waitFor(() => {
                const d = readRect(canvasElement, 'D');
                expect(d.x).toBeCloseTo(205, 0);
                expect(d.y).toBeCloseTo(160, 0);
            }, { timeout: 2000 });

            for (const [id, cell] of Object.entries(CELLS) as [keyof typeof CELLS, typeof CELLS[keyof typeof CELLS]][]) {
                const box = readRect(canvasElement, id);
                expect(box.x, `${id}.x`).toBeCloseTo(cell.cx + xOff(justifyItems, cell.xs), 0);
                expect(box.y, `${id}.y`).toBeCloseTo(cell.cy + yOff(alignItems,   cell.ys), 0);
                expect(box.w, `${id}.w`).toBeCloseTo(cell.bw, 0);
                expect(box.h, `${id}.h`).toBeCloseTo(cell.bh, 0);
            }
        },
    };
}

// All 9 justifyItems × alignItems combinations
export const ItemAlign_start_start   = makeItemAlignStory('start',  'start');
export const ItemAlign_start_center  = makeItemAlignStory('start',  'center');
export const ItemAlign_start_end     = makeItemAlignStory('start',  'end');
export const ItemAlign_center_start  = makeItemAlignStory('center', 'start');
export const ItemAlign_center_center = makeItemAlignStory('center', 'center');
export const ItemAlign_center_end    = makeItemAlignStory('center', 'end');
export const ItemAlign_end_start     = makeItemAlignStory('end',    'start');
export const ItemAlign_end_center    = makeItemAlignStory('end',    'center');
export const ItemAlign_end_end       = makeItemAlignStory('end',    'end');
