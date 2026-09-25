export type Game = { playerId: string; x: number; items: string[]; flags: number; rng: number };
export type RecordData = { version: number; generation: number; game: Game };
export type Validation = { ok: true; value: RecordData } | { ok: false; error: string };
export const initial = (): Game => ({ playerId: 'player-1', x: 12, items: [], flags: 0, rng: 12345 });
export const copy = (game: Game): Game => ({ ...game, items: [...game.items] });
export function checksum(text: string): string {
    let hash = 2166136261;
    for (const byte of new TextEncoder().encode(text)) hash = Math.imul(hash ^ byte, 16777619) >>> 0;
    return hash.toString(16).padStart(8, '0');
}
export function packFlags(flags: number): number[] {
    return [flags & 255, (flags >>> 8) & 255];
}
function swapEvents(flags: number) {
    return (flags & ~9) | ((flags & 1) << 3) | ((flags & 8) >>> 3);
}
export function payload(game: Game, version: number): string {
    return JSON.stringify(
        version === 1
            ? {
                  player: game.playerId,
                  position: game.x,
                  inventory: game.items,
                  events: swapEvents(game.flags),
                  random: game.rng,
              }
            : game,
    );
}
export function encode(game: Game, generation: number, version = 2): string {
    const body = payload(game, version),
        header = `${version}|${generation}|${new TextEncoder().encode(body).length}|`;
    return `${header}${body}|${checksum(header + body)}`;
}
export function validate(raw: string, supported = 2): Validation {
    const first = raw.indexOf('|'),
        second = raw.indexOf('|', first + 1),
        third = raw.indexOf('|', second + 1),
        last = raw.lastIndexOf('|');
    if (first < 0 || second <= first || third <= second || last <= third)
        return { ok: false, error: raw ? '기록이 중간에서 잘렸습니다.' : '빈 슬롯' };
    const v = raw.slice(0, first),
        gen = raw.slice(first + 1, second),
        length = raw.slice(second + 1, third),
        body = raw.slice(third + 1, last),
        check = raw.slice(last + 1);
    if (![v, gen, length].every((value) => /^\d+$/.test(value)))
        return { ok: false, error: '헤더 형식 오류' };
    const version = Number(v),
        generation = Number(gen);
    if (
        !Number.isSafeInteger(generation) ||
        generation < 1 ||
        Number(length) !== new TextEncoder().encode(body).length
    )
        return { ok: false, error: '세대 또는 본문 길이 오류' };
    if (checksum(`${v}|${gen}|${length}|${body}`) !== check) return { ok: false, error: '검사값 불일치' };
    if (version < 1 || version > Math.min(supported, 2))
        return { ok: false, error: `미지원 버전 ${version}` };
    let data: Record<string, unknown>;
    try {
        data = JSON.parse(body);
    } catch {
        return { ok: false, error: '본문 JSON 오류' };
    }
    if (!data || typeof data !== 'object' || Array.isArray(data))
        return { ok: false, error: '본문 구조 오류' };
    const rawFlags = version === 1 ? data.events : data.flags;
    if (typeof rawFlags !== 'number' || !Number.isInteger(rawFlags) || rawFlags < 0 || rawFlags > 65535)
        return { ok: false, error: '이벤트 비트 범위 오류' };
    const game = {
        playerId: version === 1 ? data.player : data.playerId,
        x: version === 1 ? data.position : data.x,
        items: version === 1 ? data.inventory : data.items,
        flags: version === 1 && typeof rawFlags === 'number' ? swapEvents(rawFlags) : rawFlags,
        rng: version === 1 ? data.random : data.rng,
    };
    if (
        typeof game.playerId !== 'string' ||
        typeof game.x !== 'number' ||
        !Number.isFinite(game.x) ||
        game.x < 0 ||
        game.x > 100 ||
        !Array.isArray(game.items) ||
        !game.items.every((item) => typeof item === 'string') ||
        !Number.isInteger(game.flags) ||
        Number(game.flags) < 0 ||
        Number(game.flags) > 65535 ||
        !Number.isInteger(game.rng) ||
        Number(game.rng) < 0 ||
        Number(game.rng) > 0xffffffff
    )
        return { ok: false, error: '게임 필드 범위 오류' };
    if (Number(game.flags) & 1 && !game.items.includes('보석'))
        return { ok: false, error: '상자 플래그와 보석 가방의 불일치' };
    return { ok: true, value: { version, generation, game: game as Game } };
}
export function recover(slots: { A: string; B: string }, supported = 2) {
    const values = (['A', 'B'] as const).map((slot) => ({ slot, result: validate(slots[slot], supported) }));
    const valid = values.filter(
        (entry): entry is { slot: 'A' | 'B'; result: { ok: true; value: RecordData } } => entry.result.ok,
    );
    valid.sort((a, b) => b.result.value.generation - a.result.value.generation);
    return { selected: valid[0] ?? null, values };
}
export type Job = {
    game: Game;
    generation: number;
    version: number;
    slot: 'A' | 'B';
    phase: number;
    header: string;
    body: string;
};
export class MemorySave {
    slots = { A: encode(initial(), 7, 1), B: '' };
    job: Job | null = null;
    queue: { game: Game; generation: number; version: number }[] = [];
    nextGeneration = 8;
    log = 'A에 정상 세대 7이 있습니다.';
    request(game: Game, version = 2) {
        this.queue.push({ game: copy(game), generation: this.nextGeneration++, version });
        this.log = `상태를 고정해 저장 요청을 받았습니다. 대기 ${this.queue.length}개`;
        if (!this.job) this.start();
    }
    private start() {
        const next = this.queue.shift();
        if (!next) return;
        const active = recover(this.slots).selected?.slot;
        const slot = active === 'A' ? 'B' : 'A',
            body = payload(next.game, next.version);
        this.job = {
            ...next,
            slot,
            body,
            header: `${next.version}|${next.generation}|${new TextEncoder().encode(body).length}|`,
            phase: 0,
        };
    }
    step() {
        const job = this.job;
        if (!job) {
            this.log = '먼저 저장을 요청하세요.';
            return;
        }
        job.phase++;
        if (job.phase === 1) this.slots[job.slot] = job.header;
        if (job.phase === 2)
            this.slots[job.slot] = job.header + job.body.slice(0, Math.floor(job.body.length / 2));
        if (job.phase === 3) this.slots[job.slot] = job.header + job.body;
        if (job.phase === 4) this.slots[job.slot] = encode(job.game, job.generation, job.version);
        this.log = `${job.slot} · 세대 ${job.generation} · ${['', '헤더 기록', '본문 절반 기록', '본문 전체 기록', '검사값 기록', '읽어서 검증'][job.phase]}`;
        if (job.phase === 5) {
            const result = validate(this.slots[job.slot]);
            this.log += result.ok ? ' 성공' : ` 실패: ${result.error}`;
            this.job = null;
            this.start();
        }
    }
    interrupt(supported = 2) {
        this.job = null;
        this.queue = [];
        const result = recover(this.slots, supported);
        this.log = result.selected
            ? `${result.selected.slot}의 지원 가능한 정상 세대 ${result.selected.result.value.generation} 복원`
            : '두 슬롯 모두 복구 불가 · 저장본을 덮지 않았습니다.';
        return result;
    }
}
export function reverseCompletion(queued: boolean, base: Game) {
    const machine = new MemorySave(),
        older = copy(base),
        newer = copy(base);
    older.x = Math.min(98, base.x + 1);
    newer.x = Math.min(99, base.x + 2);
    if (queued) {
        machine.request(older);
        machine.request(newer);
        for (let i = 0; i < 10; i++) machine.step();
    } else {
        machine.slots.B = encode(newer, 9);
        machine.slots.B = encode(older, 8);
        machine.nextGeneration = 10;
    }
    machine.log = queued
        ? '순서 보장: 요청 8 검증 뒤 9를 다른 슬롯에 기록했습니다.'
        : '경쟁 재현: 두 요청이 B를 골라 9 완료 뒤 늦은 8이 덮었습니다.';
    return machine;
}
