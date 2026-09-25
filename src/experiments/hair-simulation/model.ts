export type Particle = { x: number; y: number; px: number; py: number };
export type Circle = { x: number; y: number; r: number };
export function makeChain(x: number, y: number, segments: number, side: number): Particle[] {
    return Array.from({ length: segments + 1 }, (_, i) => ({
        x: x + side * Math.sin(((i / segments) * Math.PI) / 2) * 95,
        y: y + (i * 220) / segments,
        px: x + side * Math.sin(((i / segments) * Math.PI) / 2) * 95,
        py: y + (i * 220) / segments,
    }));
}
export function stepChain(
    chain: Particle[],
    anchor: { x: number; y: number },
    length: number,
    wind: number,
    circles: Circle[],
    padding: number,
    collide: boolean,
    dt: number,
) {
    const segment = length / (chain.length - 1);
    for (let i = 1; i < chain.length; i++) {
        const p = chain[i],
            x = p.x,
            y = p.y;
        p.x += (p.x - p.px) * 0.986 + wind * dt * dt;
        p.y += (p.y - p.py) * 0.986 + 380 * dt * dt;
        p.px = x;
        p.py = y;
    }
    for (let pass = 0; pass < 12; pass++) {
        chain[0].x = anchor.x;
        chain[0].y = anchor.y;
        for (let i = 1; i < chain.length; i++) {
            const a = chain[i - 1],
                b = chain[i];
            const dx = b.x - a.x,
                dy = b.y - a.y,
                distance = Math.hypot(dx, dy) || 1;
            const error = (distance - segment) / distance;
            if (i > 1) {
                a.x += dx * error * 0.5;
                a.y += dy * error * 0.5;
            }
            b.x -= dx * error * (i === 1 ? 1 : 0.5);
            b.y -= dy * error * (i === 1 ? 1 : 0.5);
        }
        if (collide) for (let i = 1; i < chain.length; i++) projectOutside(chain[i], circles, padding);
    }
    chain[0].px = anchor.x;
    chain[0].py = anchor.y;
}
export function interpolate(a: Particle[], b: Particle[], blend: number) {
    return a.map((p, i) => ({
        x: p.x * (1 - blend) + b[i].x * blend,
        y: p.y * (1 - blend) + b[i].y * blend,
    }));
}

export function projectOutside(point: Particle, circles: Circle[], padding: number) {
    const outside = (x: number, y: number) =>
        circles.every((c) => Math.hypot(x - c.x, y - c.y) >= c.r + padding - 1e-7);
    if (outside(point.x, point.y)) return;
    const candidates: { x: number; y: number }[] = [];
    for (const c of circles) {
        const dx = point.x - c.x,
            dy = point.y - c.y,
            d = Math.hypot(dx, dy),
            radius = c.r + padding;
        candidates.push({ x: c.x + (d ? dx / d : 1) * radius, y: c.y + (d ? dy / d : 0) * radius });
    }
    for (let i = 0; i < circles.length; i++)
        for (let j = i + 1; j < circles.length; j++) {
            const a = circles[i],
                b = circles[j],
                ra = a.r + padding,
                rb = b.r + padding;
            const dx = b.x - a.x,
                dy = b.y - a.y,
                d = Math.hypot(dx, dy);
            if (d === 0 || d > ra + rb || d < Math.abs(ra - rb)) continue;
            const along = (ra * ra - rb * rb + d * d) / (2 * d),
                across = Math.sqrt(Math.max(0, ra * ra - along * along));
            for (const sign of [-1, 1])
                candidates.push({
                    x: a.x + (dx / d) * along - ((sign * dy) / d) * across,
                    y: a.y + (dy / d) * along + ((sign * dx) / d) * across,
                });
        }
    let best: { x: number; y: number } | undefined,
        distance = Infinity;
    for (const candidate of candidates)
        if (outside(candidate.x, candidate.y)) {
            const squared = (candidate.x - point.x) ** 2 + (candidate.y - point.y) ** 2;
            if (squared < distance) {
                best = candidate;
                distance = squared;
            }
        }
    if (best) {
        point.x = best.x;
        point.y = best.y;
    }
}
