import { defaults, simulate, type PoolOptions } from './model';
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>('scene'),
    ctx = canvas.getContext('2d')!,
    panel = $('settings'),
    menu = $('menu'),
    dialog = $<HTMLDialogElement>('explanation');
let options: PoolOptions = { ...defaults },
    time = 0,
    playing = false,
    frame = 0,
    last = 0;
const menuMedia = matchMedia('(max-width: 700px)');
function overlayMenu() {
    return menuMedia.matches;
}
function setMenu(open: boolean, moveFocus = true) {
    panel.hidden = !open;
    $('lab').classList.toggle('open', open);
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? '설정 메뉴 닫기' : '설정 메뉴 열기');
    const modal = open && overlayMenu();
    panel.setAttribute('role', modal ? 'dialog' : 'complementary');
    if (modal) panel.setAttribute('aria-modal', 'true');
    else panel.removeAttribute('aria-modal');
    for (const child of Array.from(panel.parentElement!.children)) {
        if (child instanceof HTMLElement && child !== panel && child.tagName !== 'NAV')
            child.inert = modal;
    }
    for (const child of Array.from(menu.parentElement!.children))
        if (child instanceof HTMLElement && child !== menu) child.inert = modal;
    if (moveFocus) (open ? $('close-menu') : menu).focus();
    requestAnimationFrame(draw);
}
menu.addEventListener('click', () => setMenu(Boolean(panel.hidden)));
$('close-menu').addEventListener('click', () => setMenu(false));
$('help').addEventListener('click', () => dialog.showModal());
$('close-dialog').addEventListener('click', () => dialog.close());
document.addEventListener('keydown', (event) => {
    if (dialog.open || panel.hidden) return;
    if (event.key === 'Escape') {
        event.preventDefault();
        setMenu(false);
    } else if (event.key === 'Tab' && overlayMenu()) {
        const controls = Array.from(panel.querySelectorAll<HTMLElement>(
            'button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href]',
        )).filter((control) => control.getClientRects().length > 0);
        const first = controls[0]!, last = controls[controls.length - 1]!;
        if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
            event.preventDefault();
            first.focus();
        }
    }
});
menuMedia.addEventListener('change', () => setMenu(!panel.hidden, !panel.hidden && overlayMenu()));
const numeric = ['rate', 'life', 'prewarm', 'capacity'] as const;
for (const key of numeric)
    $(key).addEventListener('input', () => {
        options[key] = Number($<HTMLInputElement>(key).value);
        stop();
        time = 0;
        update();
    });
$('mode').addEventListener('change', () => {
    options.mode = $<HTMLSelectElement>('mode').value as PoolOptions['mode'];
    stop();
    time = 0;
    update();
});
$('overflow').addEventListener('change', () => {
    options.overflow = $<HTMLSelectElement>('overflow').value as PoolOptions['overflow'];
    stop();
    time = 0;
    update();
});
for (const key of ['early', 'guard'] as const)
    $(key).addEventListener('change', () => {
        options[key] = $<HTMLInputElement>(key).checked;
        update();
    });
