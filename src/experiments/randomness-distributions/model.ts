export type Rule = 'independent' | 'ceiling' | 'bag' | 'cumulative';
export const random = (s: number) => (Math.imul(s, 1664525) + 1013904223) >>> 0;
export function meanC(c: number) {
    let survival = 1,
        total = 1;
    for (let n = 1; n < 100000 && survival > 1e-14; n++) {
        survival *= 1 - Math.min(n * c, 1);
        total += survival;
    }
    return total;
}
export function calibrate(p: number) {
    let lo = 0,
        hi = 1;
    for (let i = 0; i < 55; i++) {
        const mid = (lo + hi) / 2;
        if (1 / meanC(mid) < p) lo = mid;
        else hi = mid;
    }
    return (lo + hi) / 2;
}
export type Sim = {
    rng: number;
    failures: number;
    longest: number;
    successes: number;
    draws: number;
    bag: boolean[];
    history: boolean[];
    waits: number[];
};
export const initial = (seed = 12345): Sim => ({
    rng: seed,
    failures: 0,
    longest: 0,
    successes: 0,
    draws: 0,
    bag: [],
    history: [],
    waits: [],
});
export function draw(s: Sim, rule: Rule, p: number, k: number, c: number): Sim {
    let rng = random(s.rng),
        bag = [...s.bag],
        success = false;
    const u = rng / 4294967296;
    if (rule === 'bag') {
        if (!bag.length) {
            bag = Array.from({ length: 20 }, (_, i) => i < Math.round(p * 20));
            for (let i = 19; i > 0; i--) {
                rng = random(rng);
                const j = Math.floor((rng / 4294967296) * (i + 1));
                [bag[i], bag[j]] = [bag[j]!, bag[i]!];
            }
        }
        success = bag.pop()!;
    } else {
        const q =
            rule === 'ceiling' && s.failures >= k - 1
                ? 1
                : rule === 'cumulative'
                  ? Math.min((s.failures + 1) * c, 1)
                  : p;
        success = u < q;
    }
    const failures = success ? 0 : s.failures + 1;
    return {
        rng,
        bag,
        failures,
        longest: Math.max(s.longest, failures),
        successes: s.successes + Number(success),
        draws: s.draws + 1,
        history: [...s.history, success].slice(-80),
        waits: success ? [...s.waits, s.failures + 1] : s.waits,
    };
}
export const coinReward = (heads: boolean, risk: boolean) => (risk ? (heads ? 10 : -8) : 1);
