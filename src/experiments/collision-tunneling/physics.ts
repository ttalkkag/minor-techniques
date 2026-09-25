export interface Config {
  speed: number;
  hz: number;
  radius: number;
  thickness: number;
  start: number;
  end: number;
  wallX: number;
}

export type Method = 'discrete' | 'continuous';

export interface Body {
  x: number;
  prev: number;
  next: number;
  status: 'pending' | 'hit' | 'missed';
  hitTime: number | null;
  hitX: number | null;
  checks: number;
}

export interface Simulation {
  config: Config;
  tick: number;
  time: number;
  accumulator: number;
  discrete: Body;
  continuous: Body;
}

interface Shape {
  radius: number;
  thickness: number;
  wallX?: number;
}

export const DEFAULTS: Readonly<Config> = Object.freeze({
  speed: 90,
  hz: 10,
  radius: 0.16,
  thickness: 0.3,
  start: -5,
  end: 7,
  wallX: 0,
});

const EPSILON = 1e-10;
const METHODS: Method[] = ['discrete', 'continuous'];

export function overlapSphere({ x, radius, thickness, wallX = 0 }: Shape & { x: number }): boolean {
  return Math.abs(x - wallX) <= thickness / 2 + radius + EPSILON;
}

export function sweepSphere({ from, to, radius, thickness, wallX = 0 }: Shape & { from: number; to: number }) {
  if (overlapSphere({ x: from, radius, thickness, wallX })) {
    return {
      fraction: 0,
      x: from,
      contactX: wallX + (from <= wallX ? -thickness / 2 : thickness / 2),
    };
  }
  const distance = to - from;
  if (Math.abs(distance) <= EPSILON) return null;
  const direction = Math.sign(distance);
  const x = wallX - direction * (thickness / 2 + radius);
  const fraction = (x - from) / distance;
  if (fraction < -EPSILON || fraction > 1 + EPSILON) return null;
  return {
    fraction: Math.max(0, Math.min(1, fraction)),
    x,
    contactX: wallX - direction * thickness / 2,
  };
}

export function createSimulation(config: Partial<Config> = {}): Simulation {
  const settings = { ...DEFAULTS, ...config };
  const startsOverlapping = overlapSphere({ x: settings.start, ...settings });
  const body = (): Body => ({
    x: settings.start,
    prev: settings.start,
    next: settings.start,
    status: startsOverlapping ? 'hit' : 'pending',
    hitTime: startsOverlapping ? 0 : null,
    hitX: startsOverlapping ? settings.start : null,
    checks: 0,
  });
  return {
    config: settings,
    tick: 0,
    time: 0,
    accumulator: 0,
    discrete: body(),
    continuous: body(),
  };
}

export function stepSimulation(state: Simulation): boolean {
  if (state.discrete.status !== 'pending' && state.continuous.status !== 'pending') return false;
  const { speed, hz, radius, thickness, wallX, end } = state.config;
  const dt = 1 / hz;
  const direction = Math.sign(speed);
  for (const method of METHODS) {
    const body = state[method];
    if (body.status !== 'pending') continue;
    body.prev = body.x;
    body.next = body.x + speed * dt;
    body.checks += 1;
    const hit = method === 'continuous'
      ? sweepSphere({ from: body.prev, to: body.next, radius, thickness, wallX })
      : overlapSphere({ x: body.next, radius, thickness, wallX })
        ? { fraction: 1, x: body.next }
        : null;
    body.x = hit ? hit.x : body.next;
    if (hit) {
      body.status = 'hit';
      body.hitTime = state.time + hit.fraction * dt;
      body.hitX = hit.x;
    } else if (direction !== 0 && (
      direction * (body.x - wallX) > thickness / 2 + radius + EPSILON
      || direction * (body.x - end) >= -EPSILON
    )) {
      body.status = 'missed';
    }
  }
  state.tick += 1;
  state.time = state.tick * dt;
  return true;
}

export function advanceSimulation(state: Simulation, elapsedSeconds: number): number {
  state.accumulator += elapsedSeconds;
  const dt = 1 / state.config.hz;
  let steps = 0;
  while (state.accumulator + EPSILON >= dt) {
    if (!stepSimulation(state)) break;
    state.accumulator = Math.max(0, state.accumulator - dt);
    steps += 1;
  }
  if (state.discrete.status !== 'pending' && state.continuous.status !== 'pending') {
    state.accumulator = 0;
  }
  return steps;
}
