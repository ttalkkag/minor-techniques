import test from 'node:test';
import assert from 'node:assert/strict';
import {
    initial,
    encode,
    validate,
    recover,
    MemorySave,
    packFlags,
    reverseCompletion,
    checksum,
} from './model.ts';
test('UTF-8 length, checksum and supported version are validated before restoration', () => {
    const game = { ...initial(), items: ['보석'], flags: 9 };
    assert.equal(validate(encode(game, 8)).ok, true);
    assert.equal(validate(encode(game, 8).slice(0, -2)).ok, false);
    assert.equal(validate(encode(game, 8, 3)).ok, false);
    assert.deepEqual(packFlags(9), [9, 0]);
});
test('v1 event numbers migrate to preserve meanings, including Korean item bytes', () => {
    const game = { ...initial(), items: ['보석'], flags: 1 },
        result = validate(encode(game, 8, 1));
    assert.equal(result.ok, true);
    if (result.ok) assert.deepEqual(result.value.game, game);
});
test('interruptions at every partial write preserve the previous valid generation', () => {
    for (let phase = 0; phase < 4; phase++) {
        const machine = new MemorySave();
        machine.request({ ...initial(), x: 70 });
        for (let i = 0; i < phase; i++) machine.step();
        assert.equal(machine.interrupt().selected?.result.value.generation, 7);
    }
    const machine = new MemorySave();
    machine.request({ ...initial(), x: 70 });
    for (let i = 0; i < 5; i++) machine.step();
    assert.equal(machine.interrupt().selected?.result.value.generation, 8);
});
test('snapshots stay fixed during game updates; incompatible or corrupt slots fall back', () => {
    const machine = new MemorySave(),
        game = initial();
    machine.request(game);
    game.x = 90;
    game.items.push('후발 아이템');
    for (let i = 0; i < 5; i++) machine.step();
    assert.equal(machine.interrupt().selected?.result.value.game.x, 12);
    assert.equal(recover(machine.slots, 1).selected?.result.value.generation, 7);
    assert.equal(recover({ A: 'broken', B: 'broken' }).selected, null);
    assert.equal(validate(encode({ ...initial(), flags: 1 }, 8)).ok, false);
});
test('queue order prevents an older completion overwriting the newest request', () => {
    assert.equal(recover(reverseCompletion(true, initial()).slots).selected?.result.value.generation, 9);
    assert.equal(recover(reverseCompletion(false, initial()).slots).selected?.result.value.generation, 8);
});
test('legacy raw event fields are validated before bitwise migration truncates them', () => {
    for (const events of [1.5, -4294967296, 4294967296, 65536, '1']) {
        const body = JSON.stringify({
            player: 'player-1',
            position: 12,
            inventory: [],
            events,
            random: 12345,
        });
        const record = `1|8|${new TextEncoder().encode(body).length}|${body}`;
        assert.equal(validate(`${record}|${checksum(record)}`).ok, false);
    }
});
test('delimiter characters inside legitimate JSON strings survive a save round trip', () => {
    const game = { ...initial(), playerId: 'player|1', items: ['A|B', '보석|문'] };
    for (const version of [1, 2]) {
        const result = validate(encode(game, 8, version));
        assert.equal(result.ok, true);
        if (result.ok) assert.deepEqual(result.value.game, game);
    }
});
