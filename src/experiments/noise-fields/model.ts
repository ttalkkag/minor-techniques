export function hash(x: number, y: number, seed: number): number {
    let a = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 1274126177);
    a = Math.imul(a ^ (a >>> 13), 1274126177);
    return ((a ^ (a >>> 16)) >>> 0) / 4294967296;
}
export const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
export const density = (value: number, threshold: number) =>
    Math.max(0, Math.min(1, (value - threshold) / (1 - threshold)));
export function gradient(x: number, y: number, seed: number): [number, number] {
    const a = hash(x, y, seed) * Math.PI * 2;
    return [Math.cos(a), Math.sin(a)];
}
export function perlin(x: number, y: number, seed: number, uniform = false) {
    const ix = Math.floor(x),
        iy = Math.floor(y),
        u = x - ix,
        v = y - iy;
    const dots = [0, 1, 2, 3].map((i) => {
        const cx = i % 2,
            cy = Math.floor(i / 2),
            g = uniform ? [1, 0] : gradient(ix + cx, iy + cy, seed);
        return g[0] * (u - cx) + g[1] * (v - cy);
    });
    const f = fade(u),
        g = fade(v),
        bottom = dots[0] * (1 - f) + dots[1] * f,
        top = dots[2] * (1 - f) + dots[3] * f;
    return {
        value: bottom * (1 - g) + top * g,
        dots,
        weights: [(1 - f) * (1 - g), f * (1 - g), (1 - f) * g, f * g],
    };
}
export function worley(x: number, y: number, seed: number, ownOnly = false) {
    const ix = Math.floor(x),
        iy = Math.floor(y);
    const candidates: { x: number; y: number; distance: number }[] = [];
    let ring = 0;
    while (true) {
        for (let a = ix - ring; a <= ix + ring; a++)
            for (let b = iy - ring; b <= iy + ring; b++)
                if (ring === 0 || Math.max(Math.abs(a - ix), Math.abs(b - iy)) === ring) {
                    const px = a + hash(a, b, seed),
                        py = b + hash(a, b, seed + 19);
                    candidates.push({
                        x: px,
                        y: py,
                        distance: Math.hypot(px - x, py - y),
                    });
                }
        candidates.sort((a, b) => a.distance - b.distance);
        const bound = Math.min(x - (ix - ring), ix + ring + 1 - x, y - (iy - ring), iy + ring + 1 - y);
        if (ownOnly || (candidates.length > 1 && bound >= candidates[1].distance)) break;
        ring++;
    }
    return {
        f1: candidates[0].distance,
        f2: candidates[1]?.distance ?? candidates[0].distance,
        candidates,
        ring,
    };
}
export function field(
    x: number,
    y: number,
    seed: number,
    kind: string,
    octaves: number,
    gain: number,
    warp: number,
) {
    if (warp) {
        const wx = perlin(x * 0.5, y * 0.5, seed + 31).value,
            wy = perlin(x * 0.5, y * 0.5, seed + 57).value;
        x += wx * warp;
        y += wy * warp;
    }
    let value = 0,
        amplitude = 1,
        weight = 0,
        frequency = 1;
    for (let i = 0; i < octaves; i++) {
        const a = x * frequency,
            b = y * frequency;
        const n =
            kind === 'random'
                ? hash(Math.floor(a * 5), Math.floor(b * 5), seed) * 2 - 1
                : kind === 'gradient'
                  ? perlin(a, b, seed + i).value * 1.7
                  : (() => {
                        const w = worley(a, b, seed + i);
                        return kind === 'f1' ? 1 - w.f1 * 1.5 : (w.f2 - w.f1) * 2 - 1;
                    })();
        value += amplitude * n;
        weight += amplitude;
        amplitude *= gain;
        frequency *= 2;
    }
    return value / weight;
}
