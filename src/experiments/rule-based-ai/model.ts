export type Move = {
    id: string;
    name: string;
    kind: 'damage' | 'status' | 'heal' | 'setup';
    pp: number;
    power: number;
};
export type State = {
    hp: number;
    enemy: number;
    poisoned: boolean;
    turn: number;
    buff: boolean;
    seed: number;
    moves: Move[];
};
export const initial = (): State => ({
    hp: 30,
    enemy: 100,
    poisoned: true,
    turn: 2,
    buff: false,
    seed: 12345,
    moves: [
        { id: 'normal', name: '일반 공격', kind: 'damage', pp: 10, power: 20 },
        { id: 'poison', name: '독 부여', kind: 'status', pp: 5, power: 0 },
        { id: 'heal', name: '회복', kind: 'heal', pp: 3, power: 0 },
        { id: 'heavy', name: '강한 공격', kind: 'damage', pp: 0, power: 40 },
        { id: 'focus', name: '집중', kind: 'setup', pp: 3, power: 0 },
    ],
});
export function editState(
    state: State,
    edit: Partial<Pick<State, 'hp' | 'turn' | 'poisoned'>> & {
        heavyPp?: number;
    },
): State {
    const { heavyPp, ...fields } = edit;
    return {
        ...state,
        ...fields,
        moves:
            heavyPp === undefined
                ? state.moves
                : state.moves.map((move) => (move.id === 'heavy' ? { ...move, pp: heavyPp } : move)),
    };
}
export function score(s: State, multiplier: number, broken: boolean, allEmpty = false) {
    return s.moves.map((m) => {
        const changes: { label: string; delta: number }[] = [];
        if (m.kind === 'status' && s.poisoned) changes.push({ label: '이미 독 상태', delta: 10 });
        if (m.kind === 'heal')
            changes.push({
                label: s.hp === 100 ? '체력 가득 참' : s.hp <= 35 ? '체력 부족' : '회복 필요 낮음',
                delta: s.hp === 100 ? 20 : s.hp <= 35 ? -5 : 0,
            });
        if (m.kind === 'setup')
            changes.push({
                label: s.buff ? '이미 강화됨' : s.turn === 1 ? '첫 턴 준비' : '이후 턴',
                delta: s.buff ? 15 : s.turn === 1 ? -4 : 6,
            });
        if ((m.kind === 'damage' || broken) && multiplier !== 1)
            changes.push({
                label: broken && m.kind !== 'damage' ? '오류: 비피해 상성' : '피해 상성',
                delta: multiplier === 0 ? 40 : multiplier > 1 ? -8 : 8,
            });
        return {
            ...m,
            available: !allEmpty && m.pp > 0,
            changes,
            cost: 20 + changes.reduce((n, c) => n + c.delta, 0),
        };
    });
}
export function choose(s: State, multiplier: number, broken: boolean, allEmpty = false) {
    const rows = score(s, multiplier, broken, allEmpty),
        available = rows.filter((r) => r.available),
        min = Math.min(...available.map((r) => r.cost)),
        ties = available.filter((r) => r.cost === min);
    const seed = ties.length > 1 ? (Math.imul(s.seed, 1664525) + 1013904223) >>> 0 : s.seed;
    const picked = ties.length ? ties[Math.floor((seed / 4294967296) * ties.length)]! : null;
    return { rows, ties, picked, seed, consumed: ties.length > 1 };
}
export function execute(s: State, id: string, multiplier: number): State {
    const move = s.moves.find((m) => m.id === id);
    if (!move || move.pp <= 0) return s;
    return {
        ...s,
        turn: s.turn + 1,
        hp: move.kind === 'heal' ? Math.min(100, s.hp + 30) : s.hp,
        enemy:
            move.kind === 'damage'
                ? Math.max(0, s.enemy - Math.round(move.power * multiplier * (s.buff ? 1.5 : 1)))
                : s.enemy,
        poisoned: move.kind === 'status' ? true : s.poisoned,
        buff: move.kind === 'setup' ? true : s.buff,
        moves: s.moves.map((m) => (m.id === id ? { ...m, pp: m.pp - 1 } : m)),
    };
}
