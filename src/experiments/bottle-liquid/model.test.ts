import { test } from 'node:test';
import assert from 'node:assert/strict';
import { volumeSamples, volumeBelow, levelForVolume, clipLiquid, outline, oscillatorStep } from './model.ts';
test('회전 원통의 부피와 부피 목표가 유지된다', () => {
    const samples = volumeSamples('cylinder', 110);
    const full = volumeBelow(samples, 0, 1, 3);
    assert.ok(Math.abs(full - Math.PI * 0.8 ** 2 * 3) / full < 0.002);
    for (const angle of [0, 0.4, 1.4])
        for (const fraction of [0.15, 0.5, 0.8]) {
            const nx = Math.sin(angle),
                ny = Math.cos(angle);
            const h = levelForVolume(samples, nx, ny, fraction);
            assert.ok(Math.abs(volumeBelow(samples, nx, ny, h) / full - fraction) < 0.01);
        }
});
test('어깨가 있는 병은 고정 높이에서 기울이면 양이 변한다', () => {
    const s = volumeSamples('bottle');
    const h = levelForVolume(s, 0, 1, 0.4);
    const total = volumeBelow(s, 0, 1, 3);
    assert.ok(Math.abs(volumeBelow(s, Math.sin(1.2), Math.cos(1.2), h) / total - 0.4) > 0.15);
});
test('잘린 다각형은 모두 수면 아래이며 감쇠 진동이 정지한다', () => {
    for (const p of clipLiquid(outline('bottle'), 0.5, Math.sqrt(0.75), 0.2))
        assert.ok(0.5 * p.x + Math.sqrt(0.75) * p.y <= 0.200001);
    let angle = 0.4,
        velocity = 0;
    for (let i = 0; i < 2400; i++) [angle, velocity] = oscillatorStep(angle, velocity, 0.3, 1 / 240);
    assert.ok(Math.abs(angle) + Math.abs(velocity) < 0.0001);
});
