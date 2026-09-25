export interface WorldState {
    origin: number;
    local: number;
    camera: number;
    obstacle: number;
    requested: number;
    start: number;
    steps: number;
}
export function initial(exponent: number): WorldState {
    const start = 2 ** exponent;
    return {
        origin: 0,
        local: start,
        camera: start,
        obstacle: start + 0.5,
        requested: start,
        start,
        steps: 0,
    };
}
export function step(state: WorldState, delta: number, storage: string): WorldState {
    return {
        ...state,
        local: storage === 'float' ? Math.fround(state.local + delta) : state.local + delta,
        requested: state.requested + delta,
        steps: state.steps + 1,
    };
}
export function rebase(state: WorldState, omit: boolean): WorldState {
    const shift = state.camera;
    return {
        ...state,
        origin: state.origin + shift,
        local: state.local - shift,
        camera: state.camera - shift,
        obstacle: omit ? state.obstacle : state.obstacle - shift,
    };
}
export function relative(state: WorldState, early: boolean) {
    return early
        ? Math.fround(state.local - state.camera)
        : Math.fround(state.local) - Math.fround(state.camera);
}
export function ulp(value: number) {
    return 2 ** (Math.floor(Math.log2(Math.max(Math.abs(value), 2 ** -126))) - 23);
}
