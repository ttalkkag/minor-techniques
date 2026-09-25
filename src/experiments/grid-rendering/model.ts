export type Cell = { x: number; y: number; distance: number };
export type RayHit = {
    x: number;
    y: number;
    distance: number;
    side: 'x' | 'y' | 'inside';
    cells: Cell[];
    wall: number;
};
export type Point = { x: number; y: number };

export function makeMap(kind: 'flat' | 'rooms'): number[][] {
    const grid: number[][] = Array.from({ length: 10 }, (_, y) =>
        Array.from({ length: 10 }, (_, x) => (x === 0 || y === 0 || x === 9 || y === 9 ? 1 : 0)),
    );
    if (kind === 'flat') {
        for (let y = 1; y < 9; y++) grid[y]![7] = 2;
    } else {
        for (let y = 1; y < 7; y++) if (y !== 4) grid[y]![6] = 2;
        for (let x = 2; x < 6; x++) grid[2]![x] = 3;
        grid[7]![3] = 3;
        grid[7]![4] = 3;
    }
    return grid;
}

export function castRay(grid: number[][], origin: Point, direction: Point): RayHit | null {
    const length = Math.hypot(direction.x, direction.y);
    if (!length) return null;
    const dx = direction.x / length;
    const dy = direction.y / length;
    let x = Math.floor(origin.x);
    let y = Math.floor(origin.y);
    const cells: Cell[] = [{ x, y, distance: 0 }];
    const wallAt = (cx: number, cy: number) => grid[cy]?.[cx];
    if (wallAt(x, y) === undefined) return null;
    if (wallAt(x, y)) return { x, y, distance: 0, side: 'inside', cells, wall: wallAt(x, y)! };
    const stepX = dx < 0 ? -1 : 1;
    const stepY = dy < 0 ? -1 : 1;
    const deltaX = dx === 0 ? Infinity : Math.abs(1 / dx);
    const deltaY = dy === 0 ? Infinity : Math.abs(1 / dy);
    let nextX = dx === 0 ? Infinity : (dx < 0 ? origin.x - x : x + 1 - origin.x) * deltaX;
    let nextY = dy === 0 ? Infinity : (dy < 0 ? origin.y - y : y + 1 - origin.y) * deltaY;
    const visit = (cx: number, cy: number, distance: number, side: 'x' | 'y'): RayHit | null => {
        cells.push({ x: cx, y: cy, distance });
        const wall = wallAt(cx, cy);
        return wall ? { x: cx, y: cy, distance, side, cells, wall } : null;
    };
    for (let step = 0; step < grid.length * (grid[0]?.length ?? 0) * 2; step++) {
        if (Math.abs(nextX - nextY) < 1e-10) {
            const distance = nextX;
            const edgeX = visit(x + stepX, y, distance, 'x');
            if (edgeX) return edgeX;
            const edgeY = visit(x, y + stepY, distance, 'y');
            if (edgeY) return edgeY;
            x += stepX;
            y += stepY;
            nextX += deltaX;
            nextY += deltaY;
            const diagonal = visit(x, y, distance, 'x');
            if (diagonal) return diagonal;
        } else if (nextX < nextY) {
            const distance = nextX;
            x += stepX;
            nextX += deltaX;
            const hit = visit(x, y, distance, 'x');
            if (hit) return hit;
        } else {
            const distance = nextY;
            y += stepY;
            nextY += deltaY;
            const hit = visit(x, y, distance, 'y');
            if (hit) return hit;
        }
        if (wallAt(x, y) === undefined) return null;
    }
    return null;
}

export function columnRay(
    bearing: number,
    fov: number,
    fraction: number,
): { direction: Point; offset: number } {
    const offset = Math.atan((fraction * 2 - 1) * Math.tan(fov / 2));
    return { direction: { x: Math.cos(bearing + offset), y: Math.sin(bearing + offset) }, offset };
}

export function projection(distance: number, offset: number, focalLength: number, wallHeight: number) {
    const depth = distance * Math.cos(offset);
    return {
        depth,
        rawHeight: (focalLength * wallHeight) / Math.max(distance, 0.05),
        correctedHeight: (focalLength * wallHeight) / Math.max(depth, 0.05),
    };
}
