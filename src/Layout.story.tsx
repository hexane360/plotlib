import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, waitFor } from 'storybook/test';

import { layout, TextBox } from '.';

const meta: Meta<typeof layout.Constrained> = {
    component: layout.Constrained,
    title: 'Layout',
};
export default meta;
type Story = StoryObj<typeof meta>;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Coloured rect that fills its layout cell and optionally pins its size. */
function Box({
    fill = '#4e79a7', stroke, width, height, label, testid, children,
}: {
    fill?: string, stroke?: string, width?: number, height?: number,
    label?: string, testid?: string, children?: React.ReactNode,
}) {
    const parent = layout.useParent();
    const [w, h, x, y] = [parent.width, parent.height, parent.x, parent.y].map(
        e => layout.useExprValue(e, [e])
    );
    layout.useConstraints(() => [
        ...(width  != null ? [new layout.Constraint(parent.width,  layout.Operator.Eq, width,  layout.Strength.strong)] : []),
        ...(height != null ? [new layout.Constraint(parent.height, layout.Operator.Eq, height, layout.Strength.strong)] : []),
    ], [parent.width, parent.height, width, height]);

    const content = <>
        <rect x={x} y={y} width={w} height={h} fill={fill} stroke={stroke ?? 'none'} />
        {label && <text x={x + w / 2} y={y + h / 2} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={11}>{label}</text>}
        {children}
    </>;
    return testid ? <g data-testid={testid}>{content}</g> : content;
}

function readRect(root: HTMLElement, id: string) {
    const rect = root.querySelector<SVGRectElement>(`[data-testid="${id}"] rect`);
    if (!rect) throw new Error(`Box "${id}" not found`);
    return {
        x: parseFloat(rect.getAttribute('x') ?? '0'),
        y: parseFloat(rect.getAttribute('y') ?? '0'),
        w: parseFloat(rect.getAttribute('width') ?? '0'),
        h: parseFloat(rect.getAttribute('height') ?? '0'),
    };
}

/**
 * Box whose height is a fixed fraction of an outer container variable.
 * Used for proportional layout demos where box sizes should scale with the container.
 */
function FractionBox({
    fraction, outerHeight, fill, label,
}: {
    fraction: number,
    outerHeight: layout.Variable | layout.Expression,
    fill?: string, label?: string,
}) {
    const parent = layout.useParent();
    const [w, h, x, y] = [parent.width, parent.height, parent.x, parent.y].map(
        e => layout.useExprValue(e, [e])
    );
    layout.useConstraints(() => [
        new layout.Constraint(parent.height, layout.Operator.Eq, outerHeight.multiply(fraction), layout.Strength.strong),
    ], [parent.height, outerHeight, fraction]);

    return <>
        <rect x={x} y={y} width={w} height={h} fill={fill ?? '#4e79a7'} />
        {label && <text x={x + w / 2} y={y + h / 2} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={11}>{label}</text>}
    </>;
}

/** Wrapper that reads the outer container size and passes it to children for proportional sizing. */
function ProportionalColumn() {
    const parent = layout.useParent();
    return (
        <Box fill="none" stroke="#888">
            <layout.FlexBox flexDirection="column" justifyContent="space-evenly">
                <FractionBox fraction={1 / 3} outerHeight={parent.height} fill="#4e79a7" label="1/3" />
                <FractionBox fraction={1 / 3} outerHeight={parent.height} fill="#f28e2c" label="1/3" />
                <FractionBox fraction={1 / 3} outerHeight={parent.height} fill="#e15759" label="1/3" />
            </layout.FlexBox>
        </Box>
    );
}

/** Animating TextBox that rotates 10° every 500ms, matching examples/align-test.tsx. */
function AnimatingTextBox() {
    const parent = layout.useParent();
    const [rotation, setRotation] = React.useState(0);
    React.useEffect(() => {
        const id = setInterval(() => setRotation(r => (r + 10) % 360), 500);
        return () => clearInterval(id);
    }, []);
    const [w, h, x, y] = [parent.width, parent.height, parent.x, parent.y].map(
        e => layout.useExprValue(e, [e])
    );
    return <>
        <rect x={x} y={y} width={w} height={h} fill="#f4f4f4" stroke="#ccc" />
        <TextBox rotation={rotation} fill="#333">
            <tspan x="0">rotation: {rotation}°</tspan>
            <tspan x="0" dy="1.2em">watch me re-centre</tspan>
        </TextBox>
    </>;
}

