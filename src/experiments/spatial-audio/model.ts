export type Point = { x: number; y: number };
export function wallBlocks(source: Point, listener: Point, edge: number): boolean {
    if ((source.x - 5) * (listener.x - 5) >= 0) return false;
    const t = (5 - source.x) / (listener.x - source.x);
    const y = source.y + (listener.y - source.y) * t;
    return y >= -4 && y <= edge;
}
export function paths(source: Point, listener: Point, edge: number, count: number, wall: boolean) {
    return Array.from({ length: count }, (_, i) => {
        const point = { x: source.x, y: source.y + (count === 1 ? 0 : (i / (count - 1) - 0.5) * 2) };
        return { point, blocked: wall && wallBlocks(point, listener, edge) };
    });
}
export function directGain(open: number, count: number, transmission: number): number {
    const q = open / count;
    return q + (1 - q) * transmission;
}
export function doppler(velocityToward: number, enabled: boolean): number {
    return enabled ? Math.max(0.5, Math.min(2, 343 / (343 - Math.min(342, velocityToward)))) : 1;
}
export function coefficients(
    source: Point,
    listener: Point,
    edge: number,
    count: number,
    wall: boolean,
    transmission: number,
    air: boolean,
    velocity: number,
    pitch: boolean,
) {
    const rays = paths(source, listener, edge, count, wall),
        open = rays.filter((ray) => !ray.blocked).length;
    const distance = Math.hypot(source.x - listener.x, source.y - listener.y);
    const attenuation = 1 / (1 + 0.18 * Math.max(0, distance - 1));
    return {
        rays,
        open,
        distance,
        attenuation,
        occlusion: directGain(open, count, transmission),
        cutoff: Math.max(
            250,
            Math.min(air ? 12000 / (1 + distance * 0.2) : 16000, wall ? 600 + (15400 * open) / count : 16000),
        ),
        pitch: doppler(velocity, pitch),
    };
}
