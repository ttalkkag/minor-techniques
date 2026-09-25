export type Edge = { to: number; cost: number };
export type Graph = Edge[][];
export function astar(
    graph: Graph,
    start: number,
    goal: number,
    heuristic: (n: number) => number,
    reopen = true,
    discoveryStop = false,
) {
    const costs = Array(graph.length).fill(Infinity) as number[],
        parent = Array(graph.length).fill(-1) as number[],
        closed = new Set<number>(),
        queue: { node: number; g: number; f: number }[] = [];
    costs[start] = 0;
    queue.push({ node: start, g: 0, f: heuristic(start) });
    let expansions = 0,
        reopens = 0;
    while (queue.length) {
        queue.sort((a, b) => a.f - b.f || a.node - b.node);
        const current = queue.shift()!;
        if (current.g !== costs[current.node] || closed.has(current.node)) continue;
        const u = current.node;
        closed.add(u);
        expansions++;
        if (u === goal) break;
        for (const e of graph[u]) {
            const g = costs[u] + e.cost;
            if (g < costs[e.to] && (!closed.has(e.to) || reopen)) {
                costs[e.to] = g;
                parent[e.to] = u;
                if (closed.delete(e.to)) reopens++;
                queue.push({ node: e.to, g, f: g + heuristic(e.to) });
                if (discoveryStop && e.to === goal) {
                    queue.length = 0;
                    break;
                }
            }
        }
    }
    const path: number[] = [];
    if (Number.isFinite(costs[goal])) {
        let n = goal;
        while (n !== -1) {
            path.unshift(n);
            n = parent[n];
        }
    }
    return {
        cost: costs[goal],
        path,
        expansions,
        reopens,
        closed: [...closed],
    };
}
export function reverseField(graph: Graph, goal: number) {
    const reverse: Graph = graph.map(() => []);
    graph.forEach((edges, u) => edges.forEach((e) => reverse[e.to].push({ to: u, cost: e.cost })));
    const distance = graph.map(() => Infinity),
        next = graph.map(() => -1),
        done = new Set<number>(),
        queue = [goal];
    distance[goal] = 0;
    while (queue.length) {
        queue.sort((a, b) => distance[a] - distance[b]);
        const v = queue.shift()!;
        if (done.has(v)) continue;
        done.add(v);
        for (const e of reverse[v]) {
            const d = distance[v] + e.cost;
            if (!done.has(e.to) && d < distance[e.to]) {
                distance[e.to] = d;
                next[e.to] = v;
                queue.push(e.to);
            }
        }
    }
    return { distance, next, expansions: done.size };
}
export function gridGraph(weight: number, door: boolean, zero: boolean) {
    const width = 16,
        height = 10,
        blocked = new Set<number>();
    for (let y = 0; y < height; y++) if (y !== 5 || !door) blocked.add(y * width + 8);
    const terrain = (i: number) =>
        i % width > 2 && i % width < 7 && Math.floor(i / width) > 2 && Math.floor(i / width) < 8 ? weight : 1;
    const graph: Graph = Array.from({ length: width * height }, () => []);
    for (let u = 0; u < graph.length; u++)
        if (!blocked.has(u)) {
            const x = u % width,
                y = Math.floor(u / width);
            for (const [a, b] of [
                [x - 1, y],
                [x + 1, y],
                [x, y - 1],
                [x, y + 1],
            ])
                if (a >= 0 && a < width && b >= 0 && b < height) {
                    const v = b * width + a;
                    if (!blocked.has(v))
                        graph[u].push({
                            to: v,
                            cost: zero && ((u === 33 && v === 34) || (u === 34 && v === 33)) ? 0 : terrain(v),
                        });
                }
        }
    return { graph, width, height, blocked, terrain };
}
export const counterexample: Graph = [
    [
        { to: 1, cost: 3 },
        { to: 2, cost: 1 },
    ],
    [{ to: 3, cost: 2 }],
    [
        { to: 1, cost: 1 },
        { to: 3, cost: 100 },
    ],
    [],
];
