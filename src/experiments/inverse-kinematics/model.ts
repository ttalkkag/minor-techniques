export type Point = { x: number; y: number };
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
export function analytic(root: Point, target: Point, l1: number, l2: number, pole: number) {
    const raw = distance(root, target),
        d = Math.min(l1 + l2, Math.max(Math.abs(l1 - l2), raw));
    const ux = raw > 1e-10 ? (target.x - root.x) / raw : 0,
        uy = raw > 1e-10 ? (target.y - root.y) / raw : 1;
    const foot = { x: root.x + ux * d, y: root.y + uy * d };
    if (d < 1e-10)
        return { knee: { x: root.x - pole * l1, y: root.y }, foot, error: raw, clamped: raw > 1e-8 };
    const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d),
        h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    return {
        knee: { x: root.x + ux * a - uy * h * pole, y: root.y + uy * a + ux * h * pole },
        foot,
        error: distance(foot, target),
        clamped: Math.abs(raw - d) > 1e-8,
    };
}
export function fabrik(root: Point, target: Point, l1: number, l2: number, pole: number, iterations: number) {
    const limit = analytic(root, target, l1, l2, pole);
    if (limit.clamped) return { ...limit, iterations: 0 };
    const points = [
        { ...root },
        { x: root.x - pole * l1, y: root.y },
        { x: root.x - pole * l1, y: root.y + l2 },
    ];
    const lengths = [l1, l2];
    const directions = [
        { x: -pole, y: 0 },
        { x: 0, y: 1 },
    ];
    for (let n = 0; n < iterations; n++) {
        points[2] = { ...target };
        for (let i = 1; i >= 0; i--) {
            const d = distance(points[i], points[i + 1]);
            if (d > 1e-12)
                directions[i] = {
                    x: (points[i + 1].x - points[i].x) / d,
                    y: (points[i + 1].y - points[i].y) / d,
                };
            points[i] = {
                x: points[i + 1].x - directions[i].x * lengths[i],
                y: points[i + 1].y - directions[i].y * lengths[i],
            };
        }
        points[0] = { ...root };
        for (let i = 0; i < 2; i++) {
            const d = distance(points[i], points[i + 1]);
            if (d > 1e-12)
                directions[i] = {
                    x: (points[i + 1].x - points[i].x) / d,
                    y: (points[i + 1].y - points[i].y) / d,
                };
            points[i + 1] = {
                x: points[i].x + directions[i].x * lengths[i],
                y: points[i].y + directions[i].y * lengths[i],
            };
        }
    }
    return {
        knee: points[1],
        foot: points[2],
        error: distance(points[2], target),
        clamped: false,
        iterations,
    };
}
