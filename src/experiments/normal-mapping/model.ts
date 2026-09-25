export type Vec3 = [number, number, number];
export type Fault = 'none' | 'y' | 'srgb' | 'frame' | 'basis' | 'flip';
export function normalize(v: Vec3): Vec3 {
    const size = Math.hypot(...v);
    return size ? [v[0] / size, v[1] / size, v[2] / size] : [0, 0, 1];
}
export function encode(n: Vec3): Vec3 {
    return [(n[0] + 1) / 2, (n[1] + 1) / 2, (n[2] + 1) / 2];
}
export function decode(rgb: Vec3): Vec3 {
    return normalize([2 * rgb[0] - 1, 2 * rgb[1] - 1, 2 * rgb[2] - 1]);
}
export function srgbToLinear(c: number): number {
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
export function bump(u: number, v: number, phase: number): { height: number; dx: number; dy: number } {
    let height = 0,
        dx = 0,
        dy = 0;
    const move = 0.22 * Math.sin(phase);
    for (const [cx, cy, amplitude] of [
        [-0.5, -0.5, 0.18],
        [0.45, -0.25, 0.27],
        [-0.18, 0.5, 0.22],
    ]) {
        const x = u - cx! - move,
            y = v - cy!;
        const h = amplitude! * Math.exp(-19 * (x * x + y * y));
        height += h;
        dx -= 38 * x * h;
        dy -= 38 * y * h;
    }
    return { height, dx, dy };
}
export function tangentNormal(u: number, v: number, phase: number, strength: number): Vec3 {
    const h = bump(u, v, phase);
    return normalize([-h.dx * strength, -h.dy * strength, 1]);
}
export function toWorld(n: Vec3, yaw: number): Vec3 {
    return normalize([
        n[0] * Math.cos(yaw) + n[2] * Math.sin(yaw),
        n[1],
        -n[0] * Math.sin(yaw) + n[2] * Math.cos(yaw),
    ]);
}
export function normalAt(
    u: number,
    v: number,
    phase: number,
    strength: number,
    yaw: number,
    flipped: boolean,
    fault: Fault,
): Vec3 {
    const mapU = flipped ? -u : u;
    let n = tangentNormal(mapU, v, fault === 'frame' ? phase - 1.1 : phase, strength);
    const rgb = encode(n);
    n = decode(fault === 'srgb' ? [srgbToLinear(rgb[0]), srgbToLinear(rgb[1]), srgbToLinear(rgb[2])] : rgb);
    if (fault === 'y') n[1] *= -1;
    if (flipped && fault !== 'flip') n[0] *= -1;
    return fault === 'basis' ? n : toWorld(n, yaw);
}
export function cosine(n: Vec3, light: Vec3): number {
    return Math.max(0, n[0] * light[0] + n[1] * light[1] + n[2] * light[2]);
}
