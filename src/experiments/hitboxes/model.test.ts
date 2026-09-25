import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyHit, activeRound, overlap } from './model.ts';
test('head and torso over three active ticks cause one single-strike hit', () => {
    let hits = 0;
    const seen = new Set<string>();
    for (let tick = 0; tick < 15; tick++)
        for (const part of ['head', 'body']) {
            void part;
            const round = activeRound(tick, false);
            if (round >= 0 && applyHit(1, 'enemy', round, false, seen)) hits++;
        }
    assert.equal(hits, 1);
});
test('invulnerability does not consume a confirmed damage record', () => {
    const seen = new Set<string>();
    assert.equal(applyHit(1, 'enemy', 0, true, seen), false);
    assert.equal(applyHit(1, 'enemy', 0, false, seen), true);
    assert.equal(applyHit(1, 'enemy', 1, false, seen), true);
});
test('active window is half open and touching edges alone do not overlap', () => {
    assert.equal(activeRound(4, false), -1);
    assert.equal(activeRound(7, false), 0);
    assert.equal(activeRound(8, false), -1);
    assert.equal(overlap({ x: 0, y: 0, w: 1, h: 1 }, { x: 1, y: 0, w: 1, h: 1 }), false);
});
