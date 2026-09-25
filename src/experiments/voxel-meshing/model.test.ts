import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blocks, mesh, qef } from './model.ts';
test('꽉 찬 n³ 데이터는 6n³, 6n², 6개 사각형으로 표현된다', () => {
    for (const n of [2, 4, 6]) {
        const b = blocks(n, 'solid', false, false);
        assert.equal(mesh(b, n, 'cubes', 'empty').length, 6 * n ** 3);
        assert.equal(mesh(b, n, 'exposed', 'empty').length, 6 * n ** 2);
        assert.equal(mesh(b, n, 'greedy', 'empty').length, 6);
    }
});
test('병합은 재질을 보존하고 표면 면적이 노출 면과 같다', () => {
    for (const pattern of ['solid', 'checker', 'hollow', 'terrain']) {
        const b = blocks(5, pattern, true, true),
            exposed = mesh(b, 5, 'exposed', 'empty'),
            greedy = mesh(b, 5, 'greedy', 'empty');
        assert.equal(
            greedy.reduce((sum, q) => sum + q.w * q.h, 0),
            exposed.length,
        );
        for (const material of [1, 2])
            assert.equal(
                greedy.filter((q) => q.material === material).reduce((s, q) => s + q.w * q.h, 0),
                exposed.filter((q) => q.material === material).length,
            );
    }
});
test('채워진 이웃은 청크 경계 면 n²개를 제거한다', () => {
    const b = blocks(4, 'solid', false, false);
    assert.equal(mesh(b, 4, 'exposed', 'empty').length - mesh(b, 4, 'exposed', 'solid').length, 16);
});
test('직교 접평면은 정확한 교점을 주고 거의 평행하면 외부 해가 생긴다', () => {
    const r = qef(Math.PI / 2, false);
    assert.ok(Math.abs(r.vertex[0] - 0.3) < 1e-12);
    assert.ok(Math.abs(r.vertex[1] - 0.65) < 1e-12);
    assert.ok(r.error < 1e-20);
    assert.ok(qef(0.03, false).vertex[1] > 1);
    assert.ok(qef(0.03, true).vertex[1] < 1);
});
