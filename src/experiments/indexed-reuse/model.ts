export function bitDepth(colors: number): number {
    return Math.max(1, Math.ceil(Math.log2(colors)));
}
export function pack(values: number[], bits: number): Uint8Array {
    if (
        !Number.isInteger(bits) ||
        bits < 1 ||
        bits > 16 ||
        values.some((value) => !Number.isInteger(value) || value < 0 || value >= 2 ** bits)
    )
        throw new Error('번호는 지정한 비트 폭 안의 정수여야 합니다');
    const data = new Uint8Array(Math.ceil((values.length * bits) / 8));
    let cursor = 0;
    for (const value of values)
        for (let shift = bits - 1; shift >= 0; shift--, cursor++)
            data[Math.floor(cursor / 8)]! |= ((value >> shift) & 1) << (7 - (cursor % 8));
    return data;
}
export function unpack(data: Uint8Array, bits: number, count: number): number[] {
    return Array.from({ length: count }, (_, i) => {
        let v = 0;
        for (let b = 0; b < bits; b++) {
            const cursor = i * bits + b;
            v = (v << 1) | ((data[Math.floor(cursor / 8)]! >> (7 - (cursor % 8))) & 1);
        }
        return v;
    });
}
export function paletteCost(pixels: number, colors: number) {
    const indices = Math.ceil((pixels * bitDepth(colors)) / 8),
        table = 3 * colors;
    return { rgb: pixels * 3, indices, table, total: indices + table };
}
export function tileCost(placements: number, originals: number, indexBytes: number, attributeBytes: number) {
    if (originals > 2 ** (8 * indexBytes)) throw new Error('타일 번호 폭 부족');
    const pixels = originals * 16,
        indices = placements * indexBytes,
        attributes = placements * attributeBytes,
        palette = 12;
    return {
        copies: placements * 16 + attributes + palette,
        pixels,
        indices,
        attributes,
        palette,
        total: pixels + indices + attributes + palette,
    };
}
export function makeTile(id: number): number[] {
    return Array.from({ length: 64 }, (_, i) => {
        const x = i % 8,
            y = Math.floor(i / 8);
        if (y === 7 && x < 4) return (id >> (x * 2)) & 3;
        if (Math.abs(x - 3.5) + Math.abs(y - 3.5) < 2.8) return (id % 3) + 1;
        return x === 0 || y === 0 ? 3 : 0;
    });
}
export function expandTiles(tiles: number[][], map: number[], columns: number): number[] {
    const width = columns * 8;
    return Array.from({ length: map.length * 64 }, (_, i) => {
        const x = i % width,
            y = Math.floor(i / width);
        const tile = map[Math.floor(y / 8) * columns + Math.floor(x / 8)]!;
        return tiles[tile]![(y % 8) * 8 + (x % 8)]!;
    });
}
