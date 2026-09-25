export type Input = { move: number; attack: boolean };
export type Fighter = {
    x: number;
    hp: number;
    attack: number;
    cooldown: number;
    start: number;
    hit: boolean;
};
export type State = { tick: number; rng: number; fighters: [Fighter, Fighter] };
export type Event = { id: string; actor: number; tick: number; kind: 'attack' | 'hit' };
export type Options = {
    delay: number;
    inputDelay: number;
    horizon: number;
    dedupe: boolean;
    restoreRng: boolean;
};
export const defaults: Options = { delay: 6, inputDelay: 0, horizon: 8, dedupe: true, restoreRng: true };
export const initial = (): State => ({
    tick: 0,
    rng: 12345,
    fighters: [
        { x: 30, hp: 100, attack: 0, cooldown: 0, start: -1, hit: false },
        { x: 64, hp: 100, attack: 0, cooldown: 0, start: -1, hit: false },
    ],
});
export const clone = (s: State): State => ({
    tick: s.tick,
    rng: s.rng,
    fighters: [{ ...s.fighters[0] }, { ...s.fighters[1] }],
});
export function inputAt(tick: number, actor: number): Input {
    return actor === 0
        ? { move: tick < 6 ? 1 : 0, attack: tick === 8 || tick === 20 }
        : { move: tick < 6 ? -1 : tick >= 12 && tick < 16 ? 1 : 0, attack: tick === 6 || tick === 18 };
}
export function advance(previous: State, inputs: [Input, Input]): { state: State; events: Event[] } {
    const state = clone(previous),
        events: Event[] = [];
    for (let actor = 0; actor < 2; actor++) {
        const fighter = state.fighters[actor]!,
            input = inputs[actor]!;
        fighter.x = Math.max(5, Math.min(95, fighter.x + input.move * 2));
        fighter.cooldown = Math.max(0, fighter.cooldown - 1);
        if (input.attack && fighter.cooldown === 0) {
            fighter.attack = 4;
            fighter.cooldown = 10;
            fighter.start = state.tick;
            fighter.hit = false;
            events.push({ id: `${state.tick}:${actor}:attack`, tick: state.tick, actor, kind: 'attack' });
        }
    }
    for (let actor = 0; actor < 2; actor++) {
        const fighter = state.fighters[actor]!,
            other = state.fighters[1 - actor]!;
        if (fighter.attack === 2 && !fighter.hit && Math.abs(fighter.x - other.x) <= 26) {
            state.rng = (Math.imul(state.rng, 1664525) + 1013904223) >>> 0;
            other.hp = Math.max(0, other.hp - (10 + (state.rng % 6)));
            fighter.hit = true;
            events.push({ id: `${fighter.start}:${actor}:hit`, tick: state.tick, actor, kind: 'hit' });
        }
        fighter.attack = Math.max(0, fighter.attack - 1);
    }
    state.tick++;
    return { state, events };
}
export function hash(state: State): string {
    let value = 2166136261;
    for (const char of JSON.stringify(state)) value = Math.imul(value ^ char.charCodeAt(0), 16777619) >>> 0;
    return value.toString(16).padStart(8, '0');
}
export function simulate(wallTicks: number, options: Options) {
    let state = initial(),
        latest = -1,
        replayed = 0,
        executions = 0,
        waits = 0,
        played = 0,
        requests = 0;
    const snapshots = new Map<number, State>([[0, clone(state)]]),
        used = new Map<number, Input>(),
        eventsByTick = new Map<number, Event[]>();
    const seenEffects = new Set<string>(),
        presented = new Set<string>();
    const rollbacks: { wall: number; from: number; to: number; count: number }[] = [];
    const timeline: { wall: number; tick: number; known: number; rollback: number; waited: boolean }[] = [];
    const remote = (tick: number) =>
        Math.min(tick, latest) < 0 ? { move: 0, attack: false } : inputAt(Math.min(tick, latest), 1);
    const run = () => {
        const tick = state.tick,
            input = remote(tick);
        snapshots.set(tick, clone(state));
        used.set(tick, { ...input });
        const result = advance(state, [inputAt(tick, 0), input]);
        state = result.state;
        executions++;
        snapshots.set(state.tick, clone(state));
        eventsByTick.set(tick, result.events);
        for (const event of result.events) {
            requests++;
            if (!options.dedupe || !seenEffects.has(event.id)) {
                played++;
                presented.add(event.id);
            }
            seenEffects.add(event.id);
        }
    };
    for (let wall = 0; wall < wallTicks; wall++) {
        let rollback = 0,
            waited = false;
        const packet = wall - options.delay;
        if (packet >= 0) {
            latest = packet;
            const prediction = used.get(packet),
                actual = inputAt(packet, 1);
            if (prediction && (prediction.move !== actual.move || prediction.attack !== actual.attack)) {
                const end = state.tick,
                    saved = snapshots.get(packet)!;
                const rng = state.rng;
                state = clone(saved);
                if (!options.restoreRng) state.rng = rng;
                while (state.tick < end) {
                    run();
                    replayed++;
                    rollback++;
                }
                rollbacks.push({ wall, from: packet, to: end, count: rollback });
            }
        }
        if (state.tick <= wall - options.inputDelay) {
            if (state.tick - (latest + 1) >= options.horizon) {
                waits++;
                waited = true;
            } else run();
        }
        const confirmed = Math.max(0, Math.min(state.tick, latest + 1));
        for (const tick of snapshots.keys()) if (tick < confirmed) snapshots.delete(tick);
        timeline.push({ wall, tick: state.tick, known: latest, rollback, waited });
    }
    const confirmed = Math.max(0, Math.min(state.tick, latest + 1));
    let reference = initial(),
        confirmedReference = clone(reference);
    for (let tick = 0; tick < state.tick; tick++) {
        reference = advance(reference, [inputAt(tick, 0), inputAt(tick, 1)]).state;
        if (reference.tick === confirmed) confirmedReference = clone(reference);
    }
    const confirmedState = snapshots.get(confirmed) ?? state;
    const activeEvents = new Set([...eventsByTick.values()].flat().map((event) => event.id));
    return {
        state,
        reference,
        confirmed,
        confirmedHash: hash(confirmedState),
        referenceHash: hash(confirmedReference),
        replayed,
        executions,
        waits,
        played,
        requests,
        duplicateRequests: requests - seenEffects.size,
        staleEffects: [...presented].filter((id) => !activeEvents.has(id)).length,
        rollbacks,
        timeline,
        latest,
        snapshotCount: snapshots.size,
        bytes: new TextEncoder().encode(JSON.stringify(state)).length * snapshots.size,
        used: [...used.entries()],
    };
}
