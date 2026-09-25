export type Candidate = { id: string; rating: number; ping: number; party: number; region: string };
export const initialQueue = (): Candidate[] => [
    { id: 'B', rating: 1520, ping: 180, party: 1, region: 'KR' },
    { id: 'C', rating: 1620, ping: 35, party: 1, region: 'KR' },
    { id: 'D', rating: 1550, ping: 40, party: 2, region: 'KR' },
    { id: 'E', rating: 1720, ping: 20, party: 1, region: 'KR' },
    { id: 'F', rating: 1430, ping: 70, party: 1, region: 'EU' },
];
export const expected = (a: number, b: number) => 1 / (1 + 10 ** ((b - a) / 400));
export function update(a: number, b: number, k: number, score: number) {
    const delta = k * (score - expected(a, b));
    return { a: a + delta, b: b - delta, delta };
}
export function evaluate(
    queue: Candidate[],
    rating: number,
    wait: number,
    base: number,
    expansion: number,
    ping: number,
    party: number,
    region: string,
) {
    const width = base + Math.floor(wait / 10) * expansion;
    const rows = queue.map((c) => {
        const reasons = [];
        if (c.ping > ping) reasons.push('핑 초과');
        if (c.party !== party) reasons.push('파티 크기');
        if (c.region !== region) reasons.push('지역');
        if (Math.abs(c.rating - rating) > width) reasons.push('점수 범위');
        return { ...c, reasons, difference: Math.abs(c.rating - rating) };
    });
    const eligible = rows
        .filter((r) => !r.reasons.length)
        .sort((a, b) => a.difference - b.difference || a.ping - b.ping || a.id.localeCompare(b.id));
    return { width, rows, best: eligible[0] ?? null };
}
