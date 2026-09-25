export interface PoolOptions {
    mode: 'pool' | 'new';
    rate: number;
    life: number;
    prewarm: number;
    capacity: number;
    overflow: 'grow' | 'reject';
    guard: boolean;
    early: boolean;
    burst: boolean;
}
export interface Instance {
    id: number;
    generation: number;
    used: boolean;
    active: boolean;
    destroyed: boolean;
    born: number;
    due: number;
}
export const defaults: PoolOptions = {
    mode: 'pool',
    rate: 20,
    life: 0.5,
    prewarm: 10,
    capacity: 10,
    overflow: 'grow',
    guard: true,
    early: false,
    burst: false,
};
export function simulate(o: PoolOptions, time: number, duration = 5) {
    const objects: Instance[] = [],
        idle: Instance[] = [],
        events: { at: number; kind: 'shot' | 'expire' | 'hit'; id: number; generation: number }[] = [],
        log: string[] = [];
    let created = 0,
        destroyed = 0,
        reuses = 0,
        firstUse = 0,
        shots = 0,
        dropped = 0,
        contaminated = 0,
        ignored = 0,
        maxActive = 0,
        returned = 0;
    const create = () => {
        const v = {
            id: ++created,
            generation: 0,
            used: false,
            active: false,
            destroyed: false,
            born: 0,
            due: 0,
        };
        objects.push(v);
        return v;
    };
    if (o.mode === 'pool')
        for (let i = 0; i < o.prewarm; i++) {
            const v = create();
            if (idle.length < o.capacity) idle.push(v);
            else {
                v.destroyed = true;
                destroyed++;
            }
        }
    const count = o.burst ? 15 : Math.ceil(duration * o.rate - 1e-9);
    for (let i = 0; i < count; i++)
        events.push({ at: o.burst ? 0 : i / o.rate, kind: 'shot', id: i, generation: 0 });
    while (events.length) {
        events.sort(
            (a, b) =>
                a.at -
                b.at +
                (Math.abs(a.at - b.at) < 1e-8
                    ? ((a.kind === 'shot' ? 1 : 0) - (b.kind === 'shot' ? 1 : 0)) * 1e-7
                    : 0),
        );
        const e = events.shift()!;
        if (e.at > time + 1e-8) break;
        if (e.kind === 'shot') {
            shots++;
            let v = o.mode === 'pool' ? idle.pop() : undefined;
            if (!v && o.mode === 'pool' && o.overflow === 'reject') {
                dropped++;
                continue;
            }
            v ??= create();
            if (v.used) reuses++;
            else firstUse++;
            v.used = true;
            v.active = true;
            v.generation++;
            v.born = e.at;
            v.due = e.at + o.life;
            events.push({ at: v.due, kind: 'expire', id: v.id, generation: v.generation });
            if (o.early && e.id % 3 === 0)
                events.push({ at: e.at + o.life * 0.35, kind: 'hit', id: v.id, generation: v.generation });
            log.push(`${e.at.toFixed(2)}s #${v.id} / 대여 ${v.generation} 시작`);
            maxActive = Math.max(maxActive, objects.filter((x) => x.active).length);
        } else {
            const v = objects[e.id - 1]!;
            if (!v.active || v.destroyed || (o.guard && v.generation !== e.generation)) {
                ignored++;
                continue;
            }
            if (v.generation !== e.generation) {
                contaminated++;
                log.push(`${e.at.toFixed(2)}s 오래된 타이머가 #${v.id}의 새 대여 종료`);
            } else log.push(`${e.at.toFixed(2)}s #${v.id} 반환 (${e.kind === 'hit' ? '충돌' : '수명'})`);
            v.active = false;
            returned++;
            if (o.mode === 'new' || idle.length >= o.capacity) {
                v.destroyed = true;
                destroyed++;
            } else idle.push(v);
        }
    }
    return {
        objects,
        active: objects.filter((v) => v.active),
        idle,
        created,
        destroyed,
        reuses,
        firstUse,
        shots,
        dropped,
        contaminated,
        ignored,
        maxActive,
        returned,
        log: log.slice(-6).reverse(),
    };
}
