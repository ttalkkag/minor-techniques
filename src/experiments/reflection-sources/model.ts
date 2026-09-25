export type Point = { x: number; z: number };
export type World = { target: Point; blocker: Point | null };
export const FOV = (76 * Math.PI) / 180;
export const PROBE: Point = { x: 0, z: 2 };
export const normalized = (p: Point): Point => {
    const l = Math.hypot(p.x, p.z);
    return { x: p.x / l, z: p.z / l };
};
export function reflect(p: Point, normal: Point): Point {
    const dot = p.x * normal.x + p.z * normal.z;
    return { x: p.x - 2 * normal.x * dot, z: p.z - 2 * normal.z * dot };
}
export function circleHit(
    origin: Point,
    direction: Point,
    center: Point,
    radius: number,
): number {
    const dx = origin.x - center.x,
        dz = origin.z - center.z;
    const b = dx * direction.x + dz * direction.z;
    const discriminant = b * b - dx * dx - dz * dz + radius * radius;
    if (discriminant < 0) return Infinity;
    const root = Math.sqrt(discriminant);
    const near = -b - root,
        far = -b + root;
    return near > 0.001 ? near : far > 0.001 ? far : Infinity;
}
export function wallHit(
    origin: Point,
    direction: Point,
): { point: Point; distance: number } {
    const distances = [
        direction.x > 0
            ? (5 - origin.x) / direction.x
            : direction.x < 0
              ? (-5 - origin.x) / direction.x
              : Infinity,
        direction.z > 0
            ? (7 - origin.z) / direction.z
            : direction.z < 0
              ? -origin.z / direction.z
              : Infinity,
    ];
    const distance = Math.min(...distances.filter((t) => t > 0.0001));
    return {
        point: {
            x: origin.x + direction.x * distance,
            z: origin.z + direction.z * distance,
        },
        distance,
    };
}
export function trace(origin: Point, direction: Point, world: World) {
    const wall = wallHit(origin, direction);
    const target = circleHit(origin, direction, world.target, 0.4);
    const blocker = world.blocker
        ? circleHit(origin, direction, world.blocker, 0.3)
        : Infinity;
    const distance = Math.min(wall.distance, target, blocker);
    const kind =
        distance === target
            ? "target"
            : distance === blocker
              ? "blocker"
              : "wall";
    return {
        kind,
        distance,
        point: {
            x: origin.x + direction.x * distance,
            z: origin.z + direction.z * distance,
        },
    };
}
export function visible(
    camera: Point,
    yaw: number,
    point: Point,
    world: World,
): boolean {
    const v = { x: point.x - camera.x, z: point.z - camera.z };
    const angle = Math.atan2(v.x, -v.z) - yaw;
    if (Math.abs(Math.atan2(Math.sin(angle), Math.cos(angle))) > FOV / 2)
        return false;
    const hit = trace(camera, normalized(v), world);
    return hit.distance >= Math.hypot(v.x, v.z) - 0.015;
}
export function targetVisibility(
    camera: Point,
    yaw: number,
    world: World,
): "visible" | "outside" | "occluded" {
    const v = { x: world.target.x - camera.x, z: world.target.z - camera.z };
    const angle = Math.atan2(v.x, -v.z) - yaw;
    if (Math.abs(Math.atan2(Math.sin(angle), Math.cos(angle))) > FOV / 2)
        return "outside";
    return world.blocker &&
        circleHit(camera, normalized(v), world.blocker, 0.3) <
            Math.hypot(v.x, v.z) - 0.4
        ? "occluded"
        : "visible";
}
export function mirrorRay(camera: Point, yaw: number, u: number) {
    const angle = yaw + Math.atan(u * Math.tan(FOV / 2));
    const direction = { x: Math.sin(angle), z: -Math.cos(angle) };
    const distance = -camera.z / direction.z;
    const point = { x: camera.x + distance * direction.x, z: 0.0001 };
    return {
        point,
        direction: reflect(direction, { x: 0, z: 1 }),
        valid: Math.abs(point.x) <= 5 && distance > 0,
    };
}
export function boxDirection(point: Point, direction: Point): Point {
    const hit = wallHit(point, direction).point;
    return normalized({ x: hit.x - PROBE.x, z: hit.z - PROBE.z });
}
