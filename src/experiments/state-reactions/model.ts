export type Body = { id: number; wet: number; burning: boolean; flammable: boolean; x: number; y: number };
export type Contact = { target: number; kind: 'fire' | 'water' };
export type World = {
    bodies: Body[];
    queue: Contact[];
    tick: number;
    transitions: number;
    notifications: number;
    log: string[];
};
export function initialWorld(ring = false): World {
    return {
        bodies: Array.from({ length: 6 }, (_, id) => ({
            id,
            wet: 0,
            burning: false,
            flammable: id !== 4,
            x: ring ? 500 + 220 * Math.cos((id * Math.PI) / 3) : 130 + id * 145,
            y: ring ? 210 + 130 * Math.sin((id * Math.PI) / 3) : 210,
        })),
        queue: [],
        tick: 0,
        transitions: 0,
        notifications: 0,
        log: [],
    };
}
export function removeBody(world: World, id: number) {
    world.bodies = world.bodies.filter((b) => b.id !== id);
    world.queue = world.queue.filter((e) => e.target !== id);
}
export function stepWorld(world: World, policy: string, dry: number, budget: number, spread: boolean) {
    world.tick++;
    const messages: string[] = [];
    for (const body of world.bodies)
        if (body.wet > 0) {
            body.wet--;
            if (!body.wet) messages.push(`${body.id + 1}번 건조`);
        }
    const valid = world.queue.filter((e) => world.bodies.some((b) => b.id === e.target));
    const events =
        policy === 'water'
            ? valid.filter((e, i) => valid.findIndex((v) => v.target === e.target && v.kind === e.kind) === i)
            : valid;
    const current = events.slice(0, budget);
    world.queue = events.slice(budget);
    if (policy === 'water') current.sort((a, b) => Number(a.kind === 'fire') - Number(b.kind === 'fire'));
    for (const event of current) {
        const body = world.bodies.find((b) => b.id === event.target)!;
        if (event.kind === 'water') {
            const wasBurning = body.burning;
            const changed = body.wet === 0 || wasBurning;
            body.wet = dry;
            body.burning = false;
            if (changed) world.transitions++;
            if (changed || policy === 'arrival') {
                world.notifications++;
                messages.push(`${body.id + 1}번 ${wasBurning ? '소화' : '젖음'} 알림`);
            }
        } else if (body.flammable && body.wet === 0) {
            const changed = !body.burning;
            body.burning = true;
            if (changed) world.transitions++;
            if (changed || policy === 'arrival') {
                world.notifications++;
                messages.push(`${body.id + 1}번 점화 알림${changed ? '' : ' (중복)'}`);
            }
        } else messages.push(`${body.id + 1}번 점화 거부 · ${body.wet ? '젖음' : '불연성'}`);
    }
    if (spread)
        for (const source of world.bodies.filter((b) => b.burning))
            for (const target of world.bodies) {
                if (
                    source.id !== target.id &&
                    Math.hypot(source.x - target.x, source.y - target.y) < 270 &&
                    !world.queue.some((e) => e.target === target.id && e.kind === 'fire')
                )
                    world.queue.push({ target: target.id, kind: 'fire' });
            }
    world.log.unshift(
        `틱 ${world.tick} · 처리 ${current.length}건 / 대기 ${world.queue.length}건`,
        ...messages,
    );
    world.log = world.log.slice(0, 60);
}
