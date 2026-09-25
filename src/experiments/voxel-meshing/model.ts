export type Quad = {
    axis: number;
    sign: number;
    plane: number;
    u: number;
    v: number;
    w: number;
    h: number;
    material: number;
};
export function blocks(n: number, pattern: string, materials: boolean, carve: boolean): number[] {
    const cells: number[] = [];
    for (let z = 0; z < n; z++)
        for (let y = 0; y < n; y++)
            for (let x = 0; x < n; x++) {
                const solid =
                    pattern === 'checker'
                        ? (x + y + z) % 2 === 0
                        : pattern === 'hollow'
                          ? x === 0 || y === 0 || z === 0 || x === n - 1 || y === n - 1 || z === n - 1
                          : pattern === 'terrain'
                            ? y < Math.max(1, Math.floor(n * 0.5 + Math.sin(x) * 1.4 + Math.cos(z) * 0.8))
                            : true;
                const removed = carve && x === n - 1 && y === Math.floor(n / 2) && z === Math.floor(n / 2);
                cells.push(solid && !removed ? (materials && (x + y + z) % 2 ? 2 : 1) : 0);
            }
    return cells;
}
export function mesh(cells: number[], n: number, method: string, neighbor: string): Quad[] {
    const get = (q: number[]) => {
        if (q.some((v) => v < 0 || v >= n))
            return q[0] === n &&
                q[1] >= 0 &&
                q[1] < n &&
                q[2] >= 0 &&
                q[2] < n &&
                (neighbor === 'solid' || neighbor === 'hold')
                ? 1
                : 0;
        return cells[q[0] + n * q[1] + n * n * q[2]];
    };
    const result: Quad[] = [];
    for (let axis = 0; axis < 3; axis++)
        for (const sign of [-1, 1])
            for (let slice = 0; slice < n; slice++) {
                const a = (axis + 1) % 3,
                    b = (axis + 2) % 3,
                    mask = Array(n * n).fill(0) as number[];
                for (let v = 0; v < n; v++)
                    for (let u = 0; u < n; u++) {
                        const q = [0, 0, 0];
                        q[axis] = slice;
                        q[a] = u;
                        q[b] = v;
                        const material = get(q);
                        q[axis] += sign;
                        if (material && (method === 'cubes' || get(q) === 0)) mask[u + n * v] = material;
                    }
                for (let v = 0; v < n; v++)
                    for (let u = 0; u < n; u++)
                        if (mask[u + n * v]) {
                            const material = mask[u + n * v];
                            let w = 1,
                                h = 1;
                            if (method === 'greedy') {
                                while (u + w < n && mask[u + w + n * v] === material) w++;
                                outer: while (v + h < n) {
                                    for (let k = 0; k < w; k++)
                                        if (mask[u + k + n * (v + h)] !== material) break outer;
                                    h++;
                                }
                            }
                            result.push({
                                axis,
                                sign,
                                plane: slice + (sign > 0 ? 1 : 0),
                                u,
                                v,
                                w,
                                h,
                                material,
                            });
                            for (let j = 0; j < h; j++)
                                for (let i = 0; i < w; i++) mask[u + i + n * (v + j)] = 0;
                        }
            }
    return result;
}
export function corners(q: Quad): number[][] {
    const a = (q.axis + 1) % 3,
        b = (q.axis + 2) % 3;
    return [
        [0, 0],
        [q.w, 0],
        [q.w, q.h],
        [0, q.h],
    ].map(([u, v]) => {
        const p = [0, 0, 0];
        p[q.axis] = q.plane;
        p[a] = q.u + u;
        p[b] = q.v + v;
        return p;
    });
}
export function qef(angle: number, regularize: boolean) {
    const normals = [
            [1, 0],
            [Math.cos(angle), Math.sin(angle)],
        ],
        points = [
            [0.3, 0.3],
            [0.7, 0.65],
        ],
        lambda = regularize ? 0.02 : 0;
    let aa = lambda,
        ab = 0,
        bb = lambda,
        ra = lambda * 0.5,
        rb = lambda * 0.5;
    normals.forEach((n, i) => {
        const d = n[0] * points[i][0] + n[1] * points[i][1];
        aa += n[0] * n[0];
        ab += n[0] * n[1];
        bb += n[1] * n[1];
        ra += n[0] * d;
        rb += n[1] * d;
    });
    const determinant = aa * bb - ab * ab;
    const vertex =
        Math.abs(determinant) < 1e-12
            ? [0.5, 0.5]
            : [(ra * bb - rb * ab) / determinant, (rb * aa - ra * ab) / determinant];
    const error = normals.reduce(
        (sum, n, i) => sum + (n[0] * (vertex[0] - points[i][0]) + n[1] * (vertex[1] - points[i][1])) ** 2,
        0,
    );
    return { normals, points, vertex, determinant, error };
}
