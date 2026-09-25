export const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export type Progress = { level: number; items: number };
export type Decode =
    | { ok: true; value: Progress; version: number; checksum: number; bits: string }
    | { ok: false; error: string; step: number };
export function encodeRaw(
    version: number,
    level: number,
    items: number,
    checksum = (version + level + items) % 64,
): string {
    const packed = (version << 18) | (level << 14) | (items << 6) | checksum;
    return [15, 10, 5, 0].map((shift) => alphabet[(packed >>> shift) & 31]).join('');
}
export function encode(state: Progress): string {
    if (
        !Number.isInteger(state.level) ||
        state.level < 1 ||
        state.level > 12 ||
        !Number.isInteger(state.items) ||
        state.items < 0 ||
        state.items > 255
    )
        throw new RangeError('지원하지 않는 상태');
    return encodeRaw(0, state.level, state.items);
}
export function decode(code: string): Decode {
    if (code.length !== 4) return { ok: false, error: '정확히 4글자가 필요합니다.', step: 1 };
    if ([...code].some((char) => !alphabet.includes(char)))
        return { ok: false, error: '문자표에 없는 글자가 있습니다. 대문자 32개만 사용합니다.', step: 1 };
    const packed = [...code].reduce((value, char) => value * 32 + alphabet.indexOf(char), 0);
    const version = packed >>> 18,
        level = (packed >>> 14) & 15,
        items = (packed >>> 6) & 255,
        checksum = packed & 63;
    if (checksum !== (version + level + items) % 64)
        return { ok: false, error: '검사값 불일치: 입력 중 값이 바뀌었습니다.', step: 3 };
    if (version !== 0) return { ok: false, error: `버전 ${version}은 지원하지 않습니다.`, step: 4 };
    if (level < 1 || level > 12)
        return { ok: false, error: `레벨 ${level}은 허용 범위 1–12 밖입니다.`, step: 4 };
    return {
        ok: true,
        value: { level, items },
        version,
        checksum,
        bits: packed.toString(2).padStart(20, '0'),
    };
}
export function restore(code: string) {
    const result = decode(code);
    return result.ok ? { ...result.value, position: 10, effect: false } : null;
}
