import React, { SVGProps } from "react";
import { omit } from "./utils";

/* Many of the following icons are taken from plotly.js.
plotly.js is licensed under the MIT license:

MIT License

Copyright (c) 2016-2024 Plotly Technologies Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/


function icon(
    {width, height, transform = '', path}: {width: number, height: number, transform?: string, path: string}
): (props: SVGProps<SVGSVGElement>) => React.ReactElement {
    const viewBox = `0 0 ${width} ${height}`;

    return (props: SVGProps<SVGSVGElement>) => (
        <svg viewBox={viewBox} width={props.width ?? "20px"} height={props.height ?? "20px"} {...omit(props, ['viewBox', 'width', 'height'])}>
            <path transform={transform} d={path}/>
        </svg>
    );
}

export function ZoomInIcon(props: SVGProps<SVGSVGElement>) {
    return <svg style={{stroke: "currentColor", fill: "none"}}
        viewBox="0 0 20 20" strokeWidth="1.8" width={props.width ?? "20px"} height={props.height ?? "20px"}
        {...omit(props, ['width', 'height', 'viewBox', 'strokeWidth', 'style'])}
    >
        <circle cx="9" cy="9" r="6" fill="none" />
        <line x1="9" y1="6" x2="9" y2="12" />
        <line x1="6" y1="9" x2="12" y2="9" />
        <line x1="13.5" y1="13.5" x2="17" y2="17" strokeLinecap="round" />
    </svg>;
}

export function ZoomOutIcon(props: SVGProps<SVGSVGElement>) {
    return <svg style={{stroke: "currentColor", fill: "none"}}
        viewBox="0 0 20 20" strokeWidth="1.8" width={props.width ?? "20px"} height={props.height ?? "20px"}
        {...omit(props, ['width', 'height', 'viewBox', 'strokeWidth', 'style'])}
    >
        <circle cx="9" cy="9" r="6" fill="none" />
        <line x1="6" y1="9" x2="12" y2="9" />
        <line x1="13.5" y1="13.5" x2="17" y2="17" strokeLinecap="round" />
    </svg>;
}

export const ZoomPlusIcon = icon({
    width: 875, height: 1000,
    path: "m1 787l0-875 875 0 0 875-875 0z m687-500l-187 0 0-187-125 0 0 187-188 0 0 125 188 0 0 187 125 0 0-187 187 0 0-125z",
    transform: "matrix(1 0 0 -1 0 850)",
});

export const ZoomMinusIcon = icon({
    width: 875, height: 1000,
    path: 'm0 788l0-876 875 0 0 876-875 0z m688-500l-500 0 0 125 500 0 0-125z',
    transform: 'matrix(1 0 0 -1 0 850)',
});

export const ZoomBoxIcon = icon({
    width: 1000,
    height: 1000,
    path: 'm1000-25l-250 251c40 63 63 138 63 218 0 224-182 406-407 406-224 0-406-182-406-406s183-406 407-406c80 0 155 22 218 62l250-250 125 125z m-812 250l0 438 437 0 0-438-437 0z m62 375l313 0 0-312-313 0 0 312z',
    transform: 'matrix(1 0 0 -1 0 850)',
})

export const HomeIcon = icon({
    width: 928.6, height: 1000,
    path: 'm786 296v-267q0-15-11-26t-25-10h-214v214h-143v-214h-214q-15 0-25 10t-11 26v267q0 1 0 2t0 2l321 264 321-264q1-1 1-4z m124 39l-34-41q-5-5-12-6h-2q-7 0-12 3l-386 322-386-322q-7-4-13-4-7 2-12 7l-35 41q-4 5-3 13t6 12l401 334q18 15 42 15t43-15l136-114v109q0 8 5 13t13 5h107q8 0 13-5t5-13v-227l122-102q5-5 6-12t-4-13z',
    transform: 'matrix(1 0 0 -1 0 850)',
});

export const PanIcon = icon({
    width: 1000, height: 1000,
    path: 'm1000 350l-187 188 0-125-250 0 0 250 125 0-188 187-187-187 125 0 0-250-250 0 0 125-188-188 186-187 0 125 252 0 0-250-125 0 187-188 188 188-125 0 0 250 250 0 0-126 187 188z',
    transform: 'matrix(1 0 0 -1 0 850)',
});
