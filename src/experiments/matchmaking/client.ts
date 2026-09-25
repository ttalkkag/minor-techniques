import { initialQueue, expected, update, evaluate, type Candidate } from './model';
const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const val = (id: string) => Number(el<HTMLInputElement>(id).value);
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
let queue = initialQueue(),
    rating = 1500,
    waiting = 0,
    active: Candidate | null = null,
    events: string[] = [];
function assessment() {
    return evaluate(
        queue,
        rating,
        waiting,
        val('base'),
        val('expansion'),
        val('ping'),
        val('party'),
        selected('region'),
    );
}
function render() {
    const ratingInput = el<HTMLInputElement>('rating');
    ratingInput.min = String(Math.min(1000, Math.floor(rating)));
    ratingInput.max = String(Math.max(2000, Math.ceil(rating)));
    ratingInput.value = String(rating);
    for (const id of ['rating', 'sigma', 'base', 'expansion', 'ping', 'k'])
        el(`${id}-out`).textContent = id === 'rating' ? rating.toFixed(1) : String(val(id));
    const a = assessment(),
        opponent = active ?? a.best;
    el('wait-time').textContent = `${waiting}초`;
    el('width').textContent = `±${a.width}`;
    el('selected').textContent = active ? `${active.id} · 경기 중` : (a.best?.id ?? '없음');
    el('queue').innerHTML = a.rows
        .map(
            (c) =>
                `<tr><td><strong>${c.id}</strong></td><td>${c.rating.toFixed(1)}<small>차이 ${c.difference.toFixed(1)}</small></td><td>${c.ping} ms<small>${c.party}명 · ${c.region}</small></td><td class="${c.reasons.length ? 'bad' : 'good'}">${active?.id === c.id ? '경기 예약' : c.reasons.length ? c.reasons.join(' · ') : a.best?.id === c.id ? '최우선 후보' : '가능'}</td></tr>`,
        )
        .join('');
    const e = opponent ? expected(rating, opponent.rating) : null;
    el('expectation').textContent = e === null ? '상대 대기 중' : `E = ${e.toFixed(3)}`;
    el('expect-bar').style.width = `${(e ?? 0) * 100}%`;
    el('match-state').textContent = opponent
        ? `내 ${rating.toFixed(1)} vs ${opponent.id} ${opponent.rating.toFixed(1)}. ${active ? '승·무·패로 결과를 확정하세요.' : '경기 만들기로 이 후보를 예약합니다.'} E는 승리+무승부 절반의 기대점수입니다.`
        : '모든 조건을 통과한 후보가 없습니다. 탈락 이유와 점수 범위 확장을 비교하세요.';
    el('uncertainty').textContent =
        `별도 표시: μ=${rating.toFixed(1)}, σ=${val('sigma')}, μ±2σ=[${(rating - 2 * val('sigma')).toFixed(1)}, ${(rating + 2 * val('sigma')).toFixed(1)}], 보수적 표시 μ−2σ=${(rating - 2 * val('sigma')).toFixed(1)}. 큰 σ는 낮은 실력을 뜻하지 않습니다.`;
    for (const id of ['rating', 'sigma', 'base', 'expansion', 'ping', 'party', 'region', 'k'])
        el<HTMLInputElement>(id).disabled = !!active;
    el<HTMLButtonElement>('wait').disabled = !!active;
    el<HTMLButtonElement>('match').disabled = !!active || !a.best;
    for (const id of ['win', 'draw', 'lose']) el<HTMLButtonElement>(id).disabled = !active;
    el('events').innerHTML = events.map((e) => `<li>${e}</li>`).join('');
    el('summary').textContent = active
        ? `상대 ${active.id}와 경기 중입니다. 참가 조건은 잠겼으며 결과 확정 뒤 점수를 갱신합니다.`
        : `${queue.length}명 대기 중, 조건을 통과한 후보 ${a.rows.filter((r) => !r.reasons.length).length}명. 대기 ${waiting}초에서 점수 차 ±${a.width}까지 허용하며 핑·파티·지역 조건은 그대로입니다.`;
}
el('wait').addEventListener('click', () => {
    waiting += 10;
    render();
});
el('match').addEventListener('click', () => {
    const best = assessment().best;
    if (best)
        active = {
            id: best.id,
            rating: best.rating,
            ping: best.ping,
            party: best.party,
            region: best.region,
        };
    render();
});
function settle(score: number) {
    if (!active) return;
    const before = rating,
        r = update(rating, active.rating, val('k'), score);
    events.unshift(
        `${active.id}전 ${score === 1 ? '승' : score === 0.5 ? '무' : '패'} · E=${expected(before, active.rating).toFixed(3)} · 내 ${before.toFixed(2)}→${r.a.toFixed(2)} (${r.delta >= 0 ? '+' : ''}${r.delta.toFixed(2)}), 상대 ${active.rating.toFixed(2)}→${r.b.toFixed(2)} · 합 ${(r.a + r.b).toFixed(2)}`,
    );
    queue = queue.filter((c) => c.id !== active!.id);
    rating = r.a;
    active = null;
    waiting = 0;
    render();
}
el('win').addEventListener('click', () => settle(1));
el('draw').addEventListener('click', () => settle(0.5));
el('lose').addEventListener('click', () => settle(0));
el('rating').addEventListener('input', () => {
    rating = val('rating');
    render();
});
panel.querySelectorAll('input:not(#rating),select').forEach((i) => {
    i.addEventListener('input', render);
    i.addEventListener('change', render);
});
el('reset').addEventListener('click', () => {
    resetInputs();
    queue = initialQueue();
    rating = 1500;
    waiting = 0;
    active = null;
    events = [];
    render();
});
render();
