export type Point = { x: number; y: number };
export type Box = { id: string; x: number; y: number; w: number; h: number };
export type Hit = { id: string; point: Point; fraction: number; inside: boolean };
export type Options = {
    cameraY: number;
    muzzleY: number;
    muzzleX: number;
    cover: number;
    targetX: number;
    search: number;
    range: number;
    ignoreSelf: boolean;
    decoration: boolean;
};
export const defaults: Options = {
    cameraY: 1.7,
    muzzleY: 1.2,
    muzzleX: 1.45,
    cover: 1.4,
    targetX: 10,
    search: 16,
    range: 14,
    ignoreSelf: true,
    decoration: false,
};

export function segmentBox(a: Point, b: Point, box: Box): Hit | null {
    let low = 0,
        high = 1;
    for (const [origin, delta, min, max] of [
        [a.x, b.x - a.x, box.x, box.x + box.w],
        [a.y, b.y - a.y, box.y, box.y + box.h],
    ]) {
        if (Math.abs(delta!) < 1e-12) {
            if (origin! < min! || origin! > max!) return null;
        } else {
            const first = (min! - origin!) / delta!,
                last = (max! - origin!) / delta!;
            low = Math.max(low, Math.min(first, last));
            high = Math.min(high, Math.max(first, last));
            if (low > high) return null;
        }
    }
    return {
        id: box.id,
        fraction: low,
        point: { x: a.x + (b.x - a.x) * low, y: a.y + (b.y - a.y) * low },
        inside: a.x >= box.x && a.x <= box.x + box.w && a.y >= box.y && a.y <= box.y + box.h,
    };
}
export function firstHit(a: Point, b: Point, boxes: Box[]): Hit | null {
    return (
        boxes
            .map((box) => segmentBox(a, b, box))
            .filter((hit): hit is Hit => hit !== null)
            .sort((a, b) => a.fraction - b.fraction)[0] ?? null
    );
}
export function toward(a: Point, b: Point, range: number): Point {
    const distance = Math.hypot(b.x - a.x, b.y - a.y);
    if (distance < 1e-9) return { ...a };
    const scale = Math.min(range, distance) / distance;
    return { x: a.x + (b.x - a.x) * scale, y: a.y + (b.y - a.y) * scale };
}
export function shoot(options: Options) {
    const camera = { x: 1, y: options.cameraY },
        muzzle = { x: options.muzzleX, y: options.muzzleY };
    const boxes: Box[] = [
        { id: '엄폐물', x: 2.2, y: 0, w: 0.35, h: options.cover },
        { id: '표적', x: options.targetX, y: 1.35, w: 0.35, h: 0.7 },
        { id: '자기 몸', x: 0.7, y: 0, w: 0.85, h: 1.45 },
        { id: '장식', x: 5, y: 0.5, w: 0.12, h: 2.2 },
    ];
    const mask = boxes.filter(
        (box) => (box.id !== '자기 몸' || !options.ignoreSelf) && (box.id !== '장식' || options.decoration),
    );
    const target = { x: options.targetX + 0.175, y: 1.7 };
    const length = Math.hypot(target.x - camera.x, target.y - camera.y);
    const direction = { x: (target.x - camera.x) / length, y: (target.y - camera.y) / length };
    const searchEnd = {
        x: camera.x + direction.x * options.search,
        y: camera.y + direction.y * options.search,
    };
    const cameraHit = firstHit(camera, searchEnd, mask),
        aim = cameraHit?.point ?? searchEnd;
    const parallelEnd = {
        x: muzzle.x + direction.x * options.range,
        y: muzzle.y + direction.y * options.range,
    };
    const parallelHit = firstHit(muzzle, parallelEnd, mask);
    const delta = Math.hypot(aim.x - muzzle.x, aim.y - muzzle.y);
    const overlap = mask.find((box) => segmentBox(muzzle, muzzle, box));
    const rejected = overlap
        ? `${overlap.id} 내부에서 발사 거부`
        : delta < 1e-9
          ? '목표와 총구가 겹침'
          : aim.x <= muzzle.x
            ? '총구 뒤 목표 거부'
            : '';
    const end = rejected ? muzzle : toward(muzzle, aim, options.range);
    const hit = rejected ? null : firstHit(muzzle, end, mask);
    return {
        camera,
        muzzle,
        boxes,
        aim,
        cameraHit,
        parallelHit,
        parallelEnd,
        searchEnd,
        end: hit?.point ?? end,
        hit,
        rejected,
        results: [
            cameraHit?.id ?? '사거리 끝',
            parallelHit?.id ?? '사거리 끝',
            rejected || hit?.id || '사거리 끝',
        ],
    };
}
