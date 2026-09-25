export type Vec3 = [number, number, number];
export type Face = 'left' | 'right' | 'floor' | 'ceiling' | 'back' | 'furniture';
export interface Hit {
    point: Vec3;
    t: number;
    face: Face;
    uv: [number, number];
}
export function intersectRoom(p: Vec3, d: Vec3, depth: number): Hit | null {
    let hit: Hit | null = null;
    for (let axis = 0; axis < 3; axis++) {
        const direction = d[axis]!;
        if (Math.abs(direction) < 1e-9 || (axis === 2 && direction <= 0)) continue;
        const boundary = axis === 2 ? depth : direction > 0 ? 1 : -1;
        const t = (boundary - p[axis]!) / direction;
        if (t <= 1e-8 || (hit && t >= hit.t)) continue;
        const q: Vec3 = [p[0] + t * d[0], p[1] + t * d[1], p[2] + t * d[2]];
        if (
            q[0] < -1.000001 ||
            q[0] > 1.000001 ||
            q[1] < -1.000001 ||
            q[1] > 1.000001 ||
            q[2] < -0.000001 ||
            q[2] > depth + 0.000001
        )
            continue;
        const face: Face =
            axis === 0
                ? direction > 0
                    ? 'right'
                    : 'left'
                : axis === 1
                  ? direction > 0
                      ? 'ceiling'
                      : 'floor'
                  : 'back';
        const uv: [number, number] =
            axis === 0
                ? [q[2] / depth, (q[1] + 1) / 2]
                : axis === 1
                  ? [(q[0] + 1) / 2, q[2] / depth]
                  : [(q[0] + 1) / 2, (q[1] + 1) / 2];
        hit = { point: q, t, face, uv };
    }
    return hit;
}
export function furnitureAlpha(x: number, y: number): boolean {
    return (
        (Math.abs(x) < 0.67 && y > -0.62 && y < -0.18) ||
        (Math.abs(x) > 0.46 && Math.abs(x) < 0.58 && y > -0.92 && y < -0.6)
    );
}
export function trace(p: Vec3, d: Vec3, depth: number, furnitureZ: number | null): Hit | null {
    const wall = intersectRoom(p, d, depth);
    if (furnitureZ === null || d[2] <= 1e-9) return wall;
    const t = (furnitureZ - p[2]) / d[2];
    const point: Vec3 = [p[0] + t * d[0], p[1] + t * d[1], furnitureZ];
    if (t > 0 && (!wall || t < wall.t) && furnitureAlpha(point[0], point[1]))
        return { point, t, face: 'furniture', uv: [(point[0] + 1) / 2, (point[1] + 1) / 2] };
    return wall;
}
