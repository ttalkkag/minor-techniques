import { initial, step, weighted, rangeCounts, type Run } from './model';
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
type Entry = {
    turn: number;
    a: number;
    b: number;
    ah: boolean;
    bh: boolean;
    visual: number | null;
};
type Saved = {
    a: Run;
    b: Run;
    entries: Entry[];
    decorate: boolean;
    split: boolean;
    threshold: string;
    table: string;
    seed: string;
};
let a = initial(5),
    b = initial(5),
    entries: Entry[] = [],
    saved: Saved | null = null,
    notice = '아직 공격하지 않았습니다.';
function render() {
    el('seed-out').textContent = String(val('seed'));
    el('threshold-out').textContent = String(val('threshold'));
    el('turn').textContent = String(a.turn);
    el('checkpoint').textContent = saved ? `${saved.a.turn}턴` : '없음';
    el('equal').textContent = a.state === b.state && a.hp === b.hp ? '일치' : '불일치';
    el('a-state').textContent = `s = ${a.state}`;
    el('b-state').textContent = `s = ${b.state}`;
    el('a-detail').textContent = `HP ${a.hp} · 전투 스트림 ${a.calls}회 호출`;
    el('b-detail').textContent = `HP ${b.hp} · 전투 스트림 ${b.calls}회 호출 · 장식 상태 ${b.decoration}`;
    for (const side of ['a', 'b'] as const)
        el(`${side}-sequence`).innerHTML = entries
            .slice(-20)
            .map(
                (e) =>
                    `<span class="token ${e[side === 'a' ? 'ah' : 'bh'] ? 'hit' : 'miss'}" title="${e.turn}턴">${e[side]}</span>`,
            )
            .join('');
    const last = entries.at(-1),
        names = selected('table') === 'day' ? ['풀벌레', '늑대', '용'] : ['늑대', '유령', '용'],
        weights = selected('table') === 'day' ? [8, 4, 4] : [8, 6, 2];
    el('encounter').textContent = last
        ? `최근 출력 A ${last.a} → ${names[weighted(last.a, weights)]}, B ${last.b} → ${names[weighted(last.b, weights)]}. 후보 테이블 ${selected('table') === 'day' ? '낮' : '밤'}.`
        : '한 턴을 진행하면 같은 출력에 후보 테이블을 적용한 결과가 나옵니다.';
    const counts = rangeCounts(checked('reject'));
    el('range-counts').innerHTML = counts
        .map(
            (n, i) =>
                `<div class="visual-card"><h3>결과 ${i}</h3><div class="bar"><i style="width:${(n / 6) * 100}%"></i></div><strong>${n}개 원본 값</strong></div>`,
        )
        .join('');
    el('events').innerHTML = entries
        .slice(-30)
        .reverse()
        .map(
            (e) =>
                `<li>${e.turn}턴 · A ${e.a} ${e.ah ? '명중' : '실패'} / B ${e.b} ${e.bh ? '명중' : '실패'}${e.visual === null ? '' : ` · B 장식 ${e.visual}`}</li>`,
        )
        .join('');
    el<HTMLButtonElement>('restore').disabled = !saved;
    el('summary').textContent =
        `${notice} ${checked('split') ? '장식 호출은 별도 스트림만 전진시킵니다.' : 'B의 장식이 전투와 같은 스트림을 소비할 수 있습니다.'} 설정만 바꾸어도 이미 소비한 상태는 되돌아가지 않습니다.`;
}
function advance(n: number) {
    for (let i = 0; i < n; i++) {
        const x = step(a, false, false, val('threshold')),
            y = step(b, checked('decorate'), checked('split'), val('threshold'));
        a = x.run;
        b = y.run;
        entries.push({
            turn: a.turn,
            a: x.value,
            b: y.value,
            ah: x.hit,
            bh: y.hit,
            visual: y.visual,
        });
    }
    notice = `${n}턴 진행했습니다.`;
    render();
}
el('advance').addEventListener('click', () => advance(1));
el('ten').addEventListener('click', () => advance(10));
el('save').addEventListener('click', () => {
    saved = structuredClone({
        a,
        b,
        entries,
        decorate: checked('decorate'),
        split: checked('split'),
        threshold: selected('threshold'),
        table: selected('table'),
        seed: selected('seed'),
    });
    notice = `${a.turn}턴의 게임 상태·난수 상태·규칙을 함께 저장했습니다.`;
    render();
});
el('restore').addEventListener('click', () => {
    if (!saved) return;
    const s = structuredClone(saved);
    a = s.a;
    b = s.b;
    entries = s.entries;
    el<HTMLInputElement>('decorate').checked = s.decorate;
    el<HTMLInputElement>('split').checked = s.split;
    el<HTMLInputElement>('threshold').value = s.threshold;
    el<HTMLSelectElement>('table').value = s.table;
    el<HTMLInputElement>('seed').value = s.seed;
    if (selected('restore-mode') === 'seed') {
        a.state = Number(s.seed);
        b.state = Number(s.seed);
        a.decoration = b.decoration = (Number(s.seed) + 7) % 16;
        notice = '게임은 저장 턴으로 복원했지만 RNG를 초기 시드로 되돌렸습니다.';
    } else notice = '체크포인트의 중간 상태를 복원했습니다. 다음 출력이 이어집니다.';
    render();
});
function restart() {
    a = initial(val('seed'));
    b = initial(val('seed'));
    entries = [];
    saved = null;
    notice = '현재 시드의 첫 상태로 돌아왔습니다.';
    render();
}
el('seed').addEventListener('input', restart);
panel.querySelectorAll('input:not(#seed),select').forEach((i) => {
    i.addEventListener('input', render);
    i.addEventListener('change', render);
});
el('reset').addEventListener('click', () => {
    resetInputs();
    restart();
});
render();
