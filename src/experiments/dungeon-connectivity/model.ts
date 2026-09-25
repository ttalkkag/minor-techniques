export type Edge = { from: number; to: number; door?: number; jump?: number };
export type State = {
    room: number;
    keys: number;
    collected: boolean;
    opened: number;
};
export type Rules = {
    keyRoom: number;
    keyCount: number;
    consumable: boolean;
    secondDoor: boolean;
    jump: number;
    platform: boolean;
    bypass: boolean;
};
export const names = ['시작 S', '분기 A', '문 뒤 B', '출구 E', '열쇠 K', '높은 방 U'];
export function edges(rules: Rules): Edge[] {
    const pairs: Edge[] = [
        { from: 0, to: 1 },
        { from: 1, to: 2, door: 0 },
        { from: 2, to: 3, ...(rules.secondDoor ? { door: 1 } : {}) },
        {
            from: rules.keyRoom === 2 ? 2 : 1,
            to: 4,
            ...(rules.platform ? { jump: 3 } : {}),
        },
        { from: 1, to: 5, jump: 3 },
    ];
    if (rules.bypass) pairs.push({ from: 5, to: 3 });
    return pairs.flatMap((e) => [e, { ...e, from: e.to, to: e.from, jump: e.jump ? 0 : undefined }]);
}
export function search(rules: Rules, mode: 'geometry' | 'room' | 'state') {
    const graph = edges(rules),
        start: State = { room: 0, keys: 0, collected: false, opened: 0 };
    const queue: { state: State; path: State[] }[] = [{ state: start, path: [start] }],
        seen = new Set<string>();
    let expanded = 0;
    while (queue.length) {
        const current = queue.shift()!,
            s = current.state;
        if (s.room === 4 && !s.collected) {
            s.keys += rules.keyCount;
            s.collected = true;
        }
        const key = mode === 'state' ? `${s.room}/${s.keys}/${s.collected}/${s.opened}` : String(s.room);
        if (seen.has(key)) continue;
        seen.add(key);
        expanded++;
        if (s.room === 3)
            return {
                found: true,
                path: current.path,
                expanded,
                rooms: [...new Set([...seen].map((k) => Number(k.split('/')[0])))],
            };
        for (const edge of graph.filter((e) => e.from === s.room)) {
            const next = { ...s, room: edge.to };
            if (mode !== 'geometry') {
                if ((edge.jump ?? 0) > rules.jump) continue;
                if (edge.door !== undefined && !(s.opened & (1 << edge.door))) {
                    if (!s.keys) continue;
                    if (rules.consumable) next.keys--;
                    next.opened |= 1 << edge.door;
                }
            }
            queue.push({ state: next, path: [...current.path, next] });
        }
    }
    return {
        found: false,
        path: [] as State[],
        expanded,
        rooms: [...new Set([...seen].map((k) => Number(k.split('/')[0])))],
    };
}
export function maze(seed: number, extra: boolean): [number, number][] {
    let rng = seed | 0;
    const random = () => {
        rng = (Math.imul(rng, 1664525) + 1013904223) | 0;
        return (rng >>> 0) / 4294967296;
    };
    const links: [number, number][] = [],
        seen = new Set([0]),
        stack = [0],
        n = 5;
    while (stack.length) {
        const cell = stack[stack.length - 1],
            x = cell % n,
            y = Math.floor(cell / n);
        const candidates = [
            [x - 1, y],
            [x + 1, y],
            [x, y - 1],
            [x, y + 1],
        ]
            .filter(([a, b]) => a >= 0 && b >= 0 && a < n && b < n)
            .map(([a, b]) => b * n + a)
            .filter((c) => !seen.has(c));
        if (!candidates.length) {
            stack.pop();
            continue;
        }
        const next = candidates[Math.floor(random() * candidates.length)];
        seen.add(next);
        links.push([cell, next]);
        stack.push(next);
    }
    if (extra)
        for (let a = 0; a < 24; a++) {
            const b = a + 1;
            if (a % 5 !== 4 && !links.some(([u, v]) => (u === a && v === b) || (u === b && v === a))) {
                links.push([a, b]);
                break;
            }
        }
    return links;
}
