export type RGB = [number, number, number];
export const colors: RGB[] = [
    [0.87, 0.92, 0.92],
    [0.035, 0.14, 0.17],
    [0.06, 0.46, 0.42],
    [0.94, 0.48, 0.18],
];
export function sprite(jagged: boolean): number[] {
    const rows = [
        '00011000',
        '00122100',
        '01222210',
        '12233221',
        '12233221',
        '01222210',
        '00122100',
        '00011000',
    ];
    const p = rows.flatMap((r) => [...r].map(Number));
    if (jagged) p[2 * 8 + 7] = 1;
    return p;
}
export function linearToSrgb(v: number): number {
    return v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
}
export function displayPosition(world: number, ppu: number, snap: boolean): number {
    return snap ? Math.round(world * ppu) / ppu : world;
}
export function sample(pixels: number[], x: number, y: number, filter: 'nearest' | 'linear'): RGB {
    const get = (u: number, v: number): RGB =>
        u < 0 || v < 0 || u >= 8 || v >= 8 ? colors[0]! : colors[pixels[v * 8 + u]!]!;
    if (filter === 'nearest') return get(Math.floor(x + 0.5), Math.floor(y + 0.5));
    const ix = Math.floor(x),
        iy = Math.floor(y),
        tx = x - ix,
        ty = y - iy,
        a = get(ix, iy),
        b = get(ix + 1, iy),
        c = get(ix, iy + 1),
        d = get(ix + 1, iy + 1);
    return [0, 1, 2].map(
        (channel) =>
            (a[channel]! * (1 - tx) + b[channel]! * tx) * (1 - ty) +
            (c[channel]! * (1 - tx) + d[channel]! * tx) * ty,
    ) as RGB;
}
export function raster(
    pixels: number[],
    scale: number,
    offset: number,
    filter: 'nearest' | 'linear',
): { width: number; pixels: RGB[] } {
    const width = Math.ceil(8 * scale) + 12;
    return {
        width,
        pixels: Array.from({ length: width * width }, (_, i) =>
            sample(
                pixels,
                ((i % width) + 0.5 - 3 - offset) / scale - 0.5,
                (Math.floor(i / width) + 0.5 - 3) / scale - 0.5,
                filter,
            ),
        ),
    };
}
export function stripeWidths(scale: number): number[] {
    const counts = [0, 0, 0, 0];
    for (let x = 0; x < Math.round(4 * scale); x++) counts[Math.min(3, Math.floor((x + 0.5) / scale))]!++;
    return counts;
}
export function brightnessPair(t: number): [number, number] {
    return [1 - t, t];
}
const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export function dither(t: number): number[] {
    return Array.from({ length: 64 }, (_, i) =>
        t > (bayer[(Math.floor(i / 8) % 4) * 4 + (i % 4)]! + 0.5) / 16 ? 1 : 0,
    );
}
