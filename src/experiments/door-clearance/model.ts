export type Wall = { x: number; z: number; w: number; d: number };
export function walls(width: number): Wall[] {
    return [
        { x: -5, z: -0.25, w: 5 - width / 2, d: 0.5 },
        { x: width / 2, z: -0.25, w: 5 - width / 2, d: 0.5 },
        { x: -5.25, z: -7, w: 0.25, d: 14 },
        { x: 5, z: -7, w: 0.25, d: 14 },
        { x: -5, z: -7.25, w: 10, d: 0.25 },
        { x: -5, z: 7, w: 10, d: 0.25 },
    ];
}
export function blocked(x: number, z: number, r: number, geometry: Wall[]) {
    return geometry.some((b) => {
        const dx = x - Math.max(b.x, Math.min(b.x + b.w, x)),
            dz = z - Math.max(b.z, Math.min(b.z + b.d, z));
        return dx * dx + dz * dz < r * r - 1e-12;
    });
}
export function cameraFraction(x: number, z: number, dx: number, dz: number, r: number, geometry: Wall[]) {
    for (let i = 1; i <= 400; i++) {
        const t = i / 400;
        if (blocked(x + dx * t, z + dz * t, r, geometry)) return (i - 1) / 400;
    }
    return 1;
}
