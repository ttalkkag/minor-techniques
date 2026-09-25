export type Point = { x: number; y: number };
export type Shape = 'cylinder' | 'bottle';
export type Sample = Point & { weight: number };
export function radius(y: number, shape: Shape): number {
    if (shape === 'cylinder' || y <= 0.55) return 0.8;
    if (y >= 1.05) return 0.32;
    return 0.8 - (y - 0.55) * 0.96;
}
export function outline(shape: Shape): Point[] {
    const ys = [-1.5, 0.55, 1.05, 1.5];
    return [
        ...ys.map((y) => ({ x: radius(y, shape), y })),
        ...ys.toReversed().map((y) => ({ x: -radius(y, shape), y })),
    ];
}
export function volumeSamples(shape: Shape, resolution = 80): Sample[] {
    const result: Sample[] = [];
    const dy = 3 / resolution,
        dx = 1.6 / resolution;
    for (let iy = 0; iy < resolution; iy++) {
        const y = -1.5 + (iy + 0.5) * dy,
            r = radius(y, shape);
        for (let ix = 0; ix < resolution; ix++) {
            const x = -0.8 + (ix + 0.5) * dx;
            if (Math.abs(x) < r) result.push({ x, y, weight: 2 * Math.sqrt(r * r - x * x) * dx * dy });
        }
    }
    return result;
}
export function volumeBelow(samples: Sample[], nx: number, ny: number, h: number): number {
    let volume = 0;
    for (const p of samples) if (nx * p.x + ny * p.y <= h) volume += p.weight;
    return volume;
}
export function levelForVolume(samples: Sample[], nx: number, ny: number, fraction: number): number {
    if (fraction <= 0) return -3;
    if (fraction >= 1) return 3;
    const ordered = samples
        .map((p) => ({ projection: nx * p.x + ny * p.y, weight: p.weight }))
        .sort((a, b) => a.projection - b.projection);
    const target = samples.reduce((sum, p) => sum + p.weight, 0) * fraction;
    let sum = 0;
    for (const p of ordered) {
        sum += p.weight;
        if (sum >= target) return p.projection;
    }
    return 3;
}
export function clipLiquid(points: Point[], nx: number, ny: number, h: number): Point[] {
    const result: Point[] = [];
    for (let i = 0; i < points.length; i++) {
        const a = points[i],
            b = points[(i + 1) % points.length];
        const da = nx * a.x + ny * a.y - h,
            db = nx * b.x + ny * b.y - h;
        if (da <= 0) result.push(a);
        if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
            const t = da / (da - db);
            result.push({ x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
        }
    }
    return result;
}
export function oscillatorStep(
    angle: number,
    velocity: number,
    damping: number,
    dt: number,
): [number, number] {
    const omega = 5;
    velocity += (-2 * damping * omega * velocity - omega * omega * angle) * dt;
    return [angle + velocity * dt, velocity];
}
