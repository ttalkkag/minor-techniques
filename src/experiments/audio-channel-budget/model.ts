export type Owner = { kind: 'music' | 'effect'; priority: number; until: number; id: number };
export function requestEffect(
    owner: Owner,
    priority: number,
    now: number,
    duration: number,
    replaceEqual: boolean,
    id: number,
): { owner: Owner; accepted: boolean } {
    const active = owner.kind === 'effect' && owner.until > now;
    const threshold = active ? owner.priority : 1;
    if (priority < threshold || (priority === threshold && active && !replaceEqual))
        return { owner, accepted: false };
    return { owner: { kind: 'effect', priority, until: now + duration, id }, accepted: true };
}
export function ownerAt(owner: Owner, now: number): Owner {
    return owner.kind === 'effect' && now >= owner.until
        ? { kind: 'music', priority: 1, until: Infinity, id: 0 }
        : owner;
}
export function pcmBytes(seconds: number, rate: number, bits: number, channels: number): number {
    return ((seconds * rate * bits) / 8) * channels;
}
export function pitchSample(semitones: number, duration: number) {
    const rate = 2 ** (semitones / 12);
    return { rate, duration: duration / rate };
}