/** Renders a note box above the story content in the Canvas. */
function Note({ children }: { children: React.ReactNode }) {
    return (
        <div style={{
            fontFamily: 'sans-serif', fontSize: 12, lineHeight: 1.5,
            background: '#f6f8fa', border: '1px solid #d0d7de',
            borderRadius: 6, padding: '8px 12px', marginBottom: 8,
            maxWidth: 500, color: '#24292f',
        }}>
            {children}
        </div>
    );
}

const resizableStyle: React.CSSProperties = {
    resize: 'both',
    overflow: 'hidden',
    border: '1px dashed #999',
    display: 'inline-block',
    boxSizing: 'border-box',
    paddingRight: 12,
    paddingBottom: 12,
};

// ── Stories ───────────────────────────────────────────────────────────────────

export const FlexBoxFixedWidth: Story = {
    render: () => (
        <div>
            <Note>
                Fixed-width children (80×60px). Drag the corner to resize.<br />
                Below ~368px the boxes should wrap to a second row, separated by rowGap.<br />
                The wrapped row's boxes stay evenly distributed (space-evenly), not left-aligned.
            </Note>
            <div style={{ ...resizableStyle, width: 420, height: 180 }}>
                <layout.Constrained width="100%" height="100%" debug>
                    <Box fill="none" stroke="#888">
                        <layout.FlexBox
                            flexDirection="row" justifyContent="space-evenly"
                            wrap={true} alignItems="center"
                            columnGap="1rem" rowGap="12pt"
                        >
                            <Box width={80} height={60} fill="#4e79a7" label="A" />
                            <Box width={80} height={60} fill="#f28e2c" label="B" />
                            <Box width={80} height={60} fill="#e15759" label="C" />
                            <Box width={80} height={60} fill="#76b7b2" label="D" />
                        </layout.FlexBox>
                    </Box>
                </layout.Constrained>
            </div>
        </div>
    ),
};

export const FlexBoxProportional: Story = {
    render: () => (
        <div>
            <Note>
                Proportional children: each box is constrained to 1/3 of the outer container height.<br />
                Drag the corner to resize — all three boxes should scale together, staying equal height.
            </Note>
            <div style={{ ...resizableStyle, width: 200, height: 300 }}>
                <layout.Constrained width="100%" height="100%" debug>
                    <ProportionalColumn />
                </layout.Constrained>
            </div>
        </div>
    ),
};

export const Margins: Story = {
    render: () => (
        <div>
            <Note>
                Gray = full container. Blue = inner content after margins (top:50 right:20 bottom:20 left:80).<br />
                Inner size starts at 300×180px. Drag the corner: margins stay fixed in px, blue region absorbs the change.
            </Note>
            <div style={{ ...resizableStyle, width: 400, height: 250 }}>
                <layout.Constrained width="100%" height="100%" debug>
                    <Box fill="#ddd" />
                    <layout.MarginBox top="50px" right="20px" bottom="20px" left="80px">
                        <Box fill="#4e79a7" label="top:50 right:20 bottom:20 left:80" />
                    </layout.MarginBox>
                </layout.Constrained>
            </div>
        </div>
    ),
};

export const Centered: Story = {
    render: () => (
        <div>
            <Note>
                Blue box (120×70px) stays centred at any container size. Drag the corner to verify.<br />
                Shrink below 120px wide: the box overflows — Centered has no minimum padding by default.
            </Note>
            <div style={{ ...resizableStyle, width: 400, height: 250 }}>
                <layout.Constrained width="100%" height="100%" debug>
                    <Box fill="#ddd" />
                    <layout.Centered>
                        <Box width={120} height={70} fill="#4e79a7" label="centered" />
                    </layout.Centered>
                </layout.Constrained>
            </div>
        </div>
    ),
};

