export type Point = { x: number; y: number };
export type Wall = { x0: number; x1: number; y0: number; y1: number };
export type Settings = {
    origin: Point;
    heading: number;
    range: number;
    fov: number;
    normalize: boolean;
    occlusion: boolean;
    samples: number;
    wall: Wall;
};
export function inside(p: Point, w: Wall) {
    return p.x >= w.x0 && p.x <= w.x1 && p.y >= w.y0 && p.y <= w.y1;
}
export function wallHit(a: Point, b: Point, w: Wall): number | null {
    let lo = 0,
        hi = 1;
    for (const [start, delta, min, max] of [
        [a.x, b.x - a.x, w.x0, w.x1],
        [a.y, b.y - a.y, w.y0, w.y1],
    ]) {
        if (Math.abs(delta!) < 1e-10) {
            if (start! < min! || start! > max!) return null;
        } else {
            const t1 = (min! - start!) / delta!,
                t2 = (max! - start!) / delta!;
            lo = Math.max(lo, Math.min(t1, t2));
            hi = Math.min(hi, Math.max(t1, t2));
            if (lo > hi) return null;
        }
    }
    return lo <= 1 && hi >= 0 ? lo : null;
}
export function inspect(target: Point, s: Settings) {
    const dx = target.x - s.origin.x,
        dy = target.y - s.origin.y,
        distance = Math.hypot(dx, dy);
    const same = distance < 1e-8,
        angle = (s.heading * Math.PI) / 180;
    const rawDot = dx * Math.cos(angle) + dy * Math.sin(angle),
        threshold = Math.cos((s.fov * Math.PI) / 360);
    const value = same ? 1 : rawDot / (s.normalize ? distance : 1);
    const inRange = dx * dx + dy * dy <= s.range * s.range + 1e-9,
        inAngle = same || value >= threshold - 1e-9;
    const originBlocked = s.occlusion && inside(s.origin, s.wall);
    const points =
        s.samples === 3
            ? [target, { x: target.x, y: target.y + 0.8 }, { x: target.x, y: target.y - 0.8 }]
            : [target];
    const rays =
        inRange && inAngle && !same && s.occlusion && !originBlocked
            ? points.map((p) => ({ point: p, hit: wallHit(s.origin, p, s.wall) }))
            : [];
    const exposed = rays.length ? rays.filter((r) => r.hit === null).length : 0;
    const visible = inRange && inAngle && !originBlocked && (!s.occlusion || same || exposed > 0);
    return { distance, value, threshold, inRange, inAngle, originBlocked, same, rays, exposed, visible };
}
