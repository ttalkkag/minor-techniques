import { evaluate, defaults, doorClosed } from './model';
import type { Options } from './model';
const el = (id: string) => document.getElementById(id)!;
const input = (id: string) => el(id) as HTMLInputElement;
const select = (id: string) => el(id) as HTMLSelectElement;
const canvas = el('scene') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const abort = new AbortController();
const on = (id: string, type: string, fn: EventListener) =>
    el(id).addEventListener(type, fn, { signal: abort.signal });
let w = 0,
    h = 0;
const text = (value: string, x: number, y: number, color = '#3c5b65', size = 13, maxWidth?: number) => {
    ctx.fillStyle = color;
    ctx.font = `600 ${size}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillText(value, x, y, maxWidth);
};
const rect = (x: number, y: number, width: number, height: number, color: string, radius = 10) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, Math.max(0, width), Math.max(0, height), radius);
    ctx.fill();
};
const line = (x1: number, y1: number, x2: number, y2: number, color: string, dashed = false, size = 2) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.setLineDash(dashed ? [5, 5] : []);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.setLineDash([]);
};
const dot = (x: number, y: number, radius: number, color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
};
function menu(open: boolean) {
    const panel = el('settings');
    panel.hidden = !open;
    el('backdrop').hidden = !open;
    el('menu').setAttribute('aria-expanded', String(open));
    for (const sibling of panel.parentElement!.children) {
        if (
            sibling instanceof HTMLElement &&
            !['settings', 'backdrop', 'explanation'].includes(sibling.id)
        )
            sibling.inert = open;
    }
    document.body.style.overflow = open ? 'hidden' : '';
    (open ? el('close') : el('menu')).focus();
}
function boot(draw: () => void) {
    on('menu', 'click', () => menu(Boolean(el('settings').hidden)));
    on('close', 'click', () => menu(false));
    on('backdrop', 'click', () => menu(false));
    on('help', 'click', () => (el('explanation') as HTMLDialogElement).showModal());
    on('explain-close', 'click', () => (el('explanation') as HTMLDialogElement).close());
    document.addEventListener(
        'keydown',
        (event) => {
            const panel = el('settings');
            if (panel.hidden || (el('explanation') as HTMLDialogElement).open) return;
            if (event.key === 'Escape') {
                event.preventDefault();
                menu(false);
            } else if (event.key === 'Tab') {
                const controls = Array.from(
                    panel.querySelectorAll<HTMLElement>(
                        'button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href]',
                    ),
                ).filter((control) => control.getClientRects().length > 0);
                const first = controls[0]!,
                    last = controls.at(-1)!;
                if (
                    !panel.contains(document.activeElement) ||
                    (event.shiftKey && document.activeElement === first)
                ) {
                    event.preventDefault();
                    (event.shiftKey ? last : first).focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
            }
        },
        { signal: abort.signal },
    );
    const resize = () => {
        const bounds = canvas.getBoundingClientRect();
        w = bounds.width;
        h = bounds.height;
        const dpr = Math.min(devicePixelRatio || 1, 2);
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        draw();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    window.addEventListener('pagehide', (event) => {
        observer.disconnect();
        if (!event.persisted) abort.abort();
    });
    window.addEventListener('pageshow', (event) => {
        if (event.persisted) {
            observer.observe(canvas);
            resize();
        }
    });
    resize();
}
let sequence = 0;
let lastAccepted = false;
let lastMessage = '';
function options(): Options {
    return {
        up: +input('up').value,
        down: +input('down').value,
        interpolation: +input('interpolation').value,
        window: +input('window').value,
        hz: +input('hz').value,
        speed: +input('speed').value,
        mode: select('mode').value as Options['mode'],
        clock: select('clock').value as Options['clock'],
        limit: select('limit').value as Options['limit'],
        door: select('door').value as Options['door'],
        claim: select('claim').value as Options['claim'],
        subtick: input('subtick').checked,
        teleport: input('teleport').checked,
    };
}
function draw() {
    const o = options(),
        result = evaluate(o);
    for (const key of ['up', 'down', 'interpolation', 'window', 'hz', 'speed'] as const)
        el(`${key}-value`).textContent = `${o[key]}${key === 'hz' ? 'Hz' : key === 'speed' ? 'm/s' : 'ms'}`;
    el('metric-0').textContent = result.reason ? '명령 거부' : result.outcome;
    el('metric-1').textContent = `${result.visibleTime.toFixed(0)} / ${result.q.toFixed(0)}ms`;
    el('metric-2').textContent = `${Math.abs(result.current - result.aim).toFixed(2)}m`;
    el('summary').textContent =
        lastMessage ||
        `미리 보기: ${result.outcome}${result.clamped ? ' · 이력 경계로 제한됨' : ''}. 표적과 문을 같은 시각으로 복원했는지 확인하세요.`;
    el('history-info').textContent =
        `이력 ${o.hz}Hz · 경계 포함 ${Math.ceil((o.window * o.hz) / 1000) + 1}개 표본 × 100개 × 64B = ${result.bytes.toLocaleString()}B. 질의 사이 틱 ${result.past.before.toFixed(2)} / ${result.past.after.toFixed(2)}ms · α ${result.past.alpha.toFixed(2)}${result.past.discontinuous ? ' · 순간이동 구간은 보간하지 않음' : ''}.`;
    ctx.clearRect(0, 0, w, h);
    const rows = [
        {
            title: '사수가 본 화면',
            time: result.visibleTime,
            x: result.aim,
            closed: doorClosed(result.visibleTime, o.door),
        },
        { title: '서버의 현재', time: 1000, x: result.current, closed: doorClosed(1000, o.door) },
        { title: '판정에 쓴 장면', time: result.q, x: result.queryX, closed: result.blocked },
    ];
    const rowHeight = (h - 98) / 3,
        px = (x: number) => 28 + ((x + 1) / 10) * (w - 56);
    rows.forEach((row, i) => {
        const y = 12 + i * rowHeight;
        rect(12, y, w - 24, rowHeight - 8, '#f7fafb');
        text(
            `${row.title} · ${row.time.toFixed(0)}ms`,
            24,
            y + 22,
            i === 2 ? '#157f74' : '#476872',
            w < 500 ? 11 : 13,
        );
        line(28, y + 44, w - 28, y + 44, '#d9e5e7', true, 1);
        const aim = px(result.aim),
            target = px(row.x);
        const bottom = y + rowHeight - 20,
            doorY = y + (rowHeight + 32) / 2;
        line(aim, bottom, aim, y + 43, '#d7894f', true, 2);
        dot(target, y + 44, 8, '#208f82');
        if (row.closed) line(30, doorY, w - 30, doorY, '#6c838d', false, 6);
        else {
            line(30, doorY, 46, doorY, '#b4c8ce', false, 3);
            line(w - 46, doorY, w - 30, doorY, '#b4c8ce', false, 3);
        }
        dot(aim, bottom, 4, '#d7894f');
        text(row.closed ? '문 닫힘' : '문 열림', w - 82, doorY - 8, '#647f89', 10);
        if (i === 2)
            text(
                result.reason ? '거부' : result.hit ? '명중' : '차단 / 빗나감',
                25,
                bottom,
                result.hit ? '#158777' : '#b67641',
                11,
            );
    });
    const ty = h - 46,
        tx = (t: number) => 24 + Math.max(0, Math.min(1, (t - 500) / 500)) * (w - 48);
    text('과거 이력', 24, h - 65, '#55737c', 11);
    line(24, ty, w - 24, ty, '#c1d2d7', false, 5);
    line(tx(1000 - o.window), ty, tx(1000), ty, '#78b9af', false, 7);
    for (let t = 1000 - o.window; t <= 1000; t += 1000 / o.hz)
        line(tx(t), ty - 6, tx(t), ty + 6, '#388f84', false, 1);
    dot(tx(result.visibleTime), ty, 5, '#d48649');
    dot(tx(result.q), ty, 3, '#133f48');
    text('500ms', 24, h - 20, '#7a929a', 10);
    text('현재 1000ms', w - 104, h - 20, '#7a929a', 10);
}
function reset() {
    for (const [key, value] of Object.entries(defaults)) {
        if (typeof value === 'boolean') input(key).checked = value;
        else input(key).value = String(value);
    }
    sequence = 0;
    lastAccepted = false;
    lastMessage = '';
    draw();
}
for (const [key, value] of Object.entries(defaults))
    on(key, typeof value === 'number' ? 'input' : 'change', () => {
        lastMessage = '';
        draw();
    });
on('fire', 'click', () => {
    const result = evaluate(options());
    lastAccepted = !result.reason;
    lastMessage = `명령 #${++sequence} · ${result.outcome} · 현재 상태는 이동시키지 않고 조회했습니다.`;
    draw();
});
on('duplicate', 'click', () => {
    lastMessage =
        sequence && lastAccepted
            ? `명령 #${sequence} · ${evaluate(options(), true).reason} 피해를 다시 적용하지 않았습니다.`
            : '먼저 정상 시각의 새 명령을 발사하세요.';
    draw();
});
on('reset', 'click', reset);
boot(draw);
