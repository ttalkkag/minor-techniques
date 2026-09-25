import { clearance, defaults, type ClearanceInput } from './model';
const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const root = byId('clearance-lab');
const panel = byId('sc-settings');
const menu = byId<HTMLButtonElement>('sc-menu');
const dialog = byId<HTMLDialogElement>('sc-dialog');
const canvas = byId<HTMLCanvasElement>('sc-canvas');
const ctx = canvas.getContext('2d')!;
let state: ClearanceInput = { ...defaults };
let mode: 'ray' | 'volume' = 'ray';
let attempted = false;
let didMove = false;
const menuMedia = matchMedia('(max-width: 700px)');
const menuBackground = Array.from(document.querySelectorAll<HTMLElement>('.scene-area, nav > a, #sc-help'));
function menuControls() {
    return Array.from(panel.querySelectorAll<HTMLElement>('button, input, select, a[href]'))
        .filter((control) => control.getClientRects().length && !control.hasAttribute('disabled'));
}
function syncMenu() {
    const modal = !panel.hidden && menuMedia.matches;
    for (const element of menuBackground) element.inert = modal;
    panel.setAttribute('role', modal ? 'dialog' : 'complementary');
    if (modal) panel.setAttribute('aria-modal', 'true');
    else panel.removeAttribute('aria-modal');
}
function trapMenu(event: KeyboardEvent) {
    if (dialog.open || panel.hidden || !menuMedia.matches || event.key !== 'Tab') return;
    const controls = menuControls(), first = controls[0], last = controls.at(-1);
    if (!first || !last) return;
    if (!panel.contains(document.activeElement) || (event.shiftKey ? document.activeElement === first : document.activeElement === last)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
    }
}
menuMedia.addEventListener('change', () => {
    syncMenu();
    if (!panel.hidden && menuMedia.matches && !dialog.open) menuControls()[0]?.focus();
});
function setMenu(open: boolean, focus = true) {
    panel.hidden = !open;
    root.classList.toggle('open', open);
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? '설정 메뉴 닫기' : '설정 메뉴 열기');
    syncMenu();
    if (focus) (open ? menuControls()[0] : menu)?.focus();
    requestAnimationFrame(draw);
}
menu.addEventListener('click', () => setMenu(Boolean(panel.hidden)));
byId('sc-close').addEventListener('click', () => setMenu(false));
byId('sc-help').addEventListener('click', () => dialog.showModal());
byId('sc-dialog-close').addEventListener('click', () => dialog.close());
const keydown = (e: KeyboardEvent) => {
    if (dialog.open) return;
    if (e.key === 'Escape' && !panel.hidden) {
        e.preventDefault();
        setMenu(false);
    }
    trapMenu(e);
};
document.addEventListener('keydown', keydown);
const numeric = ['width', 'ceiling', 'radius', 'height', 'slope', 'range'] as const;
for (const key of numeric)
    byId<HTMLInputElement>(`sc-${key}`).addEventListener('input', (e) => {
        state[key] = Number((e.target as HTMLInputElement).value);
        attempted = false;
        didMove = false;
        update();
    });
byId<HTMLSelectElement>('sc-travel').addEventListener('change', (e) => {
    state.travel = (e.target as HTMLSelectElement).value as ClearanceInput['travel'];
    attempted = false;
    didMove = false;
    update();
});
byId<HTMLInputElement>('sc-obstacle').addEventListener('change', (e) => {
    state.obstacle = (e.target as HTMLInputElement).checked;
    attempted = false;
    didMove = false;
    update();
});
function reset() {
    state = { ...defaults };
    mode = 'ray';
    attempted = false;
    didMove = false;
    update();
}
byId('sc-reset').addEventListener('click', reset);
document.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach((button) =>
    button.addEventListener('click', () => {
        state = {
            ...defaults,
            ...(button.dataset.preset === 'low'
                ? { width: 1.6, ceiling: 1.4 }
                : button.dataset.preset === 'clear'
                  ? { width: 1.6 }
                  : {}),
        };
        attempted = false;
        didMove = false;
        update();
    }),
);
for (const key of ['ray', 'volume'] as const)
    byId(`sc-${key}`).addEventListener('click', () => {
        mode = key;
        attempted = false;
        didMove = false;
        update();
    });
