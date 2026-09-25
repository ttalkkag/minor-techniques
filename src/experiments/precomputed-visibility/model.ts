export type Point = { x: number; y: number };
export type Target = Point & { id: number };
export type Segment = { a: Point; b: Point };
export type Camera = Point & { angle: number; fov: number };
export type Bake = {
    bins: number;
    samples: number;
    states: Set<number>[][];
    evaluations: number;
    bytes: number;
};

export const targets: Target[] = [20, 31, 55, 65].flatMap((y, row) =>
    Array.from({ length: 9 }, (_, col) => ({ id: row * 9 + col, x: 10 + col * 10, y })),
);
export const walls: Segment[] = [
    { a: { x: 5, y: 43 }, b: { x: 44, y: 43 } },
    { a: { x: 56, y: 43 }, b: { x: 95, y: 43 } },
];
export const door: Segment = { a: { x: 44, y: 43 }, b: { x: 56, y: 43 } };

export function rail(s: number): Point {
    const t = Math.max(0, Math.min(1, s));
    return { x: 10 + 80 * t, y: 76 + 5 * Math.sin(t * Math.PI * 2) };
}

export function cameraAt(s: number, deviation = 0, fov = 60): Camera {
    const p = rail(s);
    return { x: p.x, y: p.y + deviation, angle: -Math.PI / 2, fov };
}

export function relativeAngle(camera: Camera, p: Point): number {
    const angle = Math.atan2(p.y - camera.y, p.x - camera.x) - camera.angle;
    return Math.atan2(Math.sin(angle), Math.cos(angle));
}

export function blocks(a: Point, b: Point, wall: Segment): boolean {
    const rx = b.x - a.x;
    const ry = b.y - a.y;
    const sx = wall.b.x - wall.a.x;
    const sy = wall.b.y - wall.a.y;
    const cross = rx * sy - ry * sx;
    if (Math.abs(cross) < 1e-9) return false;
    const dx = wall.a.x - a.x;
    const dy = wall.a.y - a.y;
    const t = (dx * sy - dy * sx) / cross;
    const u = (dx * ry - dy * rx) / cross;
    return t > 1e-8 && t < 1 - 1e-8 && u >= 0 && u <= 1;
}

export function visible(camera: Camera, open: boolean, objects = targets): Set<number> {
    const occluders = open ? walls : [...walls, door];
    return new Set(
        objects
            .filter(
                (p) =>
                    Math.abs(relativeAngle(camera, p)) <= (camera.fov * Math.PI) / 360 + 1e-10 &&
                    !occluders.some((wall) => blocks(camera, p, wall)),
            )
            .map((p) => p.id),
    );
}

export function precompute(bins: number, samples: number, bothStates: boolean): Bake {
    const states = (bothStates ? [false, true] : [false]).map((open) =>
        Array.from({ length: bins }, (_, bin) => {
            const union = new Set<number>();
            for (let i = 0; i < samples; i++) {
                const s = (bin + i / (samples - 1)) / bins;
                for (const id of visible(cameraAt(s), open)) union.add(id);
            }
            return union;
        }),
    );
    return {
        bins,
        samples,
        states,
        evaluations: bins * samples * states.length,
        bytes: bins * Math.ceil(targets.length / 8) * states.length,
    };
}

export function binAt(s: number, bins: number): number {
    return Math.max(0, Math.min(bins - 1, Math.floor(s * bins)));
}

export function lookup(bake: Bake, s: number, open: boolean, neighbors: boolean): Set<number> {
    const state = bake.states[open && bake.states.length > 1 ? 1 : 0]!;
    const bin = binAt(s, bake.bins);
    const result = new Set(state[bin]);
    if (neighbors) {
        for (const adjacent of [bin - 1, bin + 1]) {
            for (const id of state[adjacent] ?? []) result.add(id);
        }
    }
    return result;
}

export function compare(required: Set<number>, submitted: Set<number>) {
    return {
        missing: new Set([...required].filter((id) => !submitted.has(id))),
        excess: new Set([...submitted].filter((id) => !required.has(id))),
    };
}
