
export type { ScaleSpec } from "./Figure";
export type { ScaleEntry } from "./context";
export { linear, log, continuous, numeric } from "./scale";

export { default as Figure } from "./Figure";
export { default as Plot } from "./Plot";
export { default as PlotLine } from "./PlotLine";
export { default as Scalebar } from "./Scalebar";
export { default as TextBox } from "./TextBox";
export type { TextBoxProps } from "./TextBox";

export { ThemeProvider } from "./theme";

export { FigureContext, PlotContext } from "./context";
export type { FigureContextData, PlotContextData } from "./context";
export * as layout from "./layout";
export { default as styles } from "./styles.module.css";