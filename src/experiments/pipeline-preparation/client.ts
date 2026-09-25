import { defaults, presentation, type PreparationOptions } from './model';
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>('scene'),
    ctx = canvas.getContext('2d')!,
    panel = $('settings'),
    menu = $('menu'),
    dialog = $<HTMLDialogElement>('explanation');
let options: PreparationOptions = { ...defaults },
    time = 55,
    selected = 0,
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
const numeric = ['request', 'queue', 'duration', 'workers', 'need'] as const;
for (const key of numeric)
    $(key).addEventListener('input', () => {
        options[key] = Number($<HTMLInputElement>(key).value);
        stop();
        update();
    });
$('coverage').addEventListener('change', () => {
    options.coverage = $<HTMLSelectElement>('coverage').value as PreparationOptions['coverage'];
    update();
});
$('policy').addEventListener('change', () => {
    options.policy = $<HTMLSelectElement>('policy').value as PreparationOptions['policy'];
    update();
});
$('selected').addEventListener('change', () => {
    selected = Number($<HTMLSelectElement>('selected').value);
    update();
});
$('failure').addEventListener('change', () => {
    options.failure = $<HTMLInputElement>('failure').checked;
    update();
});
function stop() {
    playing = false;
    cancelAnimationFrame(frame);
    $('play').textContent = '느리게 재생';
    $('play').setAttribute('aria-pressed', 'false');
}
function reset() {
    stop();
    options = { ...defaults };
    time = 55;
    selected = 0;
    update();
}
$('reset').addEventListener('click', reset);
$('late-preset').addEventListener('click', reset);
$('miss-preset').addEventListener('click', () => {
    reset();
    options.coverage = 'none';
    update();
});
$('ready-preset').addEventListener('click', () => {
    reset();
    options.queue = 0;
    options.workers = 3;
    update();
});
$('time').addEventListener('input', () => {
    stop();
    time = Number($<HTMLInputElement>('time').value);
    update();
});
function animate(stamp: number) {
    if (!playing) return;
    time = Math.min(1000, time + Math.min((stamp - last) / 1000, 0.05) * 50);
    last = stamp;
    update(false);
    if (time >= 1000) {
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
    if (time >= 1000) time = 0;
    playing = true;
    last = performance.now();
    $('play').textContent = '일시 정지';
    $('play').setAttribute('aria-pressed', 'true');
    frame = requestAnimationFrame(animate);
});
function update(announce = true) {
    const p = presentation(options, time, selected);
    for (const key of numeric) {
        $<HTMLInputElement>(key).value = String(options[key]);
        $(`${key}-value`).textContent = String(options[key]) + (key === 'workers' ? '개' : ' ms');
    }
    $<HTMLSelectElement>('coverage').value = options.coverage;
    $<HTMLSelectElement>('policy').value = options.policy;
    $<HTMLSelectElement>('selected').value = String(selected);
    $<HTMLInputElement>('failure').checked = options.failure;
    $<HTMLInputElement>('time').value = String(time);
    $('time-value').textContent = `${Math.round(time)} ms`;
    $('metric-0').textContent = `${p.job.request} → ${p.job.start}`;
    $('metric-1').textContent = `${p.job.ready ?? '실패'} / ${p.effectiveNeed}`;
    $('metric-2').textContent =
        p.delay === null ? '계산 제외' : `${options.policy === 'loading' ? 0 : p.delay} ms`;
    $('detail-2').textContent =
        p.delay === null
            ? '실패 작업 · 지연 계산 제외'
            : options.policy === 'loading'
              ? `시작 전 대기 ${p.initial}ms`
              : p.job.missed
                ? 'Missed · 사전 요청 누락'
                : p.delay
                  ? 'Too late · 완료가 늦음'
                  : 'Hit · 필요 전에 준비';
    $('metric-3').textContent = `${p.memory} MB`;
    $('summary').setAttribute('aria-live', announce ? 'polite' : 'off');
    $('summary').textContent =
        `조합 #${selected}: ${p.status} · ${p.appearance} · 게임 시각 ${Math.round(p.gameTime)}ms${options.policy === 'loading' ? ` · 시작 전 ${p.initial}ms 대기` : ''}`;
    $('log').replaceChildren(
        ...p.jobs
            .filter((j) => j.need !== null)
            .map((j) => {
                const e = document.createElement('p');
                e.textContent = `#${j.id} 요청 ${j.request} → 시작 ${j.start} → ${j.ready === null ? '실패' : `완료 ${j.ready}`} / 필요 ${j.effectiveNeed}ms`;
                return e;
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
        p = presentation(options, time, selected);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#dfebe7';
    ctx.beginPath();
    ctx.roundRect(12, 22, w - 24, 155, 16);
    ctx.fill();
    ctx.strokeStyle = '#b2cbc4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(26, 140);
    ctx.lineTo(w - 26, 140);
    ctx.stroke();
    ctx.fillStyle = '#188379';
    ctx.beginPath();
    ctx.arc(30 + ((p.gameTime % 220) / 220) * (w - 70), 138, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#527478';
    ctx.font = '12px -apple-system,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`관찰 조합 #${selected} · ${p.appearance}`, 24, 44);
    if (['완성 재질', '기본 재질', '실패 대체'].includes(p.appearance)) {
        ctx.fillStyle =
            p.appearance === '완성 재질' ? '#e29957' : p.appearance === '실패 대체' ? '#be7766' : '#a8b3b4';
        ctx.beginPath();
        ctx.moveTo(w * 0.55, 62);
        ctx.lineTo(w * 0.55 + 25, 94);
        ctx.lineTo(w * 0.55, 125);
        ctx.lineTo(w * 0.55 - 25, 94);
        ctx.closePath();
        ctx.fill();
        if (p.appearance === '완성 재질') {
            ctx.strokeStyle = '#e0a66766';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.arc(w * 0.55, 94, 39, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
    if (p.appearance === '프레임 대기') {
        ctx.fillStyle = '#d68950';
        ctx.fillRect(w * 0.55 - 9, 79, 7, 28);
        ctx.fillRect(w * 0.55 + 3, 79, 7, 28);
    }
    ctx.font = '10px -apple-system,sans-serif';
    ctx.fillStyle = '#67878a';
    ctx.fillText(`이동 점: 게임 시각 ${Math.round(p.gameTime)}ms`, 24, 163);
    const max = Math.max(220, time + 10, ...p.jobs.map((j) => Math.max(j.finish, j.effectiveNeed ?? 0) + 25)),
        left = 42,
        tw = w - 60,
        xx = (t: number) => left + (t / max) * tw,
        top = 223,
        row = 55;
    ctx.font = '10px -apple-system,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#55777b';
    ctx.fillText('회색 대기열 · 청록 준비 · 주황 최초 필요', 14, 202);
    for (let i = 0; i < 3; i++) {
        const id = [0, 5, 9][i]!,
            j = p.jobs.find((j) => j.id === id)!,
            y = top + i * row;
        ctx.fillStyle = id === selected ? '#e4eeee' : '#f2f6f5';
        ctx.fillRect(left, y - 14, tw, 39);
        ctx.textAlign = 'left';
        ctx.font = '11px -apple-system,sans-serif';
        ctx.fillStyle = '#58777b';
        ctx.fillText(`#${id}`, 9, y + 8);
        ctx.fillStyle = '#adbebf';
        ctx.fillRect(xx(j.request), y, Math.max(1, xx(j.start) - xx(j.request)), 10);
        ctx.fillStyle = j.ready === null ? '#c58a75' : '#228d82';
        ctx.fillRect(xx(j.start), y, Math.max(2, xx(j.finish) - xx(j.start)), 10);
        ctx.strokeStyle = '#dd8d48';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(xx(j.effectiveNeed!), y - 13);
        ctx.lineTo(xx(j.effectiveNeed!), y + 23);
        ctx.stroke();
        ctx.fillStyle = '#3b7e77';
        ctx.beginPath();
        ctx.arc(xx(j.finish), y + 5, 4, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.strokeStyle = '#55787e';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(xx(time), top - 20);
    ctx.lineTo(xx(time), top + row * 2 + 30);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#52777b';
    ctx.fillText('현재', xx(time), top + row * 2 + 43);
    ctx.textAlign = 'left';
    ctx.fillText('0ms', left, top + row * 2 + 59);
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(max)}ms`, w - 18, top + row * 2 + 59);
    if (h > 470) {
        ctx.textAlign = 'center';
        ctx.fillStyle = '#6a8588';
        ctx.fillText(
            `준비 대상 ${p.jobs.length}개 / 실제 사용 3개 · 동시 슬롯 ${options.workers}`,
            w / 2,
            h - 18,
        );
    }
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
