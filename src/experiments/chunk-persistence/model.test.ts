import { test } from 'node:test';
import assert from 'node:assert/strict';
import { address, baseCell, effectiveCell, edit, selectionBounds, validSave } from './model.ts';
test('음수 청크는 floor로 분리되고 모든 로컬 좌표가 유효하다', () => {
    assert.deepEqual(address(-1), { chunk: -1, local: 7 });
    for (let x = -33; x < 34; x++) {
        const a = address(x);
        assert.ok(a.local >= 0 && a.local < 8);
        assert.equal(a.chunk * 8 + a.local, x);
    }
});
test('빈칸 수정은 직렬화와 재방문 후에도 기본 블록을 덮는다', () => {
    const save = edit({ seed: 7, version: 1, deltas: {} }, -1, 0, 0);
    assert.equal(baseCell(-1, 0, 7, 1), 1);
    assert.equal(effectiveCell(-1, 0, JSON.parse(JSON.stringify(save))), 0);
    assert.equal(Object.keys(save.deltas).length, 1);
});
test('세계 좌표는 생성 순서에 무관하고 생성 버전은 주변 바탕을 바꾼다', () => {
    const positions = [-16, -1, 0, 7, 16];
    assert.deepEqual(
        positions.map((x) => baseCell(x, 3, 7, 1)),
        positions
            .toReversed()
            .map((x) => baseCell(x, 3, 7, 1))
            .toReversed(),
    );
    let changed = 0;
    for (let x = -20; x < 20; x++)
        for (let y = 0; y < 8; y++) if (baseCell(x, y, 7, 1) !== baseCell(x, y, 7, 2)) changed++;
    assert.ok(changed > 10);
});
test('좌표 선택 범위에는 음수·양수 경계에서 보이는 이웃 청크 전체가 포함된다', () => {
    for (const x of [-33, -24, -16, -1, 0, 23, 31, 40]) {
        const center = address(x).chunk;
        const bounds = selectionBounds(x);
        for (let visibleX = (center - 1) * 8; visibleX < (center + 2) * 8; visibleX++) {
            assert.ok(visibleX >= bounds.min && visibleX <= bounds.max);
        }
    }
});
test('저장은 빈칸 0을 보존하고 손상된 셀 값·좌표·버전을 거절한다', () => {
    const save = { seed: 7, version: 1, deltas: { '-20,1': 0, '31,7': 1 } };
    assert.ok(validSave(JSON.parse(JSON.stringify(save))));
    for (const cell of [null, 2, -1, '0', false, {}])
        assert.equal(validSave({ ...save, deltas: { '-1,1': cell } }), false);
    for (const key of ['1,8', '1,-1', '1.5,1', '1,1,1', '', '-0,1', '9007199254740992,1'])
        assert.equal(validSave({ ...save, deltas: { [key]: 0 } }), false);
    for (const deltas of [null, [], 'data']) assert.equal(validSave({ ...save, deltas }), false);
    assert.equal(validSave({ ...save, version: 9 }), false);
    assert.equal(validSave({ ...save, seed: 8 }), false);
    assert.equal(validSave(null), false);
});
