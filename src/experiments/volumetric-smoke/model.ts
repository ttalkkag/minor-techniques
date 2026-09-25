export type Vec = { x: number; y: number; z: number };
export type DensityState = {
    shape: 'uniform' | 'cloud';
    beta: number;
    hole: boolean;
    holeRadius: number;
    drift: number;
};
export type Method = 'corrected' | 'fixed' | 'billboard';
export function density(p: Vec, state: DensityState): number {
    if (Math.abs(p.x) > 1 || Math.abs(p.y) > 1 || Math.abs(p.z) > 1) return 0;
    if (state.hole && Math.hypot(p.x - 0.12, p.y) < state.holeRadius) return 0;
    if (state.shape === 'uniform') return 1;
    const x = p.x - state.drift;
    const a = Math.exp(-3 * ((x * x) / 0.72 + (p.y * p.y) / 0.85 + (p.z * p.z) / 0.55));
    const b = 0.6 * Math.exp(-7 * ((x + 0.4) ** 2 + (p.y - 0.2) ** 2 + (p.z - 0.2) ** 2));
    const c = 0.4 * Math.exp(-8 * ((x - 0.35) ** 2 + (p.y + 0.3) ** 2 + (p.z + 0.1) ** 2));
    return Math.min(1, a + b + c);
}
export function rayInterval(origin: Vec, direction: Vec): [number, number] | null {
    let near = -Infinity,
        far = Infinity;
    for (const axis of ['x', 'y', 'z'] as const) {
        if (Math.abs(direction[axis]) < 1e-10) {
            if (Math.abs(origin[axis]) > 1) return null;
            continue;
        }
        const a = (-1 - origin[axis]) / direction[axis],
            b = (1 - origin[axis]) / direction[axis];
        near = Math.max(near, Math.min(a, b));
        far = Math.min(far, Math.max(a, b));
    }
    return far > Math.max(near, 0) ? [Math.max(near, 0), far] : null;
}
export function viewRay(u: number, v: number, degrees: number) {
    const a = (degrees * Math.PI) / 180,
        direction = { x: Math.sin(a), y: 0, z: Math.cos(a) };
    return {
        origin: { x: Math.cos(a) * u - direction.x * 3, y: v, z: -Math.sin(a) * u - direction.z * 3 },
        direction,
    };
}
export function integrate(
    origin: Vec,
    direction: Vec,
    state: DensityState,
    samples: number,
    method: Method = 'corrected',
) {
    const interval = rayInterval(origin, direction);
    if (!interval) return { transmission: 1, emission: 0, length: 0, queries: 0 };
    const [near, far] = interval,
        step = (far - near) / samples;
    let transmission = 1,
        emission = 0;
    for (let i = 0; i < samples; i++) {
        const t = near + (i + 0.5) * step;
        const rho = density(
            { x: origin.x + direction.x * t, y: origin.y + direction.y * t, z: origin.z + direction.z * t },
            state,
        );
        const alpha =
            method === 'fixed'
                ? Math.min(0.999, 0.1 * (state.beta / 0.5) * rho)
                : 1 - Math.exp(-state.beta * rho * step);
        emission += transmission * alpha;
        transmission *= 1 - alpha;
    }
    return { transmission, emission, length: far - near, queries: samples };
}
export function billboard(u: number, v: number, state: DensityState): number {
    const rho =
        state.shape === 'uniform'
            ? Math.abs(u) <= 1 && Math.abs(v) <= 1
                ? 1
                : 0
            : Math.exp(-3 * ((u - state.drift) ** 2 / 0.72 + (v * v) / 0.85));
    const hole = state.hole && Math.hypot(u - 0.12, v) < state.holeRadius;
    return hole ? 1 : Math.exp(-state.beta * rho * 2);
}
