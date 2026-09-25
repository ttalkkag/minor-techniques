import { test } from 'node:test';
import assert from 'node:assert/strict';
import { search, maze } from './model.ts';
import type { Rules } from './model.ts';
const rules: Rules = {
    keyRoom: 2,
    keyCount: 1,
    consumable: false,
    secondDoor: false,
    jump: 2,
    platform: false,
    bypass: false,
};
test('기하 연결은 열쇠 교착을 놓치고 상태 탐색은 거절한다', () => {
    assert.equal(search(rules, 'geometry').found, true);
    assert.equal(search(rules, 'state').found, false);
});
test('열쇠를 얻은 뒤 같은 방을 재방문해야 진행 가능하다', () => {
    const r = { ...rules, keyRoom: 1 };
    assert.equal(search(r, 'room').found, false);
    assert.equal(search(r, 'state').found, true);
    assert.equal(search({ ...r, platform: true }, 'state').found, false);
    assert.equal(search({ ...r, platform: true, jump: 3 }, 'state').found, true);
});
test('소모형 두 문은 두 열쇠가 필요하고 재방문으로 복제되지 않는다', () => {
    const r = { ...rules, keyRoom: 1, secondDoor: true, consumable: true };
    assert.equal(search(r, 'state').found, false);
    assert.equal(search({ ...r, keyCount: 2 }, 'state').found, true);
    assert.equal(search({ ...r, consumable: false }, 'state').found, true);
});
test('DFS가 모든 셀을 연결하고 추가 간선은 하나의 순환을 만든다', () => {
    for (let seed = 1; seed < 12; seed++) {
        const e = maze(seed, false);
        assert.equal(e.length, 24);
        const seen = new Set([0]);
        for (let i = 0; i < 25; i++)
            for (const [a, b] of e)
                if (seen.has(a) || seen.has(b)) {
                    seen.add(a);
                    seen.add(b);
                }
        assert.equal(seen.size, 25);
        assert.equal(maze(seed, true).length, 25);
    }
});
