export type Point = { x: number; y: number };
export type Curve = [Point, Point, Point, Point];
export const mix = (a: Point, b: Point, u: number): Point => ({
    x: a.x + (b.x - a.x) * u,
    y: a.y + (b.y - a.y) * u,
});
export function cubic(p: Curve, u: number): Point {
    const a = mix(p[0], p[1], u),
        b = mix(p[1], p[2], u),
        c = mix(p[2], p[3], u);
    return mix(mix(a, b, u), mix(b, c, u), u);
}
export function table(p: Curve, count: number, sx = 1) {
    const rows = [{ u: 0, s: 0 }];
    let previous = cubic(p, 0),
        length = 0;
    for (let i = 1; i <= count; i++) {
        const point = cubic(p, i / count);
        length += Math.hypot((point.x - previous.x) * sx, point.y - previous.y);
        rows.push({ u: i / count, s: length });
        previous = point;
    }
    return rows;
}
export function lookup(rows: { u: number; s: number }[], fraction: number) {
    const total = rows[rows.length - 1].s;
    if (total === 0) return 0;
    const distance = Math.min(1, Math.max(0, fraction)) * total;
    let low = 0,
        high = rows.length - 1;
    while (high - low > 1) {
        const mid = (low + high) >> 1;
        if (rows[mid].s < distance) low = mid;
        else high = mid;
    }
    const a = rows[low],
        b = rows[high];
    return b.s === a.s ? b.u : a.u + ((b.u - a.u) * (distance - a.s)) / (b.s - a.s);
}
