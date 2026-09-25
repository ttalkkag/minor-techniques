import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initial, score, choose, execute, editState } from './model.ts';
test('low HP chooses healing and PP zero never becomes eligible', () => {
    const r = choose(initial(), 1, false);
    assert.equal(r.picked?.id, 'heal');
    assert.equal(r.rows.find((m) => m.id === 'poison')!.cost, 30);
    assert.equal(r.rows.find((m) => m.id === 'heavy')!.available, false);
    assert.equal(r.consumed, false);
    assert.equal(r.seed, initial().seed);
});
test('damage type never changes utility cost in corrected model', () => {
    assert.equal(score(initial(), 2, false).find((m) => m.id === 'heal')!.cost, 15);
    assert.equal(score(initial(), 2, true).find((m) => m.id === 'heal')!.cost, 7);
    assert.equal(choose({ ...initial(), hp: 100 }, 1, false).picked?.id, 'normal');
});
test('ties consume RNG only when needed, empty set does not invent move', () => {
    const s = { ...initial(), poisoned: false, hp: 70 };
    assert.equal(choose(s, 1, false).consumed, true);
    assert.equal(choose(s, 1, false, true).picked, null);
    const r = execute(initial(), 'heal', 1);
    assert.equal(r.hp, 60);
    assert.equal(r.moves[2]!.pp, 2);
    assert.equal(execute(initial(), 'heavy', 1).enemy, 100);
});
test('editing one combat field preserves turns beyond the initial slider range', () => {
    const afterAttack = execute({ ...initial(), turn: 99 }, 'normal', 1);
    assert.equal(afterAttack.turn, 100);
    const afterHp = editState(afterAttack, { hp: 31 });
    const afterStatus = editState(afterHp, { poisoned: false });
    const afterPp = editState(afterStatus, { heavyPp: 5 });
    assert.equal(afterPp.turn, 100);
    assert.equal(afterPp.hp, 31);
    assert.equal(afterPp.poisoned, false);
    assert.equal(afterPp.enemy, 80);
    assert.equal(afterPp.moves.find((m) => m.id === 'normal')!.pp, 9);
    assert.equal(afterPp.moves.find((m) => m.id === 'heavy')!.pp, 5);
    assert.equal(execute(afterPp, 'normal', 1).turn, 101);
    assert.equal(editState(afterPp, { turn: 1 }).turn, 1);
});
