import { test } from 'node:test';
import assert from 'node:assert/strict';
import { expected, update, evaluate, initialQueue } from './model.ts';
test('Elo expectations and symmetric zero-sum update', () => {
    assert.ok(Math.abs(expected(1500, 1600) - 0.359935) < 1e-6);
    assert.ok(Math.abs(expected(1500, 1900) - 0.090909) < 1e-6);
    for (const score of [0, 0.5, 1]) {
        const r = update(1500, 1600, 20, score);
        assert.equal(r.a + r.b, 3100);
    }
    const diff = 400 * Math.log10(3);
    assert.ok(Math.abs(update(1500, 1500 - diff, 20, 1).delta - 5) < 1e-10);
    assert.ok(Math.abs(update(1500, 1500 - diff, 20, 0.5).delta + 5) < 1e-10);
});
test('waiting expands only rating constraint, not ping or party', () => {
    const a = evaluate(initialQueue(), 1500, 0, 40, 20, 80, 1, 'KR');
    assert.equal(a.best, null);
    const b = evaluate(initialQueue(), 1500, 40, 40, 20, 80, 1, 'KR');
    assert.equal(b.best?.id, 'C');
    assert.ok(b.rows.find((r) => r.id === 'B')!.reasons.includes('핑 초과'));
    assert.ok(b.rows.find((r) => r.id === 'D')!.reasons.includes('파티 크기'));
});
