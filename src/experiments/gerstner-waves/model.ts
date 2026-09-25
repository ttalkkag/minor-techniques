export type Wave = { a: number; lambda: number; q: number; angle: number };
export function strength(waves: Wave[]): number {
    return waves.reduce((s, w) => s + (w.q * w.a * 2 * Math.PI) / w.lambda, 0);
}
export function safeWaves(waves: Wave[], safe: boolean): Wave[] {
    const scale = safe ? Math.min(1, 0.9 / Math.max(strength(waves), 1e-9)) : 1;
    return waves.map((w) => ({ ...w, q: w.q * scale }));
}
export function sample(u: number, v: number, t: number, waves: Wave[]) {
    let x = u,
        y = 0,
        z = v,
        xx = 1,
        xz = 0,
        zx = 0,
        zz = 1,
        yx = 0,
        yz = 0;
    for (const w of waves) {
        const k = (2 * Math.PI) / w.lambda,
            dx = Math.cos(w.angle),
            dz = Math.sin(w.angle),
            theta = k * (dx * u + dz * v) - Math.sqrt(9.81 * k) * t;
        const s = Math.sin(theta),
            c = Math.cos(theta),
            qak = w.q * w.a * k;
        x += w.q * w.a * dx * c;
        z += w.q * w.a * dz * c;
        y += w.a * s;
        xx -= qak * dx * dx * s;
        xz -= qak * dx * dz * s;
        zx -= qak * dx * dz * s;
        zz -= qak * dz * dz * s;
        yx += w.a * k * dx * c;
        yz += w.a * k * dz * c;
    }
    const raw = [yz * zx - zz * yx, zz * xx - xz * zx, xz * yx - yz * xx],
        len = Math.hypot(...raw) || 1;
    return {
        x,
        y,
        z,
        normal: raw.map((a) => a / len),
        heightNormal: [-yx, 1, -yz].map((a) => a / Math.hypot(yx, 1, yz)),
        det: xx * zz - xz * zx,
    };
}
