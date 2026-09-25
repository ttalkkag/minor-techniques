export type Options = {
    up: number;
    down: number;
    interpolation: number;
    window: number;
    hz: number;
    speed: number;
    mode: 'current' | 'mixed' | 'history';
    clock: 'aligned' | 'half';
    limit: 'reject' | 'clamp';
    door: 'closing' | 'opening' | 'none';
    subtick: boolean;
    teleport: boolean;
    claim: 'normal' | 'future' | 'forged';
};
export const defaults: Options = {
    up: 40,
    down: 40,
    interpolation: 40,
    window: 250,
    hz: 60,
    speed: 5,
    mode: 'history',
    clock: 'aligned',
    limit: 'reject',
    door: 'closing',
    subtick: true,
    teleport: false,
    claim: 'normal',
};
export const now = 1000;
export function positionAt(time: number, speed: number, teleport: boolean) {
    return 4 + (speed * (time - now)) / 1000 + (teleport && time >= 910 ? 2 : 0);
}
export function doorClosed(time: number, mode: Options['door']) {
    return mode === 'closing' ? time >= 940 : mode === 'opening' ? time < 940 : false;
}
export function sample(time: number, hz: number, speed: number, subtick: boolean, teleport: boolean) {
    const interval = 1000 / hz,
        before = Math.floor((time + 1e-9) / interval) * interval,
        after = before + interval;
    const alpha = Math.max(0, Math.min(1, (time - before) / interval));
    const a = positionAt(before, speed, teleport),
        b = positionAt(after, speed, teleport);
    const discontinuous = teleport && before < 910 && after >= 910;
    const x = !subtick ? a : discontinuous ? (time < 910 ? a : b) : a + (b - a) * alpha;
    return { x, before, after, alpha, discontinuous };
}
export function evaluate(options: Options, duplicate = false) {
    const visibleTime = now - options.up - options.down - options.interpolation;
    const aim = positionAt(visibleTime, options.speed, options.teleport);
    const current = positionAt(now, options.speed, options.teleport);
    let requested = options.clock === 'aligned' ? visibleTime : now - (options.up + options.down) / 2;
    if (options.claim === 'future') requested = now + 100;
    if (options.claim === 'forged') requested -= 80;
    let reason = duplicate
        ? '중복 명령: 이미 처리한 순번입니다.'
        : requested > now
          ? '미래 시각 명령 거부'
          : options.claim === 'forged'
            ? '서버의 시간 예산과 맞지 않는 시각 거부'
            : '';
    let q = requested;
    if (!reason && q < now - options.window) {
        if (options.limit === 'reject') reason = '저장 이력보다 오래된 명령 거부';
        else q = now - options.window;
    }
    if (options.mode === 'current') q = now;
    const past = sample(q, options.hz, options.speed, options.subtick, options.teleport);
    const queryX = options.mode === 'current' ? current : past.x;
    const doorTime = options.mode === 'history' ? q : now;
    const blocked = doorClosed(doorTime, options.door);
    const hit = !reason && !blocked && Math.abs(queryX - aim) <= 0.18;
    return {
        visibleTime,
        requested,
        q,
        aim,
        current,
        queryX,
        doorTime,
        blocked,
        hit,
        reason,
        past,
        clamped: requested !== q && options.mode !== 'current',
        outcome: reason || (blocked ? '문에 막힘' : hit ? '표적 명중' : '표적 빗나감'),
        bytes: (Math.ceil((options.window * options.hz) / 1000) + 1) * 100 * 64,
    };
}
