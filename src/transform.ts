
type Pair = readonly [number, number];
type ArrayOrNum = number | ReadonlyArray<number>;
type MapOutput<T, U = number> = T extends Pair ? [U, U] : T extends ReadonlyArray<number> ? U[] : U;

/** Immutable 1D affine transform: `y = k * x + p`. */
export class Transform1D {
    /** Scale factor. */
    readonly k: number = 1.
    /** Translation offset. */
    readonly p: number = 0.

    constructor(scale: number = 1., offset: number = 0.) {
        this.k = scale;
        this.p = offset;
    }

    /** Return a new transform translated by `x`. */
    translate(x: number): Transform1D {
        return new Transform1D(
            this.k,
            x + this.p
        );
    }

    /** Return a new transform scaled by `k`. */
    scale(k: number): Transform1D {
        return new Transform1D(
            this.k * k, this.p
        );
    }

    /** Apply the transform to a point or list of points. */
    apply<T extends ArrayOrNum>(point: T): MapOutput<T> {
        if (typeof point == "number") {
            return point * this.k + this.p as MapOutput<T>;
        }
        return point.map((val) => val * this.k + this.p) as MapOutput<T>;
    }

    /** Apply the inverse transform to a point or list of points. */
    unapply<T extends ArrayOrNum>(point: T): MapOutput<T> {
        if (typeof point == "number") {
            return (point - this.p)/this.k as MapOutput<T>;
        }
        return point.map((val) => (val - this.p)/this.k) as MapOutput<T>;
    }

    /** Return the inverse transform. */
    invert(): Transform1D {
        return new Transform1D(
            1/this.k,
            -this.p / this.k
        );
    }

    /** Return the composition `other ∘ this` (apply `this` first, then `other`). */
    compose(other: Transform1D) {
        return new Transform1D(
            this.k * other.k,
            this.p * other.k + other.p
        );
    }
}

/** Immutable 2D affine transform: `[x, y] → [kx*x + px, ky*y + py]`. */
export class Transform2D {
    /** Per-axis scale factors `[kx, ky]`. */
    readonly k: Pair = [1., 1.];
    /** Per-axis translation offsets `[px, py]`. */
    readonly p: Pair = [0., 0.];

    constructor(scale: Pair = [1., 1.], offset: Pair = [0., 0.]) {
        this.k = scale;
        this.p = offset;
    }

    /**
     * Create a transform from the unit box to the given bounds
     */
    static toBounds(xlim: Pair, ylim: Pair): Transform2D {
        const min = [xlim[0], ylim[0]] as const;
        const range  = [xlim[1] - xlim[0], ylim[1] - ylim[0]] as const;
        return new Transform2D(range, min);
    }

    /**
     * Create a transform from the given bounds to the unit box
     */
    static fromBounds(xlim: [number, number], ylim: [number, number]): Transform2D {
        return Transform2D.toBounds(xlim, ylim).invert();
    }

    /** Construct from two independent {@link Transform1D} instances. */
    static from_1d(xtrans: Transform1D, ytrans: Transform1D): Transform2D {
        return new Transform2D(
            [xtrans.k, ytrans.k], [xtrans.p, ytrans.p]
        );
    }

    /** Decompose into independent x and y {@link Transform1D} instances. */
    to_1d(): [Transform1D, Transform1D] {
        return [
            new Transform1D(this.k[0], this.p[0]),
            new Transform1D(this.k[1], this.p[1]),
        ];
    }

    /** Return a new transform pre-translated by `(x, y)` in the input space. */
    pretranslate(x: number, y: number): Transform2D {
        return new Transform2D(
            this.k,
            [x*this.k[0] + this.p[0], y*this.k[1] + this.p[1]]
        );
    }

    /** Return a new transform translated by `(x, y)`. */
    translate(x: number, y: number): Transform2D {
        return new Transform2D(
            this.k,
            [x + this.p[0], y + this.p[1]]
        );
    }

    /** Return a new transform scaled by `(kx, ky)`. If `ky` is omitted, uses `kx` for both axes. */
    scale(kx: number, ky: number | undefined): Transform2D {
        if (ky === undefined) {
            ky = kx
        }
        return new Transform2D(
            [this.k[0] * kx, this.k[1] * ky], this.p
        );
    }

    /** Apply the transform to a 2D point. */
    apply(point: Pair): [number, number] {
        return [point[0] * this.k[0] + this.p[0], point[1] * this.k[1] + this.p[1]];
    }

    /** Apply the inverse transform to a 2D point. */
    unapply(point: Pair): [number, number] {
        return [(point[0] - this.p[0])/this.k[0], (point[1] - this.p[1])/this.k[1]];
    }

    /** Map an x-axis extent (default `[0, 1]`) through the transform. */
    xlim(extent: Pair = [0.0, 1.0]): [number, number] {
        return [extent[0] * this.k[0] + this.p[0], extent[1] * this.k[0] + this.p[0]]
    }

    /** Map a y-axis extent (default `[0, 1]`) through the transform. */
    ylim(extent: Pair = [0.0, 1.0]): [number, number] {
        return [extent[0] * this.k[1] + this.p[1], extent[1] * this.k[1] + this.p[1]]
    }

    /** Return the inverse transform. */
    invert(): Transform2D {
        return new Transform2D(
            [1/this.k[0], 1/this.k[1]],
            [-this.p[0]/this.k[0], -this.p[1]/this.k[1]]
        );
    }

    /** Return the composition `other ∘ this` (apply `this` first, then `other`). */
    compose(other: Transform2D) {
        return new Transform2D(
            [this.k[0]*other.k[0], this.k[1]*other.k[1]],
            [this.p[0]*other.k[0] + other.p[0], this.p[1]*other.k[1] + other.p[1]]
        );
    }

    toString(): string {
        return `translate(${this.p[0]}, ${this.p[1]}) scale(${this.k[0]}, ${this.k[1]})`;
    }
}
