import { initial, counter, hit, wait, reward, riskMoments } from './model';
const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const val = (id: string) => Number(el<HTMLInputElement>(id).value);
const checked = (id: string) => el<HTMLInputElement>(id).checked;
const selected = (id: string) => el<HTMLSelectElement>(id).value;
const menu = el<HTMLButtonElement>('menu'),
    panel = el<HTMLElement>('settings'),
    dialog = el<HTMLDialogElement>('explanation');
const mobileMenu = matchMedia('(max-width:780px)');
const backdrop = el<HTMLElement>('menu-backdrop'),
    closeMenu = el<HTMLButtonElement>('close-menu'),
    stage = document.querySelector<HTMLElement>('.stage')!,
    listLink = document.querySelector<HTMLElement>('.lab > header a')!;
const menuControls = () =>
    [
        ...panel.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href]',
        ),
    ].filter((control) => !control.hidden && control.getClientRects().length > 0);
function syncMenu() {
    const overlay = mobileMenu.matches && !panel.hidden;
    menu.setAttribute('aria-expanded', String(!panel.hidden));
    closeMenu.hidden = !mobileMenu.matches;
    backdrop.hidden = !overlay;
    stage.inert = overlay;
    listLink.inert = overlay;
    document.body.style.overflow = overlay ? 'hidden' : '';
    if (overlay) {
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-modal', 'true');
    } else {
        panel.setAttribute('role', 'complementary');
        panel.removeAttribute('aria-modal');
    }
}
function setMenu(open: boolean) {
    panel.hidden = !open;
    syncMenu();
    if (open) menuControls()[0]?.focus();
    else menu.focus();
}
panel.hidden = mobileMenu.matches;
syncMenu();
menu.addEventListener('click', () => setMenu(Boolean(panel.hidden)));
closeMenu.addEventListener('click', () => setMenu(false));
backdrop.addEventListener('click', () => setMenu(false));
el('explain').addEventListener('click', () => dialog.showModal());
el('close-dialog').addEventListener('click', () => dialog.close());
document.addEventListener('keydown', (event) => {
    if (dialog.open) return;
    if (event.key === 'Escape' && !panel.hidden) {
        event.preventDefault();
        setMenu(false);
    } else if (event.key === 'Tab' && mobileMenu.matches && !panel.hidden) {
        const controls = menuControls(),
            first = controls[0],
            last = controls.at(-1);
        if (!panel.contains(document.activeElement) || (event.shiftKey && document.activeElement === first)) {
            event.preventDefault();
            (event.shiftKey ? last : first)?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
        }
    }
});
const restoreMenu = () => {
    syncMenu();
    if (mobileMenu.matches && !panel.hidden && !dialog.open && !panel.contains(document.activeElement))
        menuControls()[0]?.focus();
};
mobileMenu.addEventListener('change', restoreMenu);
window.addEventListener('pageshow', restoreMenu);
function resetInputs() {
    panel.querySelectorAll<HTMLInputElement>('input').forEach((i) => {
        i.value = i.defaultValue;
        i.checked = i.defaultChecked;
    });
    panel.querySelectorAll<HTMLSelectElement>('select').forEach((s) => (s.selectedIndex = 0));
}
let state = initial(),
    seed = 12345,
    safeTotal = 0,
    riskyTotal = 0,
    attempts = 0,
    events: string[] = [];