byId('sc-attempt').addEventListener('click', () => {
    const result = clearance(state);
    attempted = true;
    didMove = mode === 'ray' ? result.surface : result.allowed;
    update();
});
function update() {
    const r = clearance(state);
    for (const key of numeric) {
        byId<HTMLInputElement>(`sc-${key}`).value = String(state[key]);
        byId(`sc-${key}-value`).textContent =
            `${state[key].toFixed(key === 'slope' ? 0 : 2)}${key === 'slope' ? '°' : ' m'}`;
    }
    byId<HTMLSelectElement>('sc-travel').value = state.travel;
    byId<HTMLInputElement>('sc-obstacle').checked = state.obstacle;
    for (const key of ['ray', 'volume']) byId(`sc-${key}`).setAttribute('aria-pressed', String(mode === key));
    for (const [id, ok, yes, no] of [
        ['surface', r.surface, '발견', '범위 밖'],
        ['slope-status', r.slope, '통과', '너무 가파름'],
        ['space', r.space, '배치 가능', '몸이 겹침'],
        ['path', r.path, '천장 통과 허용', '천장에 차단'],
    ] as const) {
        byId(`sc-${id}`).textContent = ok ? yes : no;
        byId(`sc-${id}`).dataset.ok = String(ok);
    }
    const granted = mode === 'ray' ? r.surface : r.allowed;
    byId('sc-summary').textContent = attempted
        ? didMove
            ? r.allowed
                ? '이동 완료 · 모든 조건을 통과했습니다.'
                : `이동 허가 오류 · 표면만 확인해서 ${[!r.slope && '경사 제한', !r.space && '몸의 겹침', !r.path && '경로 차단'].filter(Boolean).join(' · ')}을 놓쳤습니다.`
            : '이동 차단 · 출발 위치를 유지합니다.'
        : `${mode === 'ray' ? '탐색선만' : '전체 단계'} 검사: ${granted ? '이동 허가' : '이동 불가'}${mode === 'ray' && granted && !r.allowed ? ' · 실제 배치 조건은 실패합니다.' : ' · 이동 시도로 결과를 확인하세요.'}`;
    byId('sc-gaps').textContent =
        `한쪽 벽 여유 ${r.sideGap.toFixed(2)} m · 머리 위 ${r.headGap.toFixed(2)} m · 음수는 겹침 · 구 중심 높이 ${r.centers.map((x) => x.toFixed(2)).join(' / ')} m`;
    draw();
}
function draw() {
    const box = canvas.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const dpr = Math.min(devicePixelRatio, 2);
    canvas.width = Math.round(box.width * dpr);
    canvas.height = Math.round(box.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = box.width,
        h = box.height,
        scale = Math.min(w / 5.7, (h - 44) / 6.8);
    const x = (v: number) => w / 2 + v * scale,
        y = (v: number) => h - 32 - v * scale;
    const r = clearance(state),
        slope = Math.tan((state.slope * Math.PI) / 180);
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#dce5e6';
    for (let i = 0; i <= 6; i++) {
        ctx.beginPath();
        ctx.moveTo(x(-2.5), y(i));
        ctx.lineTo(x(2.5), y(i));
        ctx.stroke();
    }
    function polygon(points: number[][], color: string) {
        ctx.fillStyle = color;
        ctx.beginPath();
        points.forEach((p, i) => (i ? ctx.lineTo(x(p[0]!), y(p[1]!)) : ctx.moveTo(x(p[0]!), y(p[1]!))));
        ctx.closePath();
        ctx.fill();
    }
    polygon(
        [
            [-2.3, 2.6 - 2.3 * slope],
            [2.3, 2.6 + 2.3 * slope],
            [2.3, 3 + 2.3 * slope],
            [-2.3, 3 - 2.3 * slope],
        ],
        '#94a8ae',
    );
    const half = state.width / 2,
        roof = 3 + state.ceiling;
    polygon(
        [
            [-half - 0.18, 3 - half * slope],
            [-half, 3 - half * slope],
            [-half, roof],
            [-half - 0.18, roof],
        ],
        '#859ba3',
    );
    polygon(
        [
            [half, 3 + half * slope],
            [half + 0.18, 3 + half * slope],
            [half + 0.18, roof],
            [half, roof],
        ],
        '#859ba3',
    );
    polygon(
        [
            [-half - 0.18, roof],
            [half + 0.18, roof],
            [half + 0.18, roof + 0.13],
            [-half - 0.18, roof + 0.13],
        ],
        '#859ba3',
    );
    if (state.obstacle)
        polygon(
            [
                [-0.32, 3.7],
                [0.32, 3.7],
                [0.32, 4.1],
                [-0.32, 4.1],
            ],
            '#db8554',
        );
    ctx.setLineDash([4, 5]);
    ctx.strokeStyle = '#157f7a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x(0), y(0));
    ctx.lineTo(x(0), y(Math.min(state.range, 2.6)));
    ctx.stroke();
    ctx.setLineDash([]);
    if (r.surface) {
        ctx.fillStyle = '#157f7a';
        ctx.beginPath();
        ctx.arc(x(0), y(2.6), 5, 0, 2 * Math.PI);
        ctx.fill();
    }
    function capsule(foot: number, color: string, fill: string, ghost = false) {
        const radius = state.radius * scale,
            top = y(foot + state.height),
            bottom = y(foot),
            left = x(-state.radius);
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = color;
        ctx.fillStyle = fill;
        ctx.setLineDash(ghost ? [5, 4] : []);
        ctx.beginPath();
        ctx.roundRect(left, top, radius * 2, bottom - top, radius);
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);
        if (foot > 2) {
            ctx.fillStyle = color;
            for (const c of r.centers) {
                ctx.beginPath();
                ctx.arc(x(0), y(c), 2.5, 0, 2 * Math.PI);
                ctx.fill();
            }
        }
    }
    capsule(r.foot, r.space ? '#147f79' : '#d2763c', r.space ? '#198c7c20' : '#ec985c25', !didMove);
    if (!didMove) capsule(0, '#147f79', '#198c7c30');
    ctx.font = '12px -apple-system,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#637980';

    ctx.fillText(didMove ? '이동 후 위치' : '후보 캡슐', x(half + 0.25), y(Math.min(roof - 0.2, 4.6)));
    ctx.fillText('출발', x(state.radius + 0.18), y(0.7));
    ctx.fillStyle = '#137d77';
    ctx.fillText(`탐색선 ${state.range.toFixed(1)} m`, x(-2.3), y(1.35));
    ctx.textAlign = 'center';
    ctx.fillStyle = '#546e75';
    ctx.fillText(`폭 ${state.width.toFixed(2)} m`, x(0), y(roof + 0.35));
    ctx.strokeStyle = '#637e86';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x(-half), y(roof + 0.2));
    ctx.lineTo(x(half), y(roof + 0.2));
    ctx.stroke();
    ctx.fillStyle = '#546e75';
    ctx.textAlign = 'left';
    ctx.fillText(`${state.slope}°`, x(1.45), y(3 + 1.45 * slope + 0.15));
}
const observer = new ResizeObserver(draw);
observer.observe(canvas);
setMenu(!menuMedia.matches, false);
update();
window.addEventListener('pagehide', (event) => {
    observer.disconnect();
    if (!event.persisted) {
        document.removeEventListener('keydown', keydown);
    }
});
window.addEventListener('pageshow', () => {
    observer.observe(canvas);
    syncMenu();
    draw();
});
