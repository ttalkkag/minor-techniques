export interface Sprite {
    id: number;
    owner: number;
    x: number;
    y: number;
    size: number;
}
export function makeSprites(count: number, pieces: number, offset: number): Sprite[] {
    const columns = pieces === 4 ? 2 : pieces;
    return Array.from({ length: count * pieces }, (_, id) => {
        const owner = Math.floor(id / pieces);
        const piece = id % pieces;
        return {
            id,
            owner,
            x: 8 + owner * 18 + (piece % columns) * 8,
            y: 40 + Math.floor(piece / columns) * 8 + (owner === count - 1 ? offset : 0),
            size: 8,
        };
    });
}
export function selectLine(
    sprites: Sprite[],
    y: number,
    limit: number,
    frame: number,
    mode: string,
    protect: boolean,
) {
    const rotated =
        mode === 'rotate'
            ? sprites.slice(frame % sprites.length).concat(sprites.slice(0, frame % sprites.length))
            : [...sprites];
    const ordered = protect
        ? rotated.filter((s) => s.owner === 0).concat(rotated.filter((s) => s.owner !== 0))
        : rotated;
    const candidates = ordered.filter((s) => s.y <= y && y < s.y + s.size);
    const selected = mode === 'unlimited' ? candidates : candidates.slice(0, limit);
    return { candidates, selected, missing: candidates.filter((s) => !selected.includes(s)) };
}
