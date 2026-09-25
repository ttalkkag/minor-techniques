export type World = {
    tick: number;
    x: number;
    map: '마을' | '전투';
    delivered: boolean;
    interrupted: boolean;
};
export type Observation = World & { id: number; capturedAt: number };
export type CycleResult = {
    world: World;
    observation: Observation;
    age: number;
    sent: number;
    moved: number;
    claimed: boolean;
    result: string;
};
export function cycle(
    initial: World,
    delay: number,
    burst: number,
    verify: boolean,
    interrupt: boolean,
    id: number,
): CycleResult {
    const world = { ...initial };
    const observation = { ...world, id, capturedAt: world.tick };
    let sent = 0,
        moved = 0;
    const tick = () => {
        world.tick++;
        if (interrupt && !world.interrupted && world.tick >= 3) {
            world.map = '전투';
            world.interrupted = true;
        }
    };
    for (let i = 0; i < delay; i++) tick();
    const age = world.tick - observation.capturedAt;
    if (verify && world.map !== observation.map)
        return {
            world,
            observation,
            age,
            sent,
            moved,
            claimed: false,
            result: '맵 변경 감지 · 요청 폐기 후 재관측',
        };
    if (verify && world.delivered)
        return {
            world,
            observation,
            age,
            sent,
            moved,
            claimed: true,
            result: '완료 상태 확인 · 다음 목표로 전환',
        };
    if (verify && world.map === '전투')
        return {
            world,
            observation,
            age,
            sent,
            moved,
            claimed: false,
            result: '전투 중 · 이동 대신 상태 전환 대기',
        };
    for (let i = 0; i < burst && world.x < 8; i++) {
        tick();
        if (verify && world.map !== observation.map) break;
        sent++;
        if (world.map === '마을') {
            world.x++;
            moved++;
        }
    }
    if (world.x === 8 && world.map === '마을') world.delivered = true;
    const claimed = verify ? world.delivered : sent > 0;
    return {
        world,
        observation,
        age,
        sent,
        moved,
        claimed,
        result: verify
            ? world.delivered
                ? '소포 전달 확인 · 목표 완료'
                : `부분 실행 ${moved}칸 · 남은 ${8 - world.x}칸`
            : claimed
              ? '명령 수신 성공을 목표 완료로 보고'
              : '전송할 명령 없음',
    };
}
export type Change = { index: number; before: string; after: string; version: number };
export type Build = {
    blocks: string[];
    versions: number[];
    stock: number;
    changes: Change[];
    commands: number;
    conflicts: number;
};
export function freshBuild(): Build {
    return {
        blocks: Array(10).fill('빈칸'),
        versions: Array(10).fill(0),
        stock: 6,
        changes: [],
        commands: 0,
        conflicts: 0,
    };
}
export function buildBatch(state: Build, differenceOnly: boolean): Build {
    const next = {
        ...state,
        blocks: [...state.blocks],
        versions: [...state.versions],
        changes: [...state.changes],
        commands: 0,
    };
    const targets = next.blocks
        .map((_, i) => i)
        .filter((i) => !differenceOnly || next.blocks[i] !== '벽')
        .slice(0, 6);
    for (const i of targets) {
        next.commands++;
        if (next.blocks[i] === '벽') continue;
        if (next.stock <= 0) break;
        const before = next.blocks[i];
        next.blocks[i] = '벽';
        next.stock--;
        next.versions[i]++;
        next.changes.push({ index: i, before, after: '벽', version: next.versions[i] });
    }
    return next;
}
export function rollback(state: Build, guard: boolean): Build {
    const next = {
        ...state,
        blocks: [...state.blocks],
        versions: [...state.versions],
        changes: [] as Change[],
        conflicts: 0,
    };
    for (const change of [...state.changes].reverse()) {
        if (
            guard &&
            (next.blocks[change.index] !== change.after || next.versions[change.index] !== change.version)
        ) {
            next.conflicts++;
            continue;
        }
        next.blocks[change.index] = change.before;
        next.versions[change.index]++;
    }
    return next;
}
