export const SIZE = 8;
export type Save = {
    seed: number;
    version: number;
    deltas: Record<string, number>;
};
export function address(x: number): { chunk: number; local: number } {
    const chunk = Math.floor(x / SIZE);
    return { chunk, local: x - chunk * SIZE };
}
export function selectionBounds(x: number) {
    const center = address(x).chunk;
    return { min: Math.min(-16, (center - 1) * SIZE), max: Math.max(23, (center + 2) * SIZE - 1) };
}
export function validSave(value: unknown): value is Save {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const save = value as Save;
    if (save.seed !== 7 || (save.version !== 1 && save.version !== 2)) return false;
    if (!save.deltas || typeof save.deltas !== 'object' || Array.isArray(save.deltas)) return false;
    return Object.entries(save.deltas).every(([key, cell]) => {
        const [x, y] = key.split(',').map(Number);
        return (
            Number.isSafeInteger(x) &&
            Number.isInteger(y) &&
            y >= 0 &&
            y < SIZE &&
            key === `${x},${y}` &&
            (cell === 0 || cell === 1)
        );
    });
}
export function baseCell(x: number, y: number, seed: number, version: number): number {
    const n = Math.sin(x * 0.31 + seed * 1.7) + 0.5 * Math.sin(x * 0.71 + seed);
    const height = Math.floor(3 + n + (version === 2 ? 1.5 * Math.sin(x * 0.16 + 2) : 0));
    return y < height ? 1 : 0;
}
export function effectiveCell(x: number, y: number, save: Save, version = save.version): number {
    const key = `${x},${y}`;
    return Object.hasOwn(save.deltas, key) ? save.deltas[key] : baseCell(x, y, save.seed, version);
}
export function edit(save: Save, x: number, y: number, value: number): Save {
    return { ...save, deltas: { ...save.deltas, [`${x},${y}`]: value } };
}
