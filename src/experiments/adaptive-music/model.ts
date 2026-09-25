export type Mood = 'calm' | 'combat';
export type Reservation = { id: number; at: number; target: Mood };
export function nextBar(now: number, bpm: number, lead: number, origin = 0): number {
    const duration = (4 * 60) / bpm;
    return origin + Math.ceil((now + lead - origin) / duration) * duration;
}
export function requestTransition(
    current: Mood,
    pending: Reservation | null,
    target: Mood,
    now: number,
    bpm: number,
    lead: number,
    quantized: boolean,
    cancel: boolean,
    id: number,
): Reservation | null {
    if (pending?.target === target) return pending;
    if (target === current) return cancel ? null : pending;
    return { id, at: quantized ? nextBar(now, bpm, lead) : now + 0.025, target };
}
export function beatPosition(time: number, bpm: number): number {
    return Math.max(0, (time * bpm) / 60);
}
