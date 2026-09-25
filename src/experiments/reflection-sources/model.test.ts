import test from "node:test";
import assert from "node:assert/strict";
import {
    reflect,
    mirrorRay,
    trace,
    targetVisibility,
    boxDirection,
    wallHit,
    circleHit,
    PROBE,
} from "./model.ts";
test("reflection is an involution and preserves vector length", () => {
    const p = { x: 1, z: 3 },
        reflected = reflect(p, { x: 0, z: 1 });
    assert.deepEqual(reflected, { x: 1, z: -3 });
    assert.deepEqual(reflect(reflected, { x: 0, z: 1 }), p);
    assert.equal(Math.hypot(p.x, p.z), Math.hypot(reflected.x, reflected.z));
});
test("offscreen target remains reachable by the mirror ray", () => {
    const camera = { x: 0, z: 5 },
        world = { target: { x: 3, z: 4 }, blocker: null };
    assert.equal(targetVisibility(camera, 0, world), "outside");
    const u = 3 / 9 / Math.tan((76 * Math.PI) / 360);
    const ray = mirrorRay(camera, 0, u);
    assert.equal(trace(ray.point, ray.direction, world).kind, "target");
    assert.ok(Math.abs(ray.point.x - 5 / 3) < 1e-8);
});
test("occluder can hide a target available inside the field of view", () => {
    assert.equal(
        targetVisibility({ x: 0, z: 5 }, 0, {
            target: { x: 0, z: 3 },
            blocker: { x: 0, z: 4 },
        }),
        "occluded",
    );
});
test("box projection makes capture ray meet the same room wall point", () => {
    const point = { x: 2, z: 0.0001 },
        direction = { x: 0, z: 1 };
    const a = wallHit(point, direction).point;
    const b = wallHit(PROBE, boxDirection(point, direction)).point;
    assert.ok(Math.hypot(a.x - b.x, a.z - b.z) < 1e-9);
});
test("a capture point inside an opaque circle reaches its positive exit intersection", () => {
    const world = { target: PROBE, blocker: null };
    for (const direction of [
        { x: 1, z: 0 },
        { x: -1, z: 0 },
        { x: 0, z: 1 },
        { x: 0, z: -1 },
    ]) {
        const hit = trace(PROBE, direction, world);
        assert.equal(hit.kind, "target");
        assert.ok(Math.abs(hit.distance - 0.4) < 1e-12);
    }
    assert.ok(
        Math.abs(
            circleHit({ x: 0.2, z: 2 }, { x: -1, z: 0 }, PROBE, 0.4) - 0.6,
        ) < 1e-12,
    );
    assert.ok(
        Math.abs(
            circleHit({ x: 0.4, z: 2 }, { x: -1, z: 0 }, PROBE, 0.4) - 0.8,
        ) < 1e-12,
    );
    assert.equal(
        circleHit({ x: 0.5, z: 2 }, { x: 1, z: 0 }, PROBE, 0.4),
        Infinity,
    );
});
