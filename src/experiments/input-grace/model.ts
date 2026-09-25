export type GraceState = {
    lastGround: number;
    lastPress: number;
    groundAvailable: boolean;
    inputAvailable: boolean;
    held: boolean;
};
export function canJump(
    s: GraceState,
    t: number,
    grounded: boolean,
    coyote: number,
    buffer: number,
    requireHeld: boolean,
) {
    return (
        s.inputAvailable &&
        t >= s.lastPress &&
        t - s.lastPress <= buffer + 1e-9 &&
        (!requireHeld || s.held) &&
        s.groundAvailable &&
        (grounded || (t >= s.lastGround && t - s.lastGround <= coyote + 1e-9))
    );
}
export function consume(s: GraceState) {
    s.groundAvailable = false;
    s.inputAvailable = false;
}
