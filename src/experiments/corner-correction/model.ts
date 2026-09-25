export type Rect = { x: number; y: number; w: number; h: number };
export function overlaps(a: Rect, b: Rect) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
export function sweptBlocked(a: Rect, dx: number, dy: number, obstacles: Rect[]) {
    return obstacles.some((b) => {
        if (overlaps(a, b)) return true;
        let enter = -Infinity,
            leave = Infinity;
        for (const [p, delta, lo, hi] of [
            [a.x, dx, b.x - a.w, b.x + b.w],
            [a.y, dy, b.y - a.h, b.y + b.h],
        ]) {
            if (delta === 0) {
                if (p <= lo || p >= hi) return false;
                continue;
            }
            const t1 = (lo - p) / delta,
                t2 = (hi - p) / delta;
            enter = Math.max(enter, Math.min(t1, t2));
            leave = Math.min(leave, Math.max(t1, t2));
        }
        return enter < leave && leave > 0 && enter < 1;
    });
}
export function correct(body: Rect, dx: number, dy: number, max: number, obstacles: Rect[], prefer = -1) {
    const attempts: { offset: number; ok: boolean }[] = [];
    if (!sweptBlocked(body, dx, dy, obstacles))
        return { x: body.x + dx, y: body.y + dy, offset: 0, success: true, attempts };
    for (let distance = 1; distance <= max; distance++)
        for (const sign of [prefer, -prefer]) {
            const offset = distance * sign,
                cx = dy !== 0 ? offset : 0,
                cy = dy === 0 ? offset : 0;
            const shifted = { ...body, x: body.x + cx, y: body.y + cy };
            const ok = !sweptBlocked(body, cx, cy, obstacles) && !sweptBlocked(shifted, dx, dy, obstacles);
            attempts.push({ offset, ok });
            if (ok) return { x: shifted.x + dx, y: shifted.y + dy, offset, success: true, attempts };
        }
    return { x: body.x, y: body.y, offset: 0, success: false, attempts };
}
export function liftBonus(
    nowMs: number,
    recordedMs: number,
    graceMs: number,
    speed: number,
    samePlatform: boolean,
) {
    return samePlatform && nowMs >= recordedMs && nowMs - recordedMs <= graceMs ? speed : 0;
}
