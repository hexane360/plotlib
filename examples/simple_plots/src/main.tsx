import React from "react";
import { createRoot } from "react-dom/client";

import "./main.css";
import { SimpleLineFigure } from "./simple-line";

const container = document.getElementById("root") as HTMLDivElement | null;
if (!container) {
  throw new Error("Unable to find element with id 'root'");
}

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <SimpleLineFigure />
  </React.StrictMode>
);
