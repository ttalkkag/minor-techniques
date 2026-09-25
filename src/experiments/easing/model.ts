export type Method = 'linear' | 'smooth' | 'smoother' | 'css' | 'naive';
export function cssParameter(t: number, x1: number, x2: number) {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    if (x1 === 1 && x2 === 0) return 0.5 + Math.cbrt((t - 0.5) / 4);
    let low = 0,
        high = 1;
    for (let i = 0; i < 45; i++) {
        const u = (low + high) / 2,
            v = 1 - u;
        if (3 * v * v * u * x1 + 3 * v * u * u * x2 + u ** 3 < t) low = u;
        else high = u;
    }
    return (low + high) / 2;
}
export function easing(t: number, method: Method, x1 = 0, x2 = 1) {
    t = Math.max(0, Math.min(1, t));
    if (method === 'linear') return t;
    if (method === 'smooth') return 3 * t ** 2 - 2 * t ** 3;
    if (method === 'smoother') return 6 * t ** 5 - 15 * t ** 4 + 10 * t ** 3;
    const u = method === 'css' ? cssParameter(t, x1, x2) : t;
    return u ** 3;
}
export function motion(t: number, method: Method, duration: number, distance: number, x1 = 0, x2 = 1): {
    position: number;
    velocity: number | null;
    acceleration: number | null;
} {
    const position = distance * easing(t, method, x1, x2);
    if (t <= 0 || t >= 1) return { position, velocity: 0, acceleration: 0 };
    let first = 1,
        second = 0;
    if (method === 'smooth') {
        first = 6 * t - 6 * t * t;
        second = 6 - 12 * t;
    }
    if (method === 'smoother') {
        first = 30 * t * t * (t - 1) ** 2;
        second = 60 * t * (2 * t * t - 3 * t + 1);
    }
    if (method === 'naive') {
        first = 3 * t * t;
        second = 6 * t;
    }
    if (method === 'css') {
        if (x1 === 1 && x2 === 0 && t === 0.5)
            return { position, velocity: null, acceleration: null };
        const u = cssParameter(t, x1, x2),
            v = 1 - u;
        const dx = x1 === 1 && x2 === 0
            ? 12 * (u - 0.5) ** 2
            : 3 * v * v * x1 + 6 * v * u * (x2 - x1) + 3 * u * u * (1 - x2);
        const ddx = 6 * v * (x2 - 2 * x1) + 6 * u * (1 - 2 * x2 + x1);
        first = (3 * u * u) / dx;
        second = (6 * u * dx - 3 * u * u * ddx) / dx ** 3;
    }
    return {
        position,
        velocity: (distance * first) / duration,
        acceleration: (distance * second) / duration ** 2,
    };
}
