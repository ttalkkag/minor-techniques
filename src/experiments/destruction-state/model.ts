export type Span = { a: number; b: number };
export type Wall = {
    visual: Span[];
    collision: Span[];
    nav: Span[];
    health: number[];
    total: number;
    debris: Span[];
    pending: { spans: Span[]; ticks: number }[];
    removed: Span[];
};
export const initialWall = (): Wall => ({
    visual: [{ a: 0, b: 1 }],
    collision: [{ a: 0, b: 1 }],
    nav: [{ a: 0, b: 1 }],
    health: [100, 100, 100, 100, 100],
    total: 0,
    debris: [],
    pending: [],
    removed: [],
});
export function subtract(spans: Span[], cut: Span) {
    return spans.flatMap((span) =>
        span.b <= cut.a || span.a >= cut.b
            ? [span]
            : [
                  ...(span.a < cut.a ? [{ a: span.a, b: cut.a }] : []),
                  ...(span.b > cut.b ? [{ a: cut.b, b: span.b }] : []),
              ],
    );
}
export function blocked(spans: Span[], x: number, radius = 0.025) {
    return spans.some((s) => x + radius > s.a && x - radius < s.b);
}
export function strike(
    wall: Wall,
    x: number,
    damage: number,
    method: string,
    policy: string,
    debris: boolean,
) {
    wall.total += damage;
    const cell = Math.min(4, Math.floor(x * 5));
    wall.health[cell] = Math.max(0, wall.health[cell] - damage);
    if ((method === 'swap' ? wall.total : 100 - wall.health[cell]) < 100) return null;
    const cut =
        method === 'swap'
            ? { a: 0.3, b: 0.7 }
            : method === 'cut'
              ? { a: Math.max(0, x - 0.14), b: Math.min(1, x + 0.14) }
              : { a: cell / 5, b: (cell + 1) / 5 };
    const source = policy === 'collision' ? wall.collision : wall.visual;
    if (!source.some((span) => span.a < cut.b && span.b > cut.a)) return null;
    if (policy !== 'collision') wall.visual = subtract(wall.visual, cut);
    if (policy !== 'visual') wall.collision = subtract(wall.collision, cut);
    if (policy === 'sync' || policy === 'collision') wall.nav = subtract(wall.nav, cut);
    if (policy === 'delay') wall.pending.push({ spans: [cut], ticks: 2 });
    wall.removed.push(cut);
    if (debris) wall.debris.push({ a: x - 0.055, b: x + 0.055 });
    return cut;
}
export function tickWall(wall: Wall) {
    for (const update of wall.pending) {
        update.ticks--;
        if (update.ticks === 0) for (const cut of update.spans) wall.nav = subtract(wall.nav, cut);
    }
    wall.pending = wall.pending.filter((update) => update.ticks > 0);
}
