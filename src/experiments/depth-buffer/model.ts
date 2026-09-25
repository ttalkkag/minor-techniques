export function depth(z: number, near: number, far: number, reversed: boolean) {
    return reversed ? (near * (far - z)) / ((far - near) * z) : (far * (z - near)) / ((far - near) * z);
}
export function storeDepth(value: number, format: string) {
    if (format === 'float') return Math.fround(value);
    const levels = 2 ** Number(format) - 1;
    return Math.round(value * levels) / levels;
}
export function comparePlates(
    z: number,
    gap: number,
    near: number,
    far: number,
    format: string,
    reversed: boolean,
    rearFirst: boolean,
) {
    const front = storeDepth(depth(z, near, far, reversed), format);
    const back = storeDepth(depth(z + gap, near, far, reversed), format);
    const frontClipped = z < near || z > far;
    const backClipped = z + gap < near || z + gap > far;
    let stored = reversed ? 0 : 1;
    let visible: 'front' | 'back' | null = null;
    for (const plate of rearFirst ? ['back', 'front'] as const : ['front', 'back'] as const) {
        const clipped = plate === 'front' ? frontClipped : backClipped;
        const value = plate === 'front' ? front : back;
        if (!clipped && (reversed ? value > stored : value < stored)) {
            stored = value;
            visible = plate;
        }
    }
    return {
        front,
        back,
        tied: !frontClipped && !backClipped && front === back,
        visible,
        rearVisible: visible === 'back',
        clearRejected: visible === null && (!frontClipped || !backClipped),
    };
}
