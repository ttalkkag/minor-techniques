export interface StreamOptions {
    speed: number;
    prediction: number;
    sight: number;
    queue: number;
    read: number;
    prepare: number;
    budget: number;
    retain: boolean;
    gate: boolean;
    turns: number[];
}
export interface Chunk {
    id: number;
    status: 'absent' | 'queued' | 'loading' | 'ready';
    request: number | null;
    start: number | null;
    ready: number | null;
    need: number | null;
    unload: number | null;
    loads: number;
}
export const defaults: StreamOptions = {
    speed: 6,
    prediction: 30,
    sight: 0,
    queue: 1,
    read: 2,
    prepare: 1,
    budget: 96,
    retain: false,
    gate: true,
    turns: [],
};
export function firstMargin(o: StreamOptions) {
    return (Math.min(30, o.prediction) - o.sight) / o.speed - o.queue - o.read - o.prepare;
}
export function stream(o: StreamOptions, time: number) {
    const chunks: Chunk[] = Array.from({ length: 5 }, (_, id) => ({
        id,
        status: id === 0 ? 'ready' : 'absent',
        request: id === 0 ? 0 : null,
        start: id === 0 ? 0 : null,
        ready: id === 0 ? 0 : null,
        need: id === 0 ? 0 : null,
        unload: null,
        loads: id === 0 ? 1 : 0,
    }));
    let x = 0,
        dir = 1,
        waiting = 0,
        peak = 48,
        memory = 48,
        memoryBlocked = false,
        missing = 0;
    const log: string[] = [];
    const index = (value: number) => Math.max(0, Math.min(4, Math.floor(value / 30)));
    const event = (t: number, message: string) => log.push(`${t.toFixed(2)}s ${message}`);
    const usage = () =>
        16 +
        chunks.filter((c) => c.status === 'ready' || c.status === 'loading').length * 32 +
        (chunks.some((c) => c.status === 'loading') ? 16 : 0);
    const dt = 0.05;
    const turns = [...o.turns].sort((a, b) => a - b);
    for (let t = 0; t <= time + 1e-8;) {
        dir = turns.filter((turn) => turn <= t + 1e-8).length % 2 ? -1 : 1;
        for (const c of chunks)
            if (c.status === 'loading' && t >= c.ready! - 1e-8) {
                c.status = 'ready';
                event(t, `${String.fromCharCode(65 + c.id)} 준비 완료`);
            }
        const current = index(x + dir * 1e-7);
        for (const c of chunks) {
            const behind = dir > 0 ? c.id < current : c.id > current;
            const distance = dir > 0 ? x - (c.id + 1) * 30 : c.id * 30 - x;
            if (c.status === 'ready' && behind && distance >= (o.retain ? 10 : 0) - 1e-8) {
                c.status = 'absent';
                c.unload = t;
                event(t, `${String.fromCharCode(65 + c.id)} 해제`);
            }
        }
        const near = index(x + dir * o.sight),
            target = index(x + dir * o.prediction);
        for (let id = Math.min(current, target); id <= Math.max(current, target); id++) {
            const c = chunks[id]!;
            if (c.status === 'absent') {
                c.status = 'queued';
                c.request = t;
                c.start = null;
                c.ready = null;
                event(t, `${String.fromCharCode(65 + id)} 요청`);
            }
        }
        for (let id = Math.min(current, near); id <= Math.max(current, near); id++) {
            const c = chunks[id]!;
            if (c.need === null) {
                c.need = t;
                event(t, `${String.fromCharCode(65 + id)} 최초 필요`);
            }
        }
        memoryBlocked = false;
        if (!chunks.some((c) => c.status === 'loading')) {
            const candidates = chunks
                .filter((c) => c.status === 'queued')
                .sort((a, b) => Math.abs((a.id + 0.5) * 30 - x) - Math.abs((b.id + 0.5) * 30 - x));
            const c = candidates[0];
            if (c && t >= c.request! + o.queue - 1e-8) {
                if (usage() + 32 + 16 <= o.budget) {
                    c.status = 'loading';
                    c.start = t;
                    c.ready = t + o.read + o.prepare;
                    c.loads++;
                    event(t, `${String.fromCharCode(65 + c.id)} 읽기 시작`);
                } else memoryBlocked = true;
            }
        }
        memory = usage();
        peak = Math.max(peak, memory);
        missing = chunks.filter(
            (c) => c.id >= Math.min(current, near) && c.id <= Math.max(current, near) && c.status !== 'ready',
        ).length;
        const collisionIndex = index(Math.max(0, Math.min(149.99, x + dir * o.speed * dt)) + dir * 1e-7);
        if (
            o.gate &&
            chunks[collisionIndex]!.status !== 'ready' &&
            (collisionIndex < Math.min(current, near) || collisionIndex > Math.max(current, near))
        )
            missing++;
        if (t >= time - 1e-8) break;
        const nextTurn = turns.find((turn) => turn > t + 1e-8) ?? Infinity;
        const step = Math.min(dt, time - t, nextTurn - t),
            next = Math.max(0, Math.min(149.99, x + dir * o.speed * step)),
            nextIndex = index(next + dir * 1e-7);
        if (o.gate && chunks[nextIndex]!.status !== 'ready') {
            const c = chunks[nextIndex]!;
            if (c.need === null) {
                c.need = t + step;
                event(t + step, `${String.fromCharCode(65 + c.id)} 진입 필요`);
            }
            waiting += step;
            if (nextIndex !== current) x = dir > 0 ? nextIndex * 30 - 1e-6 : (nextIndex + 1) * 30 + 1e-6;
        } else x = next;
        t += step;
    }
    return {
        x,
        dir,
        chunks,
        waiting,
        peak,
        memory,
        memoryBlocked,
        missing,
        log: log.slice(-6).reverse(),
        loads: chunks.reduce((sum, c) => sum + c.loads, 0),
    };
}
