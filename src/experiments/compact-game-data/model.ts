export interface Member {
    level: number;
    species: number;
    move: number | null;
}
function assertBytes(bytes: number[]) {
    if (bytes.some((value) => !Number.isInteger(value) || value < 0 || value > 255))
        throw new Error('바이트는 0~255의 정수여야 합니다');
}
export function encodeParty(party: Member[], format: 'auto' | 'pairs'): number[] {
    if (
        party.some(
            (p) =>
                !Number.isInteger(p.level) ||
                p.level < 1 ||
                p.level > 100 ||
                !Number.isInteger(p.species) ||
                p.species < 1 ||
                p.species > 254,
        )
    )
        throw new Error('레벨과 종 번호는 범위 안의 정수여야 합니다');
    const common = format === 'auto' && party.every((p) => p.level === party[0]!.level);
    return common
        ? [party[0]!.level, ...party.map((p) => p.species), 0]
        : [255, ...party.flatMap((p) => [p.level, p.species]), 0];
}
export function decodeParty(bytes: number[], exceptions: number[] = [0]): Member[] {
    assertBytes(bytes);
    assertBytes(exceptions);
    const result: Member[] = [];
    const pairs = bytes[0] === 255;
    let i = 1;
    while (i < bytes.length && bytes[i] !== 0) {
        const level = pairs ? bytes[i++]! : bytes[0]!;
        const species = bytes[i++]!;
        if (!species || species > 254 || !level || level > 100) throw new Error('잘못된 파티 레코드');
        result.push({ level, species, move: null });
    }
    if (bytes[i] !== 0) throw new Error('종료값 없음');
    for (let j = 0; j < exceptions.length && exceptions[j] !== 0; j += 2) {
        const slot = exceptions[j]! - 1;
        if (!result[slot] || exceptions[j + 1] === undefined) throw new Error('잘못된 예외');
        result[slot]!.move = exceptions[j + 1]!;
    }
    return result;
}
export function bitplanes(pixels: number[], planar: boolean): number[] {
    if (pixels.length !== 64 || pixels.some((value) => !Number.isInteger(value) || value < 0 || value > 3))
        throw new Error('타일은 0~3의 정수 색 번호 64개여야 합니다');
    const lo: number[] = [],
        hi: number[] = [];
    for (let y = 0; y < 8; y++) {
        let a = 0,
            b = 0;
        for (let x = 0; x < 8; x++) {
            const c = pixels[y * 8 + x]!;
            a |= (c & 1) << (7 - x);
            b |= ((c >> 1) & 1) << (7 - x);
        }
        lo.push(a);
        hi.push(b);
    }
    return planar ? [...lo, ...hi] : lo.flatMap((v, i) => [v, hi[i]!]);
}
export function restorePixels(bytes: number[], planar: boolean): number[] {
    assertBytes(bytes);
    return Array.from({ length: 64 }, (_, i) => {
        const y = Math.floor(i / 8),
            shift = 7 - (i % 8);
        const lo = bytes[planar ? y : 2 * y]!,
            hi = bytes[planar ? y + 8 : 2 * y + 1]!;
        return ((lo >> shift) & 1) + 2 * ((hi >> shift) & 1);
    });
}
export function rle(bytes: number[], planar: boolean): number[] {
    assertBytes(bytes);
    const output = [planar ? 161 : 160];
    for (let i = 0; i < bytes.length;) {
        let count = 1;
        while (i + count < bytes.length && bytes[i + count] === bytes[i] && count < 255) count++;
        output.push(count, bytes[i]!);
        i += count;
    }
    return output;
}
export function unrle(bytes: number[]): { data: number[]; planar: boolean } {
    assertBytes(bytes);
    if ((bytes[0] !== 160 && bytes[0] !== 161) || bytes.length % 2 !== 1) throw new Error('RLE 형식 오류');
    const data: number[] = [];
    for (let i = 1; i < bytes.length; i += 2) {
        if (!bytes[i]) throw new Error('0 길이 반복');
        for (let j = 0; j < bytes[i]!; j++) data.push(bytes[i + 1]!);
    }
    return { data, planar: bytes[0] === 161 };
}
export function tilePreset(preset: string): number[] {
    let seed = 173;
    return Array.from({ length: 64 }, (_, i) => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return preset === 'solid' ? 1 : preset === 'noise' ? seed >>> 30 : [0, 1, 2, 3, 3, 2, 1, 0][i % 8]!;
    });
}
