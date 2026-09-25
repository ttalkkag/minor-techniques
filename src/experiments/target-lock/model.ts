export type V = { x: number; z: number };
export function basis(p: V, q: V, previous: V = { x: 0, z: 1 }) {
    const dx = q.x - p.x,
        dz = q.z - p.z,
        n = Math.hypot(dx, dz);
    const forward = n > 0.0001 ? { x: dx / n, z: dz / n } : previous;
    return { forward, right: { x: forward.z, z: -forward.x } };
}
export function groupBounds(p: V, q: V, r: number, include: boolean) {
    const pr = include ? 0.5 : 0,
        qr = include ? r : 0;
    return {
        left: Math.min(p.x - pr, q.x - qr),
        right: Math.max(p.x + pr, q.x + qr),
        bottom: Math.min(p.z - pr, q.z - qr),
        top: Math.max(p.z + pr, q.z + qr),
    };
}
