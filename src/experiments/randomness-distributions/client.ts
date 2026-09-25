import { initial, draw, meanC, calibrate, random, coinReward, type Rule, type Sim } from './model';
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
const rules: Rule[] = ['independent', 'ceiling', 'bag', 'cumulative'];
const names: Record<Rule, string> = {
    independent: '독립 추첨',
    ceiling: 'K번째 성공 보장',
    bag: '20개 셔플백',
    cumulative: '실패 누적',
};
let sims: Record<Rule, Sim> = {
        independent: initial(),
        ceiling: initial(),
        bag: initial(),
        cumulative: initial(),
    },
    coinSeed = 777,
    coinScore = 0,
    coinCount = 0,
    coinLog = '안전 또는 위험 행동을 고르면 다음 동전을 소비합니다.',
    policy = '공개 전 안전/위험의 이론 기대값은 모두 +1입니다. 공개 후 앞이면 위험, 뒤이면 안전을 고르면 +5.5입니다.';
const constant = () => (checked('calibrate') ? calibrate(val('p')) : val('constant'));
function render() {
    for (const id of ['p', 'ceiling', 'constant']) el(`${id}-out`).textContent = String(val(id));
    const p = val('p'),
        k = val('ceiling'),
        c = constant();
    el('draws').textContent = String(sims.independent.draws);
    el('tail').textContent = `${((1 - p) ** 10 * 100).toFixed(3)}%`;
    el('c-value').textContent = c.toFixed(6);
    const means: Record<Rule, number> = {
        independent: 1 / p,
        ceiling: (1 - (1 - p) ** k) / p,
        bag: 1 / p,
        cumulative: meanC(c),
    };
    el('comparisons').innerHTML = rules
        .map((rule) => {
            const s = sims[rule],
                m = means[rule];
            return `<div class="visual-card"><h3>${names[rule]}</h3><p class="rowlabel"><span>이론 장기 성공률</span><strong>${(100 / m).toFixed(2)}%</strong></p><p class="note">장기 평균 간격 ${m.toFixed(3)}회 · 관측 성공률 ${s.draws ? ((s.successes / s.draws) * 100).toFixed(2) + '%' : '—'}<br/>성공 ${s.successes} / ${s.draws} · 최장 실패 ${s.longest} · 현재 실패 ${s.failures}${rule === 'bag' ? ` · 가방 잔량 ${s.bag.length}` : ''}</p><div class="outcomes" role="img" aria-label="${names[rule]} 최근 ${s.history.length}회 결과: ${s.history.length ? s.history.map((h) => (h ? '성공' : '실패')).join(', ') : '추첨 전'}">${s.history.map((h) => `<i class="${h ? 'success' : ''}" aria-hidden="true"></i>`).join('')}</div></div>`;
        })
        .join('');
    const rule = selected('hist-rule') as Rule,
        s = sims[rule],
        bins = Array(21).fill(0);
    s.waits.forEach((n) => bins[Math.min(20, n - 1)]++);
    const max = Math.max(1, ...bins);
    el('histogram').innerHTML = bins
        .map(
            (n, i) =>
                `<div title="${i === 20 ? '21회 이상' : i + 1 + '회'}: ${n}개"><i style="height:${(n / max) * 112}px"></i><span>${i === 20 ? '21+' : i + 1}</span></div>`,
        )
        .join('');
    const mean = s.waits.length ? s.waits.reduce((a, b) => a + b, 0) / s.waits.length : 0,
        variance = s.waits.length ? s.waits.reduce((a, b) => a + (b - mean) ** 2, 0) / s.waits.length : 0;
    el('hist-note').textContent =
        `${names[rule]} · 완료된 성공 간격 ${s.waits.length}개, 관측 평균 ${s.waits.length ? mean.toFixed(3) : '—'}, 분산 ${s.waits.length ? variance.toFixed(3) : '—'}. 진행 중인 실패 ${s.failures}회는 히스토그램에서 제외합니다.${rule === 'independent' ? ` 이론 분산 ${((1 - p) / p ** 2).toFixed(3)}.` : ''}`;
    const heads = random(coinSeed) / 4294967296 < 0.5;
    el('coin').textContent =
        selected('reveal') === 'before' ? (heads ? '다음 동전: 앞' : '다음 동전: 뒤') : '다음 동전: ?';
    el('coin-log').textContent = `${coinLog} · ${coinCount}회 총점 ${coinScore}`;
    el('coin-policy').textContent = policy;
    el('summary').textContent =
        `각 규칙 ${sims.independent.draws}회. p=${p.toFixed(2)}, 천장 K=${k}, 누적 C=${c.toFixed(6)}. ${checked('calibrate') ? '누적 장기 성공률을 p에 맞췄습니다.' : '보정하지 않은 C의 장기 성공률은 이론값에서 확인하세요. C=p일 때 0<p<1에서는 p보다 높고, p=1에서는 같습니다.'} 청록은 성공, 옅은 칸은 실패이며 최근80회를 표시합니다.`;
}
function run(n: number) {
    const count = Math.min(n, 20000 - sims.independent.draws);
    const c = constant();
    for (const rule of rules)
        for (let i = 0; i < count; i++) sims[rule] = draw(sims[rule], rule, val('p'), val('ceiling'), c);
    render();
    if (count < n) el('summary').textContent += ' 화면의 관측 상한 20,000회에 도달했습니다. 초기화로 다시 시작하세요.';
}
for (const [id, n] of [
    ['one', 1],
    ['hundred', 100],
    ['thousand', 1000],
] as const)
    el(id).addEventListener('click', () => run(n));
function coin(risk: boolean) {
    coinSeed = random(coinSeed);
    const heads = coinSeed / 4294967296 < 0.5,
        reward = coinReward(heads, risk);
    coinScore += reward;
    coinCount++;
    coinLog = `${heads ? '앞' : '뒤'} · ${risk ? '위험' : '안전'} 선택 → ${reward >= 0 ? '+' : ''}${reward}`;
    render();
}
el('safe').addEventListener('click', () => coin(false));
el('risk').addEventListener('click', () => coin(true));
el('coin-batch').addEventListener('click', () => {
    let seed = 777,
        risky = 0,
        adaptive = 0,
        heads = 0;
    for (let i = 0; i < 100; i++) {
        seed = random(seed);
        const h = seed / 4294967296 < 0.5;
        heads += Number(h);
        risky += coinReward(h, true);
        adaptive += coinReward(h, h);
    }
    policy = `동일한100개 동전(앞${heads}/뒤${100 - heads}) · 항상 안전100점 · 항상 위험${risky}점 · 먼저 보고 앞=위험/뒤=안전 ${adaptive}점. 분포가 같아도 관측 후 선택 정책의 보상은 다릅니다.`;
    render();
});
function resetDraws() {
    sims = {
        independent: initial(),
        ceiling: initial(),
        bag: initial(),
        cumulative: initial(),
    };
    render();
}
for (const id of ['p', 'ceiling', 'calibrate', 'constant']) {
    el(id).addEventListener('input', resetDraws);
    el(id).addEventListener('change', resetDraws);
}
for (const id of ['hist-rule', 'reveal']) {
    el(id).addEventListener('input', render);
    el(id).addEventListener('change', render);
}
el('reset').addEventListener('click', () => {
    resetInputs();
    coinSeed = 777;
    coinScore = 0;
    coinCount = 0;
    coinLog = '안전 또는 위험 행동을 고르면 다음 동전을 소비합니다.';
    policy = '공개 전 안전/위험의 이론 기대값은 모두 +1입니다. 공개 후 조건부 정책은 +5.5입니다.';
    resetDraws();
});
render();
