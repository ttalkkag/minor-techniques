export interface Point {
    x: number;
    y: number;
}
export function project(x: number, y: number, z: number, cameraX: number): Point {
    return { x: 80 + (70 * (x - cameraX)) / z, y: 50 - (70 * y) / z };
}
export function quantize(p: Point, grid: number): Point {
    return { x: grid * Math.floor(p.x / grid), y: grid * Math.floor(p.y / grid) };
}
