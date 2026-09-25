export function damp(current: number, target: number, half: number, dt: number) {
    return target + (current - target) * Math.pow(0.5, dt / half);
}
export function confine(center: number, left: number, right: number, width: number) {
    return right - left < width
        ? (left + right) / 2
        : Math.max(left + width / 2, Math.min(right - width / 2, center));
}
export function deadTarget(current: number, target: number, radius: number) {
    return current + Math.sign(target - current) * Math.max(0, Math.abs(target - current) - radius);
}
