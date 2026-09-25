export type Point = { x: number; y: number };
export function clearSight(p: Point, q: Point, center: Point, radius: number) {
    const dx = q.x - p.x,
        dy = q.y - p.y,
        length2 = dx * dx + dy * dy,
        t = Math.max(0, Math.min(1, ((center.x - p.x) * dx + (center.y - p.y) * dy) / (length2 || 1)));
    return Math.hypot(p.x + dx * t - center.x, p.y + dy * t - center.y) > radius;
}
export function landmarkProjection(p: Point, q: Point, heading: number, width: number) {
    const bearing = Math.atan2(q.y - p.y, q.x - p.x) - heading,
        angle = Math.atan2(Math.sin(bearing), Math.cos(bearing)),
        x = width / 2 + Math.tan(angle) * width * 0.5;
    return { x, onScreen: width > 0 && Math.cos(angle) > 0 && x + 17 > 0 && x - 17 < width };
}
