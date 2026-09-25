export type Config = {
    alpha: number;
    low: number;
    high: number;
    interval: number;
    hold: number;
    initial: number;
};
export type Row = {
    turn: number;
    failure: number;
    mean: number;
    level: number;
    naive: number;
    reason: string;
    changed: boolean;
};
export function replay(inputs: number[], c: Config): Row[] {
    let mean = 0.2,
        level = c.initial,
        naive = c.initial,
        last = -c.hold;
    return inputs.map((failure, i) => {
        const turn = i + 1;
        mean = (1 - c.alpha) * mean + c.alpha * failure;
        naive = Math.max(1, Math.min(5, naive + (failure ? -1 : 1)));
        let reason = '유지 구간',
            changed = false;
        if (turn % c.interval !== 0) reason = '재평가 간격 대기';
        else if (turn - last < c.hold) reason = '최소 유지 시간';
        else {
            const delta = mean > c.high ? -1 : mean < c.low ? 1 : 0;
            const next = Math.max(1, Math.min(5, level + delta));
            reason =
                delta === 0
                    ? '두 임계값 사이'
                    : next === level
                      ? '난이도 상하한'
                      : delta < 0
                        ? '평균 실패율이 상한 초과'
                        : '평균 실패율이 하한 미만';
            changed = next !== level;
            if (changed) last = turn;
            level = next;
        }
        return { turn, failure, mean, level, naive, reason, changed };
    });
}
