export interface MapPoint {
    x: number;
    z: number;
    t: number;
}
export function rowPoint(
    x: number,
    y: number,
    height: number,
    yaw: number,
    cameraZ: number,
): MapPoint | null {
    if (y <= 36) return null;
    const t = (150 * height) / (y - 36),
        side = ((x - 140) * t) / 150;
    return {
        x: Math.sin(yaw) * t + Math.cos(yaw) * side,
        z: cameraZ + Math.cos(yaw) * t - Math.sin(yaw) * side,
        t,
    };
}
export function rayPoint(
    x: number,
    y: number,
    height: number,
    yaw: number,
    cameraZ: number,
): MapPoint | null {
    const dy = (36 - y) / 150;
    if (dy >= 0) return null;
    const dx = (x - 140) / 150,
        length = Math.hypot(dx, dy, 1),
        distance = -height / (dy / length);
    return {
        x: ((Math.cos(yaw) * dx + Math.sin(yaw)) / length) * distance,
        z: cameraZ + ((-Math.sin(yaw) * dx + Math.cos(yaw)) / length) * distance,
        t: -height / dy,
    };
}
export function affinePoint(x: number, y: number, yaw: number, cameraZ: number): MapPoint {
    const t = (180 - y) * 0.075 + 1,
        side = (x - 140) * 0.055;
    return {
        x: Math.sin(yaw) * t + Math.cos(yaw) * side,
        z: cameraZ + Math.cos(yaw) * t - Math.sin(yaw) * side,
        t,
    };
}
export function mapBoundary(x: number, z: number, boundary: string): [number, number] | null {
    if (boundary === 'empty' && (x < -12 || x >= 12 || z < -12 || z >= 12)) return null;
    if (boundary === 'repeat')
        return [((((x + 12) % 24) + 24) % 24) - 12, ((((z + 12) % 24) + 24) % 24) - 12];
    return [Math.max(-12, Math.min(11.99999, x)), Math.max(-12, Math.min(11.99999, z))];
}
export function mapColor(x: number, z: number): [number, number, number] {
    const road = Math.abs(x - 2.5 * Math.sin(z * 0.32));
    if (road < 1.85) return road < 0.065 && Math.floor(z * 1.4) % 2 === 0 ? [250, 229, 169] : [72, 91, 102];
    if (road < 2.15) return Math.floor(z * 1.6) % 2 === 0 ? [219, 132, 78] : [239, 239, 218];
    return (Math.floor(x) + Math.floor(z)) % 2 === 0 ? [139, 186, 158] : [152, 197, 169];
}
