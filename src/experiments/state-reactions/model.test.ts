import test from 'node:test';
import assert from 'node:assert/strict';
import { initialWorld, stepWorld, removeBody } from './model.ts';
test('water priority is order independent and emits no transient ignition', () => {
    for (const kinds of [
        ['water', 'fire'],
        ['fire', 'water'],
    ] as const) {
        const world = initialWorld();
        world.queue = kinds.map((kind) => ({ target: 0, kind }));
        stepWorld(world, 'water', 4, 20, false);
        assert.equal(world.bodies[0].burning, false);
        assert.equal(world.bodies[0].wet, 4);
        assert.equal(world.notifications, 1);
    }
});
test('arrival order can create transient ignition and extinction notifications', () => {
    const world = initialWorld();
    world.queue = [
        { target: 0, kind: 'fire' },
        { target: 0, kind: 'water' },
    ];
    stepWorld(world, 'arrival', 4, 20, false);
    assert.equal(world.notifications, 2);
    assert.equal(world.bodies[0].burning, false);
});
test('repeated fire contacts and cyclic propagation do not repeat ignition transitions', () => {
    const world = initialWorld(true);
    world.queue = [
        { target: 0, kind: 'fire' },
        { target: 0, kind: 'fire' },
    ];
    for (let i = 0; i < 30; i++) stepWorld(world, 'water', 4, 20, true);
    assert.equal(world.transitions, 5);
    assert.equal(world.notifications, 5);
    assert.ok(world.queue.length <= 6);
});
test('deleted queue targets are removed and budget overflow is deferred', () => {
    const world = initialWorld();
    world.queue = [
        { target: 0, kind: 'fire' },
        { target: 1, kind: 'water' },
    ];
    removeBody(world, 0);
    assert.equal(world.queue.length, 1);
    world.queue.push({ target: 2, kind: 'fire' });
    stepWorld(world, 'water', 4, 1, false);
    assert.equal(world.queue.length, 1);
    assert.equal(world.bodies.find((b) => b.id === 2)!.burning, false);
    stepWorld(world, 'water', 4, 1, false);
    assert.equal(world.bodies.find((b) => b.id === 2)!.burning, true);
});
