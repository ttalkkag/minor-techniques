import test from 'node:test';
import assert from 'node:assert/strict';
import { defaults, schedule, presentation } from './model.ts';
test('request, queue start, ready, and first need remain separate timestamps', () => {
    const j = schedule(defaults).find((j) => j.id === 0)!;
    assert.equal(j.request, 0);
    assert.equal(j.start, 20);
    assert.equal(j.ready, 60);
    assert.equal(presentation(defaults, 55, 0).delay, 10);
    assert.equal(presentation(defaults, 55, 0).gameTime, 50);
});
test('a missing collection requests preparation at first need', () => {
    const j = schedule({ ...defaults, coverage: 'none' }).find((j) => j.id === 0)!;
    assert.equal(j.request, 50);
    assert.equal(j.ready, 90);
    assert.equal(j.missed, true);
});
test('worker intervals never overlap and extra workers can reduce lateness', () => {
    const jobs = schedule({ ...defaults, coverage: 'all', workers: 3 });
    for (let w = 0; w < 3; w++) {
        const on = jobs.filter((j) => j.worker === w);
        for (let i = 1; i < on.length; i++) assert.ok(on[i]!.start >= on[i - 1]!.finish);
    }
    assert.ok(
        schedule({ ...defaults, workers: 2 }).find((j) => j.id === 9)!.finish <
            schedule(defaults).find((j) => j.id === 9)!.finish,
    );
});
test('completion may fail and a fallback does not freeze the moving scene', () => {
    const o = { ...defaults, failure: true, policy: 'fallback' as const };
    const p = presentation(o, 150, 5);
    assert.equal(p.job.ready, null);
    assert.equal(p.delay, null);
    assert.equal(p.appearance, '실패 대체');
    assert.equal(p.gameTime, 150);
});

test('loading shifts every first-use marker onto the same wall-clock timeline', () => {
    const options = { ...defaults, policy: 'loading' as const };
    const p = presentation(options, 55, 0);
    assert.equal(p.initial, 140);
    assert.equal(p.job.ready, 60);
    assert.equal(p.effectiveNeed, 190);
    assert.deepEqual(
        p.jobs.map((j) => j.effectiveNeed),
        [190, 230, 270],
    );
    assert.equal(p.job.effectiveNeed, p.effectiveNeed);
    assert.equal(p.delay, 0);
    assert.equal(presentation(options, 189, 0).appearance, '아직 필요 없음');
    assert.equal(presentation(options, 190, 0).appearance, '완성 재질');
});
