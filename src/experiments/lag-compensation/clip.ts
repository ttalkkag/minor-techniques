import { coverBlocks, evaluate, now, positionAt, type Options } from './model.ts';
import type { SceneFrame, View } from './scene-state.ts';

export function timing(options: Options) {
    return {
        start: 600,
        fire: now - options.up,
        arrive: now,
        confirm: now + options.down,
        end: Math.max(1200, now + options.down + 120),
    };
}

export function clipFrame(options: Options, time: number, view: View, inspect: boolean, aimOffset = 0) {
    const times = timing(options);
    const result = evaluate(options, false, aimOffset);
    const worldTime = Math.min(now, view === 'shooter' ? time - options.down - options.interpolation : time);
    const fired = time >= times.fire;
    const resolved = time >= times.arrive;
    const confirmed = time >= times.confirm;
    const resultTime = view === 'shooter' ? times.confirm : times.arrive;
    const resultVisible = time >= resultTime;
    const shotFlash = fired && time < times.fire + 24 ? 1 - (time - times.fire) / 24 : 0;
    const queryVisible = inspect && resultVisible && !result.reason;
    const targetX = positionAt(worldTime, options.speed, options.teleport);
    const phase: 'ready' | 'shot' | 'query' | 'result' =
        time < times.fire ? 'ready' : time < times.arrive ? 'shot' : time < times.confirm ? 'query' : 'result';
    const scene: SceneFrame = {
        targetX,
        targetTime: worldTime,
        moving: worldTime < now,
        aimX: result.aim,
        targetCovered: coverBlocks(targetX),
        ghostX: result.queryX,
        ghostVisible: queryVisible && options.mode !== 'current',
        shotFlash,
        trace: queryVisible ? 'query' : shotFlash > 0 ? 'shot' : 'none',
        traceBlocked: result.blocked,
        result: !resultVisible ? 'pending' : result.reason ? 'rejected' : result.blocked ? 'blocked' : result.hit ? 'hit' : 'miss',
        hitPulse: resultVisible && result.hit && time < resultTime + 60 ? 1 - (time - resultTime) / 60 : 0,
    };
    return { scene, result, worldTime, phase, fired, resolved, confirmed };
}
