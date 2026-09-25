export function stoppingDistance(speed: number, brake: number) {
    return (speed * speed) / (2 * brake);
}
export function floorAt(x: number, mixed: boolean) {
    if ((x > 38 && x < 42) || (mixed && x > 7 && x < 11)) return -100;
    if (x > 24 && x < 28) return -1.5;
    return 0;
}
export class JumpInput {
    private previous = false;
    private replayTime = -1;

    get replaying() {
        return this.replayTime >= 0;
    }

    startReplay() {
        this.replayTime = 0;
        this.previous = false;
    }

    reset() {
        this.replayTime = -1;
        this.previous = false;
    }

    step(dt: number, held: boolean) {
        if (this.replaying) this.replayTime += dt;
        const down = this.replaying ? this.replayTime < 0.12 : held;
        const pressed = down && !this.previous;
        this.previous = down;
        return { down, pressed };
    }
}
export function jumpSample(releaseMultiplier: number, fallMultiplier: number) {
    let y = 0,
        v = 8.5,
        time = 0,
        peak = 0;
    const dt = 1 / 600;
    while (time < 5) {
        const gravity = 18 * (v < 0 ? fallMultiplier : time > 0.12 ? releaseMultiplier : 1);
        v -= gravity * dt;
        y += v * dt;
        peak = Math.max(peak, y);
        time += dt;
        if (y < 0) break;
    }
    return { peak, time, range: 5 * time };
}
