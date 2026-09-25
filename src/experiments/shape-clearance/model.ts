export interface ClearanceInput {
    width: number;
    ceiling: number;
    radius: number;
    height: number;
    slope: number;
    range: number;
    travel: 'warp' | 'sweep';
    obstacle: boolean;
}
export const defaults: ClearanceInput = {
    width: 0.6,
    ceiling: 2.3,
    radius: 0.4,
    height: 1.8,
    slope: 0,
    range: 4,
    travel: 'warp',
    obstacle: false,
};
export function clearance(input: ClearanceInput) {
    const angle = (input.slope * Math.PI) / 180;
    const foot = 3 + input.radius * (1 / Math.cos(angle) - 1);
    const sideGap = input.width / 2 - input.radius;
    const headGap = 3 + input.ceiling - foot - input.height;
    const surface = input.range >= 2.6;
    const slope = Math.cos(angle) >= Math.cos(Math.PI / 6) - 1e-10;
    const space = sideGap >= -1e-10 && headGap >= -1e-10 && !input.obstacle;
    const path = input.travel === 'warp';
    return {
        surface,
        slope,
        space,
        path,
        sideGap,
        headGap,
        foot,
        centers: [foot + input.radius, foot + input.height - input.radius],
        allowed: surface && slope && space && path,
    };
}
