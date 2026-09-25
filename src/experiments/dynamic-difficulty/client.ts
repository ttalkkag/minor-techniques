import { replay } from './model';
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
let inputs: number[] = [];
function render() {
    for (const id of ['alpha', 'low', 'high', 'interval', 'hold', 'base', 'assist'])
        el(`${id}-out`).textContent = String(val(id));
    const rows = replay(inputs, {
            alpha: val('alpha'),
            low: val('low'),
            high: val('high'),
            interval: val('interval'),
            hold: val('hold'),
            initial: val('base'),
        }),
        last = rows.at(-1),
        level = last?.level ?? val('base');
    el('mean').textContent = (last?.mean ?? 0.2).toFixed(3);
    el('level').textContent = `${level} / ${last?.naive ?? val('base')}`;
    let prior = val('base'),
        naiveChanges = 0;
    for (const r of rows) {
        if (prior !== r.naive) naiveChanges++;
        prior = r.naive;
    }
    el('changes').textContent = `${rows.filter((r) => r.changed).length} / ${naiveChanges}`;
    const shown = rows.slice(-60),
        w = Math.min(850, Math.max(300, el('chart').clientWidth)),
        x = (i: number) => 45 + (i * (w - 70)) / Math.max(1, shown.length),
        y = (l: number) => 260 - (l - 1) * 48;
    el('chart').setAttribute('viewBox', `0 0 ${w} 330`);
    const chart = [`<rect width="${w}" height="330" fill="#f9fcfb"/>`];
    for (let l = 1; l <= 5; l++)
        chart.push(
            `<path d="M45 ${y(l)}H${w - 20}" stroke="#d8e4df"/><text x="20" y="${y(l) + 5}" fill="#486770" font-size="13">${l}</text>`,
        );
    chart.push(
        `<path d="M45 ${y(val('base'))}H${w - 20}" stroke="#8b9fa2" stroke-dasharray="7 5"/><text x="40" y="20" fill="#4a696f" font-size="13">난이도 L · 최근 ${shown.length}턴</text>`,
    );
    for (const [field, color] of [
        ['naive', '#d67c43'],
        ['level', '#158473'],
    ] as const) {
        const start = rows.length > 60 ? rows[rows.length - 61]![field] : val('base');
        const points = [[x(0), y(start)], ...shown.map((r, i) => [x(i + 1), y(r[field])])];
        chart.push(
            `<polyline points="${points.map((p) => p.join(',')).join(' ')}" fill="none" stroke="${color}" stroke-width="3"/>`,
        );
    }
    shown.forEach((r, i) =>
        chart.push(
            `<circle cx="${x(i + 1)}" cy="292" r="${shown.length > 35 ? 3 : 5}" fill="${r.failure ? '#d67c43' : '#158473'}"/>`,
        ),
    );
    chart.push('<text x="40" y="322" fill="#5a7277" font-size="12">관측: 성공 0 / 실패 1 →</text>');
    el('chart').innerHTML = chart.join('');
    const target = selected('target');
    el('parameter').textContent =
        target === 'hp'
            ? `적 체력 ${50 + 10 * level}`
            : target === 'reaction'
              ? `공격 예고 ${(1.6 - 0.2 * level + val('assist')).toFixed(1)}초`
              : `복구 거리 ${10 * level} m`;
    el('manual').textContent =
        `수동 시작 난이도 ${val('base')} · 수동 반응 여유 ${val('assist').toFixed(1)}초는 자동 판단과 독립입니다. 선택하지 않은 축은 수동 시작 난이도를 사용합니다.`;
    el('events').innerHTML = rows
        .slice(-20)
        .reverse()
        .map(
            (r) =>
                `<li>${r.turn}턴 ${r.failure ? '실패' : '성공'} → m=${r.mean.toFixed(3)} → L=${r.level} · ${r.reason}</li>`,
        )
        .join('');
    el('summary').textContent = last
        ? `${inputs.length}개 관측을 같은 순서로 재생했습니다. 마지막 판정: ${last.reason}. α=${val('alpha')}, 낮추기 >${val('high')}, 높이기 <${val('low')}.`
        : '성공·실패 입력을 추가하세요. 평균의 초기값은 0.2, 난이도는 수동 시작값입니다.';
}
function append(xs: number[]) {
    inputs.push(...xs);
    render();
}
el('success').addEventListener('click', () => append([0]));
el('failure').addEventListener('click', () => append([1]));
el('alternate').addEventListener('click', () => append(Array.from({ length: 12 }, (_, i) => i % 2)));
el('persistent').addEventListener('click', () => append(Array(8).fill(1)));
el('learning').addEventListener('click', () => append([1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0]));
panel.querySelectorAll('input,select').forEach((i) => {
    i.addEventListener('input', render);
    i.addEventListener('change', render);
});
el('reset').addEventListener('click', () => {
    resetInputs();
    inputs = [];
    render();
});
render();

window.addEventListener('resize', render);
window.addEventListener('pageshow', render);
