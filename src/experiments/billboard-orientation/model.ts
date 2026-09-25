export type V3 = [number, number, number];
export type Basis = { right: V3; up: V3; normal: V3; degenerate: boolean; valid: boolean };
export const dot = (a: V3, b: V3) => a.reduce((s, v, i) => s + v * b[i]!, 0);
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a: V3, n: number): V3 => [a[0] * n, a[1] * n, a[2] * n];
export const cross = (a: V3, b: V3): V3 => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
];
export const unit = (a: V3): V3 => scale(a, 1 / (Math.hypot(...a) || 1));
export function camera(azimuth: number, elevation: number) {
    const a = (azimuth * Math.PI) / 180,
        e = (elevation * Math.PI) / 180;
    const normal: V3 = [Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e)];
    const right: V3 = [Math.cos(a), 0, -Math.sin(a)];
    return { position: add([0, 1.5, 0], scale(normal, 10)), right, up: cross(normal, right), normal };
}
export function basis(
    mode: 'screen' | 'point' | 'axis',
    p: V3,
    c: ReturnType<typeof camera>,
    preserve: boolean,
    previous: V3 = [0, 0, 1],
): Basis {
    if (mode === 'screen')
        return { right: c.right, up: c.up, normal: c.normal, degenerate: false, valid: true };
    const d = sub(c.position, p);
    if (mode === 'axis') {
        const h: V3 = [d[0], 0, d[2]],
            degenerate = Math.hypot(...h) < 0.02;
        const normal = degenerate ? unit(previous) : unit(h);
        return {
            right: cross([0, 1, 0], normal),
            up: [0, 1, 0],
            normal,
            degenerate,
            valid: !degenerate || preserve,
        };
    }
    const normal = unit(d),
        r = cross([0, 1, 0], normal),
        degenerate = Math.hypot(...r) < 0.002;
    const right = degenerate ? c.right : unit(r);
    return {
        right,
        up: cross(normal, right),
        normal,
        degenerate,
        valid: Math.hypot(...d) > 0 && (!degenerate || preserve),
    };
}
