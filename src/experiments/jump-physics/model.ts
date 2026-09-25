export type Integration = 'analytic' | 'explicit' | 'semi';
export function integrate(y: number, v: number, a: number, h: number, method: Integration) {
    return {
        y: y + v * h + (method === 'analytic' ? 0.5 * a * h * h : method === 'semi' ? a * h * h : 0),
        v: v + a * h,
    };
}
export function brake(v: number, amount: number) {
    return Math.abs(v) <= amount ? 0 : Math.sign(v) * (Math.abs(v) - amount);
}
export function cutJump(v: number, cut: number) {
    return v > 0 ? Math.min(v, Math.max(0, cut)) : v;
}
export function jumpSamples(
    h: number,
    method: Integration,
    downMultiplier: number,
    release: number,
    cut: number,
) {
    let y = 0,
        v = 10,
        t = 0,
        peak = 0,
        released = false;
    const points = [{ t, y }];
    while (t < 3) {
        if (!released && t + 1e-10 >= release) {
            v = cutJump(v, cut);
            released = true;
        }
        const result = integrate(y, v, -20 * (v < -1e-10 ? downMultiplier : 1), h, method);
        t += h;
        y = result.y;
        v = result.v;
        if (y <= 1e-10) {
            points.push({ t, y: 0 });
            break;
        }
        peak = Math.max(peak, y);
        points.push({ t, y });
    }
    return { points, peak, landing: t };
}
