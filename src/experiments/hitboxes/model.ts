export type Box = { x: number; y: number; w: number; h: number };
export function overlap(a: Box, b: Box) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
export function activeRound(tick: number, multi: boolean) {
    return tick >= 5 && tick < 8 ? 0 : multi && tick >= 10 && tick < 13 ? 1 : -1;
}
export function applyHit(
    attack: number,
    target: string,
    round: number,
    invulnerable: boolean,
    already: Set<string>,
) {
    const key = `${attack}:${target}:${round}`;
    if (invulnerable || already.has(key)) return false;
    already.add(key);
    return true;
}
