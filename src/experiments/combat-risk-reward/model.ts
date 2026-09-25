export type Combat = {
    hp: number;
    recoverable: number;
    expires: number;
    time: number;
    ammo: number;
    armor: number;
    claimed: boolean;
    lastHit: number;
};
export const initial = (): Combat => ({
    hp: 40,
    recoverable: 20,
    expires: 3,
    time: 0,
    ammo: 8,
    armor: 0,
    claimed: false,
    lastHit: 0,
});
export function hit(s: Combat, amount: number, window: number): Combat {
    if (s.hp <= 0) return s;
    const loss = Math.min(s.hp, amount);
    return {
        ...s,
        hp: s.hp - loss,
        recoverable: s.hp > loss ? loss : 0,
        expires: s.time + window,
        lastHit: s.time,
    };
}
export function counter(s: Combat, amount = 12): Combat {
    if (s.hp <= 0 || s.ammo <= 0) return s;
    const r = s.time < s.expires ? s.recoverable : 0,
        gain = Math.min(amount, r, 100 - s.hp);
    return { ...s, hp: s.hp + gain, recoverable: r - gain, ammo: s.ammo - 1 };
}
export function wait(s: Combat, regen: boolean, pressure: number): Combat {
    const time = s.time + 1;
    if (s.hp <= 0) return { ...s, time, recoverable: 0 };
    const heal = regen && time - s.lastHit >= 3 ? Math.max(0, Math.min(6, 80 - s.hp)) : 0;
    const hp = Math.max(0, Math.min(100, s.hp + heal) - (time > 5 ? pressure : 0));
    return {
        ...s,
        time,
        hp,
        recoverable: hp <= 0 || time >= s.expires ? 0 : Math.min(s.recoverable, 100 - s.hp - heal),
    };
}
export function reward(s: Combat, kind: string): Combat {
    if (s.hp <= 0 || s.claimed) return s;
    return {
        ...s,
        claimed: true,
        hp: kind === 'health' ? Math.min(100, s.hp + 20) : s.hp,
        ammo: kind === 'ammo' ? Math.min(40, s.ammo + 12) : s.ammo,
        armor: kind === 'armor' ? Math.min(50, s.armor + 15) : s.armor,
    };
}
export function riskMoments(p: number, reward: number, loss: number, cost: number) {
    const mean = p * reward - (1 - p) * loss - cost;
    return { mean, variance: p * (1 - p) * (reward + loss) ** 2 };
}
