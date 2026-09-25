import test from 'node:test';
import assert from 'node:assert/strict';
import { walls, blocked, cameraFraction } from './model.ts';
test('a diameter wider than door blocks even centered movement', () => {
    assert.equal(blocked(0, 0, 0.4, walls(0.6)), true);
    assert.equal(blocked(0, 0, 0.4, walls(1.2)), false);
    assert.equal(blocked(0.3, 0, 0.4, walls(1.2)), true);
});
test('camera shoulder can hit frame while centered player fits', () => {
    const g = walls(1.2);
    assert.equal(blocked(0, 0.8, 0.4, g), false);
    assert.ok(cameraFraction(0, 0.8, 1.5, -3, 0.2, g) < 1);
    assert.equal(cameraFraction(0, 0.8, 0, -3, 0.2, g), 1);
});
test('exact door contact is consistent across decimal widths without allowing penetration', () => {
    for (const width of [0.6, 0.8, 1.2]) {
        const radius = width / 2;
        assert.equal(blocked(0, 0, radius, walls(width)), false);
        assert.equal(blocked(0.00001, 0, radius, walls(width)), true);
    }
});