export const DecoratedSides: Story = {
    render: () => (
        <div>
            <Note>
                Fixed-size side bands; blue center takes the remainder. Drag the corner to resize.<br />
                Left/right span only inner height (between top+bottom bands) — corners are empty.<br />
                Only the center region changes size when resized.
            </Note>
            <div style={{ ...resizableStyle, width: 420, height: 280 }}>
                <layout.Constrained width="100%" height="100%" debug>
                    <layout.Decorated
                        left={<Box fill="#e15759" width={60} label="left 60" />}
                        right={<Box fill="#76b7b2" width={40} label="right 40" />}
                        top={<Box fill="#59a14f" height={35} label="top 35" />}
                        bottom={<Box fill="#f28e2c" height={25} label="btm 25" />}
                    >
                        <Box fill="#4e79a7" label="center" />
                    </layout.Decorated>
                </layout.Constrained>
            </div>
        </div>
    ),
};

/**
 * `Centered` holds its padding as slack and donates it to the FlexBox as *free* space, rather
 * than pushing it into the FlexBox's allotment. So the FlexBox hugs its content (480px) while
 * `Centered` keeps the leftover 120px as symmetric padding.
 *
 * Both components hug here, in opposite directions over the same slack — the hug ladder is what
 * decides it. `Centered` sits one rung below the FlexBox it wraps, so collapsing the padding
 * (cost `h·60`) is cheaper than stretching the allotment (cost `2h·120`), and the padding keeps
 * the difference. Before the ladder this was a tie broken by pivot order, which is why
 * `Centered` had to be left un-hugged to get this result.
 */
export const FlexBoxHugsInsideCentered: Story = {
    render: () => (
        <div>
            <Note>
                Four 120px boxes (480px total) in a 600px container, inside a Centered.<br />
                The FlexBox should hug to 480px, leaving Centered 60px of padding on each side.
            </Note>
            <layout.Constrained width="600px" height="200px">
                <Box fill="#ddd" />
                <layout.Centered>
                    <layout.FlexBox flexDirection="row" wrap={true} alignItems="center">
                        <Box width={120} height={60} fill="#4e79a7" label="A" testid="A" />
                        <Box width={120} height={60} fill="#f28e2c" label="B" testid="B" />
                        <Box width={120} height={60} fill="#e15759" label="C" testid="C" />
                        <Box width={120} height={60} fill="#76b7b2" label="D" testid="D" />
                    </layout.FlexBox>
                </layout.Centered>
            </layout.Constrained>
        </div>
    ),
    play: async ({ canvasElement }) => {
        await waitFor(() => {
            expect(readRect(canvasElement, 'A').x).toBeCloseTo(60, 0);
        }, { timeout: 2000 });

        // content hugs to 480px and Centered keeps the remaining 120px as symmetric padding
        for (const [id, x] of [['A', 60], ['B', 180], ['C', 300], ['D', 420]] as const) {
            const box = readRect(canvasElement, id);
            expect(box.x, `${id}.x`).toBeCloseTo(x, 0);
            expect(box.w, `${id}.w`).toBeCloseTo(120, 0);
        }
        // single line — nothing wrapped, since 480px fits the 600px of room available
        const [a, d] = [readRect(canvasElement, 'A'), readRect(canvasElement, 'D')];
        expect(d.y).toBeCloseTo(a.y, 0);
        // the padding is non-zero and symmetric: Centered's hug lost, so it holds the slack
        const left = a.x, right = 600 - (d.x + d.w);
        expect(left, 'left padding').toBeCloseTo(right, 0);
        expect(left, 'left padding').toBeGreaterThan(0);
    },
};

/**
 * The reflow threshold is the *room* available (allotment + donated free space), not the
 * allotment the FlexBox has hugged itself down to. Four 200px boxes need 800px but only 600px
 * of room exists, so exactly three fit on the first line.
 *
 * If the threshold were the hugged allotment it would chase its own output — each wrap narrows
 * the content, which narrows the allotment, which triggers another wrap.
 */
