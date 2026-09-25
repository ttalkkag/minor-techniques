export const next = (state: number) => (5 * state + 1) % 16;
export type Run = { state: number; decoration: number; turn: number; hp: number; calls: number };
export const initial = (seed: number): Run => ({
    state: seed,
    decoration: (seed + 7) % 16,
    turn: 0,
    hp: 100,
    calls: 0,
});
export function step(s: Run, decorate: boolean, split: boolean, threshold: number) {
    let state = s.state,
        decoration = s.decoration,
        calls = s.calls,
        visual: number | null = null;
    if (decorate) {
        if (split) {
            decoration = next(decoration);
            visual = decoration;
        } else {
            state = next(state);
            visual = state;
            calls++;
        }
    }
    state = next(state);
    calls++;
    const hit = state < threshold;
    return {
        run: { state, decoration, turn: s.turn + 1, hp: Math.max(0, s.hp - (hit ? 10 : 0)), calls },
        value: state,
        visual,
        hit,
    };
}
export function weighted(value: number, weights: number[]) {
    let cursor = value;
    for (let i = 0; i < weights.length; i++) {
        cursor -= weights[i]!;
        if (cursor < 0) return i;
    }
    return weights.length - 1;
}
export function rangeCounts(reject: boolean) {
    const counts = [0, 0, 0];
    for (let i = 0; i < 16; i++) if (!reject || i < 15) counts[i % 3]!++;
    return counts;
}
