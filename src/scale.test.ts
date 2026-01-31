import { expect, test } from 'vitest';
import { interpolateLab } from 'd3-interpolate';
import * as d3_scale from "d3-scale-chromatic";

import { linear, log } from './scale';

test('linear continuous scale', () => {
    const scale = linear([-5, 5], [100, 200]);

    expect(scale.domain).toEqual([-5, 5]);
    expect(scale.range).toEqual([100, 200]);

    expect(scale.domain_to_unit(0)).toEqual(0.5);

    expect(scale.transform(2.5)).toEqual(175.0);
    expect(scale.transform(-10, true)).toEqual(100.0);
    expect(scale.transform(-15, false)).toEqual(0.0);

    expect(scale.toString()).toEqual("scale linear(domain: [-5, 5], range: [100, 200])");
});

test('continous with_range', () => {
    const scale = linear([-5, 5], [100, 200]);

    const new_scale = scale.with_range([0, 100]);

    expect(scale.range).toEqual([100, 200]);
    expect(new_scale.range).toEqual([0, 100]);

    expect(new_scale.transform(2.5)).toEqual(75.0);
    expect(new_scale.toString()).toEqual("scale linear(domain: [-5, 5], range: [0, 100])");
})

test('linear with interpolating function', () => {
    const f = (t: number) => 5*t;
    const scale = linear([10, 0], f);

    expect(scale.range).toBeUndefined();
    expect(scale.interpolate).toBe(f);

    expect(scale.transform(10)).toEqual(-0.0);
    expect(scale.transform(0)).toEqual(5.0);

    expect(scale.toString()).toEqual("scale linear(domain: [10, 0], range: (t) => 5 * t)");
})

test.fails('linear with multiple domain', () => {
    const scale = linear([0, 5, 10], ["red", "green", "blue"]);

    expect(scale.transform(0)).toEqual("rgb(255, 0, 0)");
    expect(scale.transform(5)).toEqual("rgb(0, 0, 255)");
    expect(scale.transform(10)).toEqual("rgb(0, 0, 255)");
})

test('linear with interpolating range', () => {
    const scale = linear([0, 10], ["red", "green", "blue"]);

    expect(scale.transform([0, 2.5, 5, 7.5, 10])).toEqual([
        "rgb(255, 0, 0)",
        "rgb(128, 64, 0)",
        "rgb(0, 128, 0)",
        "rgb(0, 64, 128)",
        "rgb(0, 0, 255)",
    ]);

    expect(scale.transform(  0)).toEqual("rgb(255, 0, 0)");
    expect(scale.transform(2.5)).toEqual("rgb(128, 64, 0)");
    expect(scale.transform(  5)).toEqual("rgb(0, 128, 0)");
    expect(scale.transform(7.5)).toEqual("rgb(0, 64, 128)");
    expect(scale.transform( 10)).toEqual("rgb(0, 0, 255)");

    expect(scale.toString()).toEqual(
        "scale linear(domain: [0, 10], range: [red, green, blue])"
    );
})

test('linear interpolating range, custom interpolator', () => {
    const scale = linear([0, 10], ["purple", "orange"], interpolateLab);

    expect(scale.transform([0, 2.5, 5, 7.5, 10])).toEqual([
        "rgb(128, 0, 128)",
        "rgb(164, 56, 111)",
        "rgb(196, 93, 92)",
        "rgb(226, 129, 65)",
        "rgb(255, 165, 0)",
    ]);

    expect(scale.toString()).toContain(
        "scale linear(domain: [0, 10], range: [purple, orange], make_interpolate: function lab(start, end)"
    );
})

test('log interpolating fn', () => {
    const scale = log([0.1, 100.0], d3_scale.interpolateMagma);
    expect(scale.transform([0.01, 0.1, 0.3, 1.0, 3.0, 10.0, 30.0, 100.0, 200.0])).toEqual([
        "#000004",
        "#000004",
        "#29115a",
        "#721f81",
        "#b3367a",
        "#f1605d",
        "#feac76",
        "#fcfdbf",
        "#fcfdbf",
    ]);
})