function stop() {
    playing = false;
    cancelAnimationFrame(frame);
    $('play').textContent = '재생';
    $('play').setAttribute('aria-pressed', 'false');
}
function reset() {
    stop();
    options = { ...defaults };
    time = 0;
    update();
}
$('reset').addEventListener('click', reset);
$('burst-preset').addEventListener('click', () => {
    reset();
    options.burst = true;
    update();
});
$('stale-preset').addEventListener('click', () => {
    reset();
    options.early = true;
    options.guard = false;
    time = 2;
    update();
});
$('time').addEventListener('input', () => {
    stop();
    time = Number($<HTMLInputElement>('time').value);
    update();
});
$('step').addEventListener('click', () => {
    stop();
    time = Math.min(7, time + 0.05);
    update();
});
function animate(stamp: number) {
    if (!playing) return;
    time = Math.min(7, time + Math.min((stamp - last) / 1000, 0.05));
    last = stamp;
    update(false);
    if (time >= 7) {
        stop();
        update();
        return;
    }
    frame = requestAnimationFrame(animate);
}
$('play').addEventListener('click', () => {
    if (playing) {
        stop();
        update();
        return;
    }
    if (time >= 7) time = 0;
    playing = true;
    last = performance.now();
    $('play').textContent = '일시 정지';
    $('play').setAttribute('aria-pressed', 'true');
    frame = requestAnimationFrame(animate);
});
function update(announce = true) {
    const m = simulate(options, time);
    for (const key of numeric) {
        $<HTMLInputElement>(key).value = String(options[key]);
        $(`${key}-value`).textContent =
            String(options[key]) + (key === 'life' ? '초' : key === 'rate' ? '회/초' : '개');
    }
    for (const key of ['early', 'guard'] as const) $<HTMLInputElement>(key).checked = options[key];
    $<HTMLSelectElement>('mode').value = options.mode;
    $<HTMLSelectElement>('overflow').value = options.overflow;
    $<HTMLInputElement>('time').value = String(time);
    $('time-value').textContent = `${time.toFixed(2)} s`;
    $('metric-0').textContent = String(m.created);
    $('metric-1').textContent = String(m.reuses);
    $('detail-1').textContent = `최초 사용 ${m.firstUse} · 총 요청 ${m.shots}`;
    $('metric-2').textContent = `${m.active.length} / ${m.idle.length}`;
    $('metric-3').textContent = `${m.destroyed} / ${m.dropped}`;
    $('summary').setAttribute('aria-live', announce ? 'polite' : 'off');
    $('summary').textContent =
        `오래된 타이머의 새 수명 종료 ${m.contaminated}회 · 무시한 종료 ${m.ignored}회 · 최대 동시 사용 ${m.maxActive}개${options.burst ? ' · 15발 동시 발사 예시' : ''}`;
    $('log').replaceChildren(
        ...m.log.map((text) => {
            const p = document.createElement('p');
            p.textContent = text;
            return p;
        }),
    );
    draw();
}
function draw() {
    const r = canvas.getBoundingClientRect();
    if (!r.width) return;
    const d = Math.min(devicePixelRatio, 2);
    canvas.width = r.width * d;
    canvas.height = r.height * d;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    const w = r.width,
        h = r.height,
        m = simulate(options, time);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#dfeae6';
    ctx.beginPath();
    ctx.roundRect(12, 30, w - 24, h * 0.47, 16);
    ctx.fill();
    ctx.strokeStyle = '#b4ccc2';
    ctx.lineWidth = 1;
    for (let row = 0; row < 5; row++) {
        ctx.beginPath();
        ctx.moveTo(30, 75 + row * 31);
        ctx.lineTo(w - 28, 75 + row * 31);
        ctx.stroke();
    }
    ctx.fillStyle = '#557674';
    ctx.beginPath();
    ctx.roundRect(20, 75, 22, 118, 5);
    ctx.fill();
    ctx.fillStyle = '#d39565';
    ctx.fillRect(w - 32, 70, 9, 130);
    ctx.font = '11px -apple-system,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#59777c';
    ctx.fillText('사용 중 · #객체 / 대여 세대', 20, 20);
    for (const v of m.active.slice(0, 80)) {
        const progress = Math.max(0, Math.min(1, (time - v.born) / options.life)),
            x = 48 + progress * (w - 92),
            y = 69 + (v.id % 5) * 31;
        ctx.fillStyle = v.generation > 1 ? '#168478' : '#db8b51';
        ctx.beginPath();
        ctx.roundRect(x - 10, y - 5, 20, 10, 5);
        ctx.fill();
        if (m.active.length < 28) {
            ctx.font = '9px -apple-system,sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`#${v.id}/${v.generation}`, x, y + 18);
        }
    }
    const rackY = h * 0.58,
        cols = w < 500 ? 6 : 12,
        size = Math.min((w - 30) / cols, 58);
    ctx.textAlign = 'left';
    ctx.font = '12px -apple-system,sans-serif';
    ctx.fillStyle = '#527078';
    ctx.fillText(`대기 보관함 ${m.idle.length} / 한도 ${options.capacity}`, 20, rackY - 15);
    for (let i = 0; i < Math.max(Math.min(options.capacity, 24), m.idle.length); i++) {
        const x = 15 + (i % cols) * size,
            y = rackY + Math.floor(i / cols) * 42;
        ctx.strokeStyle = '#c5d5d5';
        ctx.fillStyle = '#f6faf9';
        ctx.beginPath();
        ctx.roundRect(x + 2, y, size - 5, 34, 7);
        ctx.fill();
        ctx.stroke();
        const v = m.idle[i];
        if (v) {
            ctx.fillStyle = v.used ? '#168478' : '#dc9a66';
            ctx.font = '11px -apple-system,sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`#${v.id}`, x + size / 2, y + 21);
        }
    }
    ctx.fillStyle = '#718a8d';
    ctx.font = '11px -apple-system,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('주황: 최초 사용 · 청록: 재대여', w / 2, h - 13);
}
const observer = new ResizeObserver(draw);
observer.observe(canvas);
setMenu(!menuMedia.matches, false);
update();
const visibility = () => {
    if (document.hidden) stop();
};
document.addEventListener('visibilitychange', visibility);
window.addEventListener('pagehide', stop);
window.addEventListener('pageshow', () => {
    setMenu(!panel.hidden, false);
    draw();
});
