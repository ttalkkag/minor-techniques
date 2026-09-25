import { initial, choose, execute, editState } from './model';
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
    events: string[] = [],
    counts: Record<string, number> = {},
    consumed = '0회';
function decision() {
    const result = choose(state, val('type'), checked('broken'), checked('empty'));
    const forced = selected('forced');
    if (forced !== 'auto') {
        result.picked = result.rows.find((r) => r.id === forced && r.available) ?? null;
        result.ties = result.picked ? [result.picked] : [];
        result.seed = state.seed;
        result.consumed = false;
    }
    if (state.hp <= 0 || state.enemy <= 0) {
        result.picked = null;
        result.ties = [];
        result.seed = state.seed;
        result.consumed = false;
    }
    return result;
}
function render() {
    el<HTMLInputElement>('turn').max = String(Math.max(99, state.turn));
    el<HTMLInputElement>('turn').value = String(state.turn);
    el('hp-out').textContent = String(state.hp);
    el('turn-out').textContent = String(state.turn);
    el('heavy-pp-out').textContent = String(state.moves.find((m) => m.id === 'heavy')!.pp);
    const r = decision();
    el('chosen').textContent = r.ties.length ? r.ties.map((m) => m.name).join(' / ') : '선택 불가';
    el('state').textContent = `${state.hp} / ${state.enemy}`;
    el('rng').textContent = consumed;
    el('scores').innerHTML = r.rows
        .map(
            (m) =>
                `<tr><td><strong>${m.name}</strong><small>${m.kind === 'damage' ? `피해 ${m.power}` : '비피해 효과'}</small></td><td class="${m.available ? 'good' : 'bad'}">${checked('empty') ? 0 : m.pp}<small class="${m.available ? 'good' : 'bad'}">${m.available ? '가능' : '제외'}</small></td><td>20${m.changes.map((c) => `<small>${c.delta >= 0 ? '+' : ''}${c.delta} ${c.label}</small>`).join('')}</td><td><strong class="${r.ties.some((t) => t.id === m.id) ? 'good' : ''}">${m.available ? m.cost : '—'}</strong></td></tr>`,
        )
        .join('');
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    el('frequencies').innerHTML = state.moves
        .map(
            (m) =>
                `<div class="rowlabel"><span>${m.name}</span><span>${counts[m.id] ?? 0} / ${total}</span></div><div class="bar"><i style="width:${total ? ((counts[m.id] ?? 0) / total) * 100 : 0}%"></i></div>`,
        )
        .join('');
    el('events').innerHTML = events
        .slice(0, 25)
        .map((e) => `<li>${e}</li>`)
        .join('');
    el<HTMLButtonElement>('execute').disabled = !r.picked;
    el<HTMLButtonElement>('choose').disabled = !r.picked;
    el<HTMLButtonElement>('ties').disabled = !r.picked;
    el('summary').textContent = !r.picked
        ? state.hp <= 0 || state.enemy <= 0
            ? '전투가 끝났습니다. 초기화로 다시 시작하세요.'
            : '고정 행동을 사용할 수 없거나 사용 가능한 기술이 없습니다. 불가능한 기술을 대신 고르지 않습니다.'
        : `${r.rows.filter((m) => m.available).length}개 사용 가능 후보 중 ${r.ties.length}개 최소 집합. ${selected('forced') === 'auto' ? '낮은 비용을 선호합니다.' : '고정 행동 정책이 점수 선택을 대체합니다.'} ${checked('broken') ? '오류 비교: 비피해 기술에도 피해 상성 비용을 적용했습니다.' : '비피해 효과에는 피해 상성을 적용하지 않습니다.'}`;
}
function act(executing: boolean) {
    const r = decision();
    if (!r.picked) return;
    state.seed = r.seed;
    consumed = r.consumed ? '1회 · 동점 추첨' : '0회 · 단독/고정';
    events.unshift(
        `${state.turn}턴 ${r.picked.name} 선택 · 비용${r.picked.cost} · ${consumed}${executing ? ' · 실행하여 PP/효과 갱신' : ''}`,
    );
    if (executing) {
        state = execute(state, r.picked.id, val('type'));
        el<HTMLInputElement>('hp').value = String(state.hp);
        el<HTMLInputElement>('turn').value = String(state.turn);
        el<HTMLInputElement>('poisoned').checked = state.poisoned;
        el<HTMLInputElement>('heavy-pp').value = String(state.moves.find((m) => m.id === 'heavy')!.pp);
    }
    counts = {};
    render();
}
el('choose').addEventListener('click', () => act(false));
el('execute').addEventListener('click', () => act(true));
el('ties').addEventListener('click', () => {
    counts = {};
    let totalCalls = 0;
    for (let i = 0; i < 1000; i++) {
        const r = decision();
        if (!r.picked) break;
        state.seed = r.seed;
        totalCalls += Number(r.consumed);
        counts[r.picked.id] = (counts[r.picked.id] ?? 0) + 1;
    }
    consumed = `${totalCalls}회 / 1,000선택`;
    render();
});
for (const id of ['hp', 'turn', 'poisoned', 'heavy-pp'] as const)
    el(id).addEventListener('input', () => {
        state = editState(
            state,
            id === 'heavy-pp'
                ? { heavyPp: val(id) }
                : id === 'poisoned'
                  ? { poisoned: checked(id) }
                  : { [id]: val(id) },
        );
        counts = {};
        render();
    });
for (const id of ['type', 'broken', 'empty', 'forced']) {
    el(id).addEventListener('input', () => {
        counts = {};
        render();
    });
    el(id).addEventListener('change', () => {
        counts = {};
        render();
    });
}
el('reset').addEventListener('click', () => {
    resetInputs();
    state = initial();
    events = [];
    counts = {};
    consumed = '0회';
    render();
});
render();
