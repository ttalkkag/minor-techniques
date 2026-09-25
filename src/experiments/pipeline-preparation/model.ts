export interface PreparationOptions {
    coverage: 'observed' | 'needed' | 'all' | 'none';
    request: number;
    queue: number;
    duration: number;
    workers: number;
    need: number;
    failure: boolean;
    policy: 'wait' | 'hide' | 'fallback' | 'loading';
}
export interface Job {
    id: number;
    request: number;
    start: number;
    finish: number;
    ready: number | null;
    need: number | null;
    worker: number;
    missed: boolean;
}
export const defaults: PreparationOptions = {
    coverage: 'needed',
    request: 0,
    queue: 20,
    duration: 40,
    workers: 1,
    need: 50,
    failure: false,
    policy: 'wait',
};
export const needed = [0, 5, 9];
export function schedule(o: PreparationOptions): Job[] {
    const pre =
        o.coverage === 'all'
            ? Array.from({ length: 10 }, (_, i) => i)
            : o.coverage === 'needed'
              ? needed
              : o.coverage === 'observed'
                ? [0]
                : [];
    const ids = [...new Set([...pre, ...needed])];
    const free = Array(o.workers).fill(o.queue) as number[];
    const jobs = ids
        .map((id) => ({
            id,
            request: pre.includes(id) ? o.request : o.need + needed.indexOf(id) * 40,
            need: needed.includes(id) ? o.need + needed.indexOf(id) * 40 : null,
            missed: !pre.includes(id),
        }))
        .sort((a, b) => a.request - b.request || a.id - b.id);
    return jobs.map((j) => {
        const worker = free.indexOf(Math.min(...free)),
            start = Math.max(j.request, free[worker]!),
            finish = start + o.duration;
        free[worker] = finish;
        return { ...j, start, finish, ready: o.failure && j.id === 5 ? null : finish, worker };
    });
}
export function presentation(o: PreparationOptions, time: number, id: number) {
    const scheduled = schedule(o);
    const initial =
        o.policy === 'loading'
            ? Math.max(...scheduled.filter((j) => j.need !== null).map((j) => j.finish))
            : 0;
    const jobs = scheduled.map((j) => ({ ...j, effectiveNeed: j.need === null ? null : j.need + initial })),
        job = jobs.find((j) => j.id === id)!,
        need = job.need!,
        effectiveNeed = job.effectiveNeed!,
        delay = job.ready === null ? null : Math.max(0, job.ready - effectiveNeed);
    const gameTime =
        o.policy === 'loading'
            ? Math.max(0, time - initial)
            : o.policy === 'wait'
              ? time - Math.max(0, Math.min(time - need, (job.ready ?? job.finish) - need))
              : time;
    const status =
        time < job.request
            ? '미요청'
            : time < job.start
              ? '대기열'
              : time < job.finish
                ? '준비 중'
                : job.ready === null
                  ? '준비 실패'
                  : '준비 성공';
    const neededNow = gameTime >= need - 1e-8;
    const appearance = !neededNow
        ? '아직 필요 없음'
        : job.ready !== null && time >= job.ready
          ? '완성 재질'
          : time >= job.finish && job.ready === null
            ? '실패 대체'
            : o.policy === 'fallback'
              ? '기본 재질'
              : o.policy === 'hide'
                ? '표시 보류'
                : '프레임 대기';
    return {
        jobs,
        job,
        delay,
        initial,
        effectiveNeed,
        gameTime,
        status,
        appearance,
        memory: jobs.filter((j) => j.ready !== null && j.ready <= time).length * 2,
    };
}