const record = (text: string) => {
    events.unshift(`${state.time.toFixed(0)}초 · ${text}`);
    events = events.slice(0, 30);
};
function render() {
    for (const id of ['window', 'pressure', 'chance', 'prize', 'loss', 'cost'])
        el(`${id}-out`).textContent = `${val(id)}${id === 'window' ? '초' : id === 'chance' ? '%' : ''}`;
    el('hp').textContent = `${state.hp} / 100`;
    el('recoverable').textContent = `${state.recoverable} · ${Math.max(0, state.expires - state.time)}초`;
    el('clock').textContent = `${state.time}초`;
    el('hp-label').textContent = `${state.hp} + ${state.recoverable}`;
    el('hp-bar').style.width = `${state.hp}%`;
    el('rally-bar').style.left = `${state.hp}%`;
    el('rally-bar').style.width = `${Math.min(state.recoverable, 100 - state.hp)}%`;
    el('ammo').textContent = String(state.ammo);
    el('ammo-bar').style.width = `${(state.ammo / 40) * 100}%`;
    el('armor').textContent = String(state.armor);
    el('armor-bar').style.width = `${state.armor * 2}%`;
    const m = riskMoments(val('chance') / 100, val('prize'), val('loss'), val('cost'));
    el('risk-mean').textContent = `기대 순보상 ${m.mean.toFixed(2)}`;
    el('risk-variance').textContent =
        `위험 경로 분산 ${m.variance.toFixed(2)} · 안전 경로보다 평균 ${m.mean >= 5 ? '+' : ''}${(m.mean - 5).toFixed(2)}`;
    el('path-score').textContent =
        `안전 누적 ${safeTotal} · 위험 누적 ${riskyTotal} / ${attempts}회 · 위험 관측 평균 ${attempts ? (riskyTotal / attempts).toFixed(2) : '—'}`;
    el('enemy-state').textContent = state.claimed
        ? '이 적의 보상은 이미 지급되었습니다. 다음 적으로 넘어가야 다시 받습니다.'
        : '현재 적은 아직 보상을 지급하지 않았습니다.';
    el<HTMLButtonElement>('kill').disabled = state.claimed || state.hp <= 0;
    el<HTMLButtonElement>('counter').disabled = state.hp <= 0 || state.ammo <= 0;
    el<HTMLButtonElement>('hit').disabled = state.hp <= 0;
    el('events').innerHTML = events.map((e) => `<li>${e}</li>`).join('');
    el('summary').textContent =
        state.hp <= 0
            ? '체력이 0입니다. 처치 보상과 반격으로 되살아나지 않습니다. 초기화로 다시 시작하세요.'
            : `체력 ${state.hp}, 회복 예산 ${state.recoverable}, 탄약 ${state.ammo}. ${state.time >= state.expires ? '회복 창이 만료되었습니다.' : `회복 창은 ${state.expires}초에 만료됩니다.`} ${checked('regen') ? '대기 회복은 마지막 피격 3초 뒤부터 체력80까지만 적용됩니다.' : '자동 회복은 꺼져 있습니다.'}`;
}
el('counter').addEventListener('click', () => {
    const prev = state;
    state = counter(state);
    record(`반격: 체력 +${state.hp - prev.hp}, 탄약 ${state.ammo - prev.ammo}, 남은 회복 ${state.recoverable}`);
    render();
});
el('hit').addEventListener('click', () => {
    state = hit(state, 20, val('window'));
    record(`피격 −20, 회복 예산을 이번 손실 ${state.recoverable}로 교체`);
    render();
});
el('wait').addEventListener('click', () => {
    const prev = state.hp;
    state = wait(state, checked('regen'), val('pressure'));
    record(`대기: 체력 변화 ${state.hp - prev}`);
    render();
});
el('kill').addEventListener('click', () => {
    state = reward(state, selected('drop'));
    record(`처치 보상: ${selected('drop')}`);
    render();
});
el('spawn').addEventListener('click', () => {
    state = {
        ...wait(state, checked('regen'), val('pressure')),
        claimed: false,
    };
    record('다음 적 등장 · 1초 경과');
    render();
});
function risky(n: number) {
    let total = 0;
    for (let i = 0; i < n; i++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        total += (seed / 4294967296 < val('chance') / 100 ? val('prize') : -val('loss')) - val('cost');
    }
    attempts += n;
    riskyTotal += total;
    record(`위험 경로 ${n}회, 순보상 ${total}`);
    render();
}
el('safe').addEventListener('click', () => {
    safeTotal += 5;
    record('안전 경로 +5');
    render();
});
el('risky').addEventListener('click', () => risky(1));
el('batch').addEventListener('click', () => risky(100));
panel.querySelectorAll('input,select').forEach((i) => {
    i.addEventListener('input', render);
    i.addEventListener('change', render);
});
el('reset').addEventListener('click', () => {
    resetInputs();
    state = initial();
    seed = 12345;
    safeTotal = 0;
    riskyTotal = 0;
    attempts = 0;
    events = [];
    render();
});
render();
