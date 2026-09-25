export type Point = { x: number; y: number };
export type Vertex = Point & { w: number; u: number; v: number };
export type Triangle = [Vertex, Vertex, Vertex];
export type UV = { u: number; v: number };
export type Conditions = { tilt: number; yaw: number; distance: number };
export type Method = 'affine' | 'perspective';

export function project(u: number, v: number, conditions: Conditions): Vertex {
    const tilt = (conditions.tilt * Math.PI) / 180;
    const yaw = (conditions.yaw * Math.PI) / 180;
    const x = (u - 0.5) * 4.2;
    const y = (0.5 - v) * 3.6 * Math.cos(tilt);
    const z = (0.5 - v) * 3.6 * Math.sin(tilt);
    const w = conditions.distance - x * Math.sin(yaw) + z * Math.cos(yaw);
    return { x: (x * Math.cos(yaw) + z * Math.sin(yaw)) / w, y: -y / w, w, u, v };
}

export function weights(point: Point, triangle: Triangle): [number, number, number] {
    const [a, b, c] = triangle;
    const denominator = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
    const first = ((b.y - c.y) * (point.x - c.x) + (c.x - b.x) * (point.y - c.y)) / denominator;
    const second = ((c.y - a.y) * (point.x - c.x) + (a.x - c.x) * (point.y - c.y)) / denominator;
    return [first, second, 1 - first - second];
}

export function interpolate(triangle: Triangle, lambda: number[], method: Method): UV {
    let u = 0;
    let v = 0;
    let denominator = 0;
    for (let index = 0; index < 3; index += 1) {
        const vertex = triangle[index];
        const weight = lambda[index] / (method === 'perspective' ? vertex.w : 1);
        u += vertex.u * weight;
        v += vertex.v * weight;
        denominator += weight;
    }
    return { u: u / denominator, v: v / denominator };
}

export function sample(point: Point, triangles: Triangle[], method: Method): UV | null {
    for (const triangle of triangles) {
        const lambda = weights(point, triangle);
        if (lambda.every((weight) => weight >= -1e-9)) return interpolate(triangle, lambda, method);
    }
    return null;
}

export function mesh(conditions: Conditions, divisions: number, space: 'world' | 'screen'): Triangle[] {
    if (space === 'screen' && divisions > 1) {
        const triangles: Triangle[] = [];
        for (const triangle of mesh(conditions, 1, 'world')) {
            const at = (i: number, j: number): Vertex => {
                const lambda = [1 - (i + j) / divisions, i / divisions, j / divisions];
                const mix = (key: keyof Vertex) =>
                    triangle.reduce((sum, vertex, index) => sum + vertex[key] * lambda[index], 0);
                return { x: mix('x'), y: mix('y'), w: mix('w'), u: mix('u'), v: mix('v') };
            };
            for (let i = 0; i < divisions; i += 1) {
                for (let j = 0; j < divisions - i; j += 1) {
                    triangles.push([at(i, j), at(i + 1, j), at(i, j + 1)]);
                    if (i + j < divisions - 1) triangles.push([at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)]);
                }
            }
        }
        return triangles;
    }
    const triangles: Triangle[] = [];
    for (let y = 0; y < divisions; y += 1) {
        for (let x = 0; x < divisions; x += 1) {
            const a = project(x / divisions, y / divisions, conditions);
            const b = project((x + 1) / divisions, y / divisions, conditions);
            const c = project(x / divisions, (y + 1) / divisions, conditions);
            const d = project((x + 1) / divisions, (y + 1) / divisions, conditions);
            triangles.push([a, b, d], [a, d, c]);
        }
    }
    return triangles;
}

export function uvError(conditions: Conditions, triangles: Triangle[], method: Method): number {
    const reference = mesh(conditions, 1, 'world');
    const vertices = reference.flat();
    const minX = Math.min(...vertices.map((vertex) => vertex.x));
    const maxX = Math.max(...vertices.map((vertex) => vertex.x));
    const minY = Math.min(...vertices.map((vertex) => vertex.y));
    const maxY = Math.max(...vertices.map((vertex) => vertex.y));
    let sum = 0;
    let count = 0;
    for (let y = 0; y < 41; y += 1) {
        for (let x = 0; x < 41; x += 1) {
            const point = {
                x: minX + ((maxX - minX) * (x + 0.5)) / 41,
                y: minY + ((maxY - minY) * (y + 0.5)) / 41,
            };
            const expected = sample(point, reference, 'perspective');
            const actual = sample(point, triangles, method);
            if (expected && actual) {
                sum += (expected.u - actual.u) ** 2 + (expected.v - actual.v) ** 2;
                count += 1;
            }
        }
    }
    return count ? Math.sqrt(sum / count) : 0;
}
