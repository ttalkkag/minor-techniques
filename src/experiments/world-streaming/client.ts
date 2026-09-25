import { defaults, stream, firstMargin, type StreamOptions } from './model';
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>('scene'),
    ctx = canvas.getContext('2d')!,
    panel = $('settings'),
    menu = $('menu'),
    dialog = $<HTMLDialogElement>('explanation');
let options: StreamOptions = { ...defaults },
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
const numeric = ['speed', 'prediction', 'sight', 'queue', 'read', 'prepare', 'budget'] as const;
for (const key of numeric)
    $(key).addEventListener('input', () => {
        options[key] = Number($<HTMLInputElement>(key).value);
        stop();
        update();
    });
for (const key of ['retain', 'gate'] as const)
    $(key).addEventListener('change', () => {
        options[key] = $<HTMLInputElement>(key).checked;
        update();
    });
function stop() {
    playing = false;
    cancelAnimationFrame(frame);
    $('play').textContent = '이동 재생';
    $('play').setAttribute('aria-pressed', 'false');
}
function reset() {
    stop();
    options = { ...defaults };
    time = 0;
    update();
}
$('reset').addEventListener('click', reset);
$('fast-preset').addEventListener('click', () => {
    reset();
    options.speed = 12;
    time = 4;
    update();
});
$('memory-preset').addEventListener('click', () => {
    reset();
    options.budget = 64;
    time = 8;
    update();
});
$('turn-preset').addEventListener('click', () => {
    reset();
    options.budget = 128;
    options.turns = [6];
    time = 10;
    update();
});
$('turn').addEventListener('click', () => {
    options.turns = [...options.turns, time];
    update();
});
$('time').addEventListener('input', () => {
    stop();
    time = Number($<HTMLInputElement>('time').value);
    update();
});
function animate(stamp: number) {
    if (!playing) return;
    time = Math.min(25, time + Math.min((stamp - last) / 1000, 0.05));
    last = stamp;
    update(false);
    if (time >= 25) {
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
    if (time >= 25) time = 0;
    playing = true;
    last = performance.now();
    $('play').textContent = '일시 정지';
    $('play').setAttribute('aria-pressed', 'true');
    frame = requestAnimationFrame(animate);
});
function update(announce = true) {
    const s = stream(options, time);
    for (const key of numeric) {
        $<HTMLInputElement>(key).value = String(options[key]);
        $(`${key}-value`).textContent = String(options[key]);
    }
    for (const key of ['retain', 'gate'] as const) $<HTMLInputElement>(key).checked = options[key];
    $<HTMLInputElement>('time').value = String(time);
    $('time-value').textContent = `${time.toFixed(2)} s`;
    $('metric-0').textContent = `${s.x.toFixed(1)} m ${s.dir > 0 ? '→' : '←'}`;
    $('metric-1').textContent = `${s.memory} / ${options.budget}`;
    $('metric-2').textContent = `${firstMargin(options).toFixed(2)} s`;
    $('metric-3').textContent = `${s.waiting.toFixed(2)} s`;
    $('detail-1').textContent = `최대 ${s.peak}MB · 총 읽기 ${s.loads}회`;
    $('summary').setAttribute('aria-live', announce ? 'polite' : 'off');
    $('summary').textContent = `준비 완료 ${
        s.chunks
            .filter((c) => c.status === 'ready')
            .map((c) => String.fromCharCode(65 + c.id))
            .join('·') || '없음'
    } · 현재 필요한 미준비 청크 ${s.missing}개${s.memoryBlocked ? ' · 메모리가 부족해 다음 읽기를 시작하지 못합니다.' : s.waiting > 0 ? ' · 준비되지 않은 진입 구간에서 기다린 시간이 있습니다.' : ' · 현재 조건으로 데이터를 교체 중입니다.'}`;
    $('log').replaceChildren(
        ...s.log.map((text) => {
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
        s = stream(options, time),
        left = 16,
        tw = w - 32,
        cw = tw / 5;
    ctx.clearRect(0, 0, w, h);
    ctx.font = '11px -apple-system,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#53777b';
    ctx.fillText('청크별 상태 · 진행 방향으로 요청', left, 21);
    const colors = { absent: '#dce2e4', queued: '#efdfcb', loading: '#abd7d1', ready: '#d0e4d6' };
    for (const c of s.chunks) {
        const x = left + c.id * cw;
        ctx.fillStyle = colors[c.status];
        ctx.fillRect(x + 2, 35, cw - 4, 96);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#496d70';
        ctx.font = 'bold 14px -apple-system,sans-serif';
        ctx.fillText(String.fromCharCode(65 + c.id), x + cw / 2, 55);
        ctx.font = '10px -apple-system,sans-serif';
        ctx.fillText(
            { absent: '비움', queued: '요청', loading: '준비 중', ready: '완료' }[c.status],
            x + cw / 2,
            72,
        );
        if (c.status === 'ready') {
            ctx.fillStyle = '#609b7b';
            for (let n = 0; n < 2; n++) {
                const tx = x + cw * (0.3 + n * 0.4);
                ctx.beginPath();
                ctx.moveTo(tx, 84);
                ctx.lineTo(tx - 8, 107);
                ctx.lineTo(tx + 8, 107);
                ctx.closePath();
                ctx.fill();
                ctx.fillRect(tx - 2, 106, 4, 10);
            }
        } else {
            ctx.strokeStyle = '#a5b8b9';
            ctx.setLineDash([3, 3]);
            ctx.strokeRect(x + cw * 0.25, 88, cw * 0.5, 25);
            ctx.setLineDash([]);
        }
    }
    const px = left + (s.x / 150) * tw,
        pred = Math.max(0, Math.min(150, s.x + s.dir * options.prediction)),
        sight = Math.max(0, Math.min(150, s.x + s.dir * options.sight));
    ctx.strokeStyle = '#a9c3bf';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(left, 152);
    ctx.lineTo(w - left, 152);
    ctx.stroke();
    ctx.strokeStyle = '#218c81';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(px, 146);
    ctx.lineTo(left + (pred / 150) * tw, 146);
    ctx.stroke();
    ctx.strokeStyle = '#db8b4e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(px, 158);
    ctx.lineTo(left + (sight / 150) * tw, 158);
    ctx.stroke();
    ctx.fillStyle = '#157c76';
    ctx.beginPath();
    ctx.arc(px, 151, 7, 0, 2 * Math.PI);
    ctx.fill();
    ctx.font = '10px -apple-system,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#65868b';
    ctx.fillText('청록: 요청 범위 / 주황: 미리 보이는 범위', w / 2, 180);
    const barY = 212;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#56777b';
    ctx.fillText(`메모리 ${s.memory} / ${options.budget} MB`, left, 201);
    ctx.fillStyle = '#e0e7e7';
    ctx.fillRect(left, barY, tw, 16);
    let offset = 0;
    const block = (amount: number, color: string) => {
        ctx.fillStyle = color;
        ctx.fillRect(left + (offset / options.budget) * tw, barY, (amount / options.budget) * tw - 2, 16);
        offset += amount;
    };
    block(16, '#9fadb6');
    for (const c of s.chunks)
        if (c.status === 'ready' || c.status === 'loading')
            block(32, c.status === 'ready' ? '#319082' : '#83c0b5');
    if (s.chunks.some((c) => c.status === 'loading')) block(16, '#df9a58');
    const top = 267,
        row = 27,
        max = Math.max(12, time + 2, ...s.chunks.map((c) => c.ready ?? 0)),
        xx = (t: number) => left + 24 + (t / max) * (tw - 24);
    ctx.fillStyle = '#5a7c81';
    ctx.textAlign = 'left';
    ctx.fillText('요청 → 준비 → 완료 · 주황 선: 최초 필요', left, 251);
    for (const c of s.chunks) {
        const y = top + c.id * row;
        ctx.fillStyle = '#648387';
        ctx.fillText(String.fromCharCode(65 + c.id), left, y + 10);
        ctx.fillStyle = '#e5eded';
        ctx.fillRect(left + 24, y, tw - 24, 13);
        if (c.request !== null) {
            ctx.fillStyle = '#d9b687';
            ctx.fillRect(
                xx(c.request),
                y,
                Math.max(1, xx(Math.min(time, c.start ?? time)) - xx(c.request)),
                13,
            );
        }
        if (c.start !== null) {
            ctx.fillStyle = '#60b4a9';
            ctx.fillRect(xx(c.start), y, Math.max(1, xx(Math.min(time, c.ready ?? time)) - xx(c.start)), 13);
        }
        if (c.ready !== null && c.ready <= time) {
            ctx.fillStyle = '#19877b';
            ctx.fillRect(
                xx(c.ready),
                y,
                Math.max(1, xx(c.status === 'absent' ? (c.unload ?? time) : time) - xx(c.ready)),
                13,
            );
        }
        if (c.need !== null) {
            ctx.strokeStyle = '#d78546';
            ctx.beginPath();
            ctx.moveTo(xx(c.need), y - 3);
            ctx.lineTo(xx(c.need), y + 16);
            ctx.stroke();
        }
    }
    ctx.textAlign = 'right';
    ctx.fillStyle = '#769196';
    ctx.fillText(`일정 범위 0–${max.toFixed(0)}초`, w - left, top + row * 5 + 15);
    if (h > 470) {
        ctx.textAlign = 'center';
        ctx.fillText('읽기 작업 중에는 청크 32MB + 작업 공간 16MB를 예약합니다.', w / 2, h - 15);
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
