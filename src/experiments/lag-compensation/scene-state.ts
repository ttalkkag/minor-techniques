export type View = 'free' | 'shooter' | 'target';

export type SceneFrame = {
    targetX: number;
    targetTime: number;
    moving: boolean;
    aimX: number;
    targetCovered: boolean;
    ghostX: number;
    ghostVisible: boolean;
    shotFlash: number;
    trace: 'none' | 'shot' | 'query';
    traceBlocked: boolean;
    result: 'pending' | 'hit' | 'blocked' | 'miss' | 'rejected';
    hitPulse: number;
};