export const FlexBoxWrapsAgainstDonatedSpace: Story = {
    render: () => (
        <div>
            <Note>
                Four 200px boxes (800px total) in a 600px container, inside a Centered.<br />
                Exactly three should fit on the first row; the fourth wraps and centres below.
            </Note>
            <layout.Constrained width="600px" height="240px">
                <Box fill="#ddd" />
                <layout.Centered>
                    <layout.FlexBox flexDirection="row" wrap={true} alignItems="center" rowGap="10px">
                        <Box width={200} height={60} fill="#4e79a7" label="A" testid="A" />
                        <Box width={200} height={60} fill="#f28e2c" label="B" testid="B" />
                        <Box width={200} height={60} fill="#e15759" label="C" testid="C" />
                        <Box width={200} height={60} fill="#76b7b2" label="D" testid="D" />
                    </layout.FlexBox>
                </layout.Centered>
            </layout.Constrained>
        </div>
    ),
    play: async ({ canvasElement }) => {
        await waitFor(() => {
            const [a, d] = [readRect(canvasElement, 'A'), readRect(canvasElement, 'D')];
            expect(d.y).toBeGreaterThan(a.y + 10);
        }, { timeout: 2000 });

        // three on the first row, exactly filling the 600px of room
        for (const [id, x] of [['A', 0], ['B', 200], ['C', 400]] as const) {
            expect(readRect(canvasElement, id).x, `${id}.x`).toBeCloseTo(x, 0);
        }
        const [a, b, c, d] = ['A', 'B', 'C', 'D'].map(id => readRect(canvasElement, id));
        expect(b.y, 'B.y').toBeCloseTo(a.y, 0);
        expect(c.y, 'C.y').toBeCloseTo(a.y, 0);
        // the fourth wrapped, and is centred on its own line
        expect(d.y, 'D.y').toBeGreaterThan(a.y);
        expect(d.x, 'D.x').toBeCloseTo(200, 0);
    },
};

/**
 * An unsized `Constrained` shrink-wraps its content. Its hug is the weakest rung on the ladder —
 * the residual applied only once everything inside has taken its preferred size — so it settles
 * the root without ever competing with an inner component for slack.
 *
 * With no room to spare there is no slack left to argue over: `Centered`'s padding goes to zero
 * and the container ends up exactly the size of the content.
 */
export const UnsizedConstrainedShrinkWraps: Story = {
    render: () => (
        <div>
            <Note>
                The same tree as above, but with no width/height on Constrained.<br />
                The container should shrink-wrap to the content: 480×60, with no padding.
            </Note>
            <layout.Constrained>
                <layout.Centered>
                    <layout.FlexBox flexDirection="row" wrap={true} alignItems="center">
                        <Box width={120} height={60} fill="#4e79a7" label="A" testid="A" />
                        <Box width={120} height={60} fill="#f28e2c" label="B" testid="B" />
                        <Box width={120} height={60} fill="#e15759" label="C" testid="C" />
                        <Box width={120} height={60} fill="#76b7b2" label="D" testid="D" />
                    </layout.FlexBox>
                </layout.Centered>
            </layout.Constrained>
        </div>
    ),
    play: async ({ canvasElement }) => {
        const svg = canvasElement.querySelector('svg');
        if (!svg) throw new Error('svg not found');
        const size = () => ({
            w: parseFloat(svg.getAttribute('width') ?? '0'),
            h: parseFloat(svg.getAttribute('height') ?? '0'),
        });

        await waitFor(() => {
            expect(size().w).toBeCloseTo(480, 0);
        }, { timeout: 2000 });
        expect(size().h, 'svg height').toBeCloseTo(60, 0);

        // nothing was stretched and nothing was padded — the boxes tile the container exactly
        for (const [id, x] of [['A', 0], ['B', 120], ['C', 240], ['D', 360]] as const) {
            const box = readRect(canvasElement, id);
            expect(box.x, `${id}.x`).toBeCloseTo(x, 0);
            expect(box.w, `${id}.w`).toBeCloseTo(120, 0);
            expect(box.y, `${id}.y`).toBeCloseTo(0, 0);
        }
    },
};

export const TextBoxAutoSize: Story = {
    render: () => (
        <div>
            <Note>
                Text rotates 10° every 500ms (ported from examples/align-test.tsx).<br />
                Key behaviour: after each rotation the bounding box is remeasured and the text re-centres.<br />
                Verify it never drifts toward a corner. First paint may be briefly off-centre before measurement fires.
            </Note>
            <layout.Constrained width="300px" height="200px" debug>
                <AnimatingTextBox />
            </layout.Constrained>
        </div>
    ),
};
