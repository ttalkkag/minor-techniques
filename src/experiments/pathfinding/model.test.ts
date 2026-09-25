import { test } from 'node:test';
import assert from 'node:assert/strict';
import { astar, reverseField, counterexample, gridGraph } from './model.ts';
test('허용적 비일관 휴리스틱은 재개방해야 비용 4를 찾는다', () => {
    const h = (n: number) => (n === 2 ? 3 : 0);
    assert.equal(astar(counterexample, 0, 3, h, false).cost, 5);
    const r = astar(counterexample, 0, 3, h, true);
    assert.equal(r.cost, 4);
    assert.equal(r.reopens, 1);
    assert.equal(astar(counterexample, 0, 3, h, true, true).cost, 5);
});
test('역방향 비용장은 방향과 가중 비용을 보존한다', () => {
    const field = reverseField(counterexample, 3);
    for (let start = 0; start < 4; start++)
        assert.equal(field.distance[start], astar(counterexample, start, 3, () => 0).cost);
});
test('비용 0 동점에서도 다음 노드는 순환 없이 목표에 도달한다', () => {
    const g = [
            [
                { to: 1, cost: 0 },
                { to: 2, cost: 1 },
            ],
            [
                { to: 0, cost: 0 },
                { to: 2, cost: 1 },
            ],
            [],
        ],
        f = reverseField(g, 2);
    for (let s = 0; s < 2; s++) {
        let p = s,
            steps = 0;
        while (p !== 2 && steps < 5) {
            p = f.next[p];
            steps++;
        }
        assert.equal(p, 2);
        assert.ok(steps <= 2);
    }
});
test('문 폐쇄는 도달 불가이고 시작=목표 비용은 0이다', () => {
    assert.equal(astar(gridGraph(5, false, false).graph, 81, 94, () => 0).cost, Infinity);
    assert.equal(astar(counterexample, 0, 0, () => 0).cost, 0);
});
