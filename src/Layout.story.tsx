import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';

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
    fill = '#4e79a7', stroke, width, height, label, children,
}: {
    fill?: string, stroke?: string, width?: number, height?: number,
    label?: string, children?: React.ReactNode,
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
                <layout.Constrained width="100%" height="100%">
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
                <layout.Constrained width="100%" height="100%">
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
                <layout.Constrained width="100%" height="100%">
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
                <layout.Constrained width="100%" height="100%">
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
                <layout.Constrained width="100%" height="100%">
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

export const TextBoxAutoSize: Story = {
    render: () => (
        <div>
            <Note>
                Text rotates 10° every 500ms (ported from examples/align-test.tsx).<br />
                Key behaviour: after each rotation the bounding box is remeasured and the text re-centres.<br />
                Verify it never drifts toward a corner. First paint may be briefly off-centre before measurement fires.
            </Note>
            <layout.Constrained width="300px" height="200px">
                <AnimatingTextBox />
            </layout.Constrained>
        </div>
    ),
};
