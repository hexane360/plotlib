import React from "react";
import { useAtom } from "jotai";
import { CompoundStylesProps, useCompoundStyles } from "../theme";
import { InteractionContext } from "./context";
import { PanIcon, HomeIcon, ZoomInIcon, ZoomOutIcon, ZoomBoxIcon } from "../icons";
import styles from "./InteractionBar.module.css";

export type InteractionBarStylesNames = 'root' | 'btn' | 'sep';


export function InteractionBar(props: CompoundStylesProps<InteractionBarStylesNames>) {
    const ctx = React.useContext(InteractionContext);
    const getStyles = useCompoundStyles('InteractionBar', props, styles);
    if (!ctx) return null;
    const [mode, setMode] = useAtom(ctx.mode);
    const btnStyles = getStyles('btn');

    return (
        <div {...getStyles('root')} data-interaction-bar>
            <button {...btnStyles} data-active={mode === 'pan' || undefined} title="Pan" onClick={() => setMode('pan')}>
                <PanIcon />
            </button>
            <button {...btnStyles} data-active={mode === 'box-zoom' || undefined} title="Box zoom" onClick={() => setMode('box-zoom')}>
                <ZoomBoxIcon />
            </button>
            <div {...getStyles('sep')} />
            <button {...btnStyles} title="Zoom in" onClick={() => ctx.zoom_in()}><ZoomInIcon/></button>
            <button {...btnStyles} title="Zoom out" onClick={() => ctx.zoom_out()}><ZoomOutIcon/></button>
            <button {...btnStyles} title="Reset zoom" onClick={() => ctx.reset_zoom()}><HomeIcon/></button>
        </div>
    );
}
