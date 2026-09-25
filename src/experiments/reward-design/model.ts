export type Route = 'loop' | 'direct' | 'safe';
export type RewardMode = 'move' | 'progress' | 'novelty';
export type Config = {
    mode: RewardMode;
    bonus: number;
    death: number;
    cost: number;
    limit: number;
    finite: boolean;
    gamma: number;
};
export type Step = {
    x: number;
    y: number;
    t: number;
    reward: number;
    progress: number;
    terminal: number;
    cost: number;
    total: number;
    discounted: number;
    terminated: boolean;
    truncated: boolean;
    outcome: string;
};
export function simulate(route: Route, config: Config): Step[] {
    let x = 0,
        y = 1,
        total = 0,
        discounted = 0;
    const visited = new Set(['0,1']);
    const result: Step[] = [];
    const safe = [
        [0, 2],
        [1, 2],
        [2, 2],
        [3, 2],
        [4, 2],
        [4, 1],
    ];
    for (let t = 1; t <= config.limit; t++) {
        const oldX = x;
        if (route === 'safe') [x, y] = safe[Math.min(t - 1, 5)];
        else if (route === 'direct') x++;
        else x = t % 2;
        const fresh = !visited.has(`${x},${y}`);
        visited.add(`${x},${y}`);
        const success = x === 4 && y === 1,
            dead = x === 3 && y === 1;
        const progress = config.mode === 'move' ? 1 : config.mode === 'progress' ? x - oldX : fresh ? 1 : 0;
        const terminal = success ? config.bonus : dead ? -config.death : 0;
        const reward = progress + terminal - config.cost;
        total += reward;
        discounted += reward * config.gamma ** (t - 1);
        const timeout = t === config.limit && !success && !dead;
        result.push({
            x,
            y,
            t,
            reward,
            progress,
            terminal,
            cost: -config.cost,
            total,
            discounted,
            terminated: success || dead || (timeout && config.finite),
            truncated: timeout && !config.finite,
            outcome: success
                ? '도착'
                : dead
                  ? '실패'
                  : timeout
                    ? config.finite
                        ? '시간 내 도착 실패'
                        : '외부 수집 중단'
                    : '진행',
        });
        if (success || dead || timeout) break;
    }
    return result;
}
export function learningTarget(
    reward: number,
    gamma: number,
    online: number[],
    target: number[],
    terminated: boolean,
    double: boolean,
): number {
    if (terminated) return reward;
    const chosen = online[0] >= online[1] ? 0 : 1;
    return reward + gamma * (double ? target[chosen] : Math.max(...target));
}

export function parseValueEstimate(raw: string): number | null {
    if (raw.trim() === '') return null;
    const value = Number(raw);
    return Number.isFinite(value) && value >= -20 && value <= 20 ? value : null;
}
