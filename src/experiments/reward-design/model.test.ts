import assert from 'node:assert/strict';
import test from 'node:test';
import { simulate, learningTarget, parseValueEstimate, type Config } from './model.ts';
const config: Config = { mode: 'move', bonus: 0, death: 0, cost: 0, limit: 8, finite: false, gamma: 0.9 };
test('per-move reward favors a non-completing loop; success reward changes ranking', () => {
    const end = (route: 'loop' | 'safe', c: Config) => simulate(route, c).at(-1)!;
    assert.ok(end('loop', config).discounted > end('safe', config).discounted);
    assert.ok(
        end('safe', { ...config, mode: 'progress', bonus: 10 }).discounted >
            end('loop', { ...config, mode: 'progress', bonus: 10 }).discounted,
    );
});
test('backtracking cancels undiscounted displacement but leaves a discounted loop reward', () => {
    const end = simulate('loop', { ...config, mode: 'progress', limit: 2 }).at(-1)!;
    assert.equal(end.total, 0);
    assert.ok(Math.abs(end.discounted - (1 - config.gamma)) < 1e-12);
    assert.equal(simulate('loop', { ...config, mode: 'progress', gamma: 1 }).at(-1)!.discounted, 0);
});
test('external cutoff preserves bootstrap while terminal time limit removes it', () => {
    const external = simulate('safe', { ...config, limit: 4 }).at(-1)!,
        finite = simulate('safe', { ...config, limit: 4, finite: true }).at(-1)!;
    assert.equal(external.truncated, true);
    assert.equal(external.terminated, false);
    assert.equal(finite.terminated, true);
    assert.equal(learningTarget(1, 0.9, [8, 7], [4, 9], false, true), 4.6);
    assert.equal(learningTarget(1, 0.9, [8, 7], [4, 9], true, true), 1);
    assert.equal(learningTarget(1, 0.9, [8, 7], [4, 9], false, false), 9.1);
});

test('value estimates reject empty, non-finite and out-of-range input instead of converting it to a target', () => {
    for (const raw of ['', '   ', '1e309', '-1e309', 'NaN', 'Infinity', '100', '-100', '20.01', '-20.01', 'invalid'])
        assert.equal(parseValueEstimate(raw), null, raw);
    for (const [raw, value] of [['-20', -20], ['20', 20], ['0', 0], ['0.5', 0.5], ['-2e1', -20]] as const)
        assert.equal(parseValueEstimate(raw), value);
    assert.equal(learningTarget(1, 0.9, [8, 7], [parseValueEstimate('0.5')!, 9], false, true), 1.45);
});
