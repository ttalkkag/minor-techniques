import { simulate, defaults } from './model';
import type { Options, State } from './model';
const el = (id: string) => document.getElementById(id)!;
const input = (id: string) => el(id) as HTMLInputElement;
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
let wallTicks = 0;
function options(): Options {
    return {
        delay: +input('delay').value,
        inputDelay: +input('inputDelay').value,
        horizon: +input('horizon').value,
        dedupe: input('dedupe').checked,
        restoreRng: input('restoreRng').checked,
    };
}
function draw() {
    const o = options(),
        result = simulate(wallTicks, o);
    for (const key of ['delay', 'inputDelay', 'horizon'] as const)
        el(`${key}-value`).textContent = `${o[key]}틱`;
    el('metric-0').textContent = `${result.rollbacks.length}회 / ${result.replayed}틱`;
    el('metric-1').textContent =
        `S[${result.confirmed}] ${result.confirmedHash === result.referenceHash ? '일치' : '불일치'}`;
    el('metric-2').textContent = `${result.played} / ${result.requests}회`;
    const last = result.rollbacks.at(-1);
    el('summary').textContent =
        `벽시계 ${wallTicks}틱 · 화면 S[${result.state.tick}] · ${last ? `최근 복원 S[${last.from}] → S[${last.to}], ${last.count}틱 재실행` : '아직 복원 없음'}. 중복 요청 ${result.duplicateRequests}회 · 현재 계산에서 사라진 예측 효과 ${result.staleEffects}개.`;
    el('rollback-info').textContent =
        `확정 상태 해시 ${result.confirmedHash} / 기준 ${result.referenceHash} · 전체 규칙 실행 ${result.executions}틱 · 예측 한계 대기 ${result.waits}틱 · 스냅샷 ${result.snapshotCount}개, JSON 길이 기준 ${result.bytes}B.`;
    ctx.clearRect(0, 0, w, h);
    const panelH = (h - 134) / 2;
    function fighters(state: State, y: number, color: string, title: string) {
        rect(12, y, w - 24, panelH, '#f8fbfc', 13);
        text(`${title} · S[${state.tick}]`, 24, y + 25, color, w < 500 ? 11 : 13);
        const base = y + panelH - 23;
        line(28, base, w - 28, base, '#c2d6d9', false, 4);
        state.fighters.forEach((fighter, i) => {
            const x = 30 + (fighter.x / 100) * (w - 60),
                facing = i === 0 ? 1 : -1;
            const fill = i === 0 ? '#668c98' : color;
            dot(x, base - 45, 8, fill);
            rect(x - 9, base - 35, 18, 26, fill, 4);
            line(x - 4, base - 10, x - 8, base, fill, false, 4);
            line(x + 4, base - 10, x + 8, base, fill, false, 4);
            line(
                x,
                base - 28,
                x + facing * (fighter.attack ? 35 : 15),
                base - (fighter.attack ? 27 : 15),
                fill,
                false,
                4,
            );
            if (fighter.attack) {
                ctx.strokeStyle = fill;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(x + facing * 28, base - 26, 13, 0, Math.PI * 2);
                ctx.stroke();
            }
            const labelX = w < 500 ? (i === 0 ? 28 : w - 88) : Math.max(27, Math.min(x - 30, w - 90));
            text(`${i ? '상대' : '나'} HP ${fighter.hp}`, labelX, base - 66, '#4d707c', 10);
            rect(labelX, base - 60, 60, 4, '#dce8eb', 2);
            rect(labelX, base - 60, fighter.hp * 0.6, 4, fill, 2);
        });
    }
    fighters(result.reference, 12, '#1c9282', '입력을 모두 아는 기준');
    fighters(result.state, 20 + panelH, '#d0864c', '예측 후 복원한 화면');
    const timelineY = 2 * panelH + 48;
    text('벽시계: 청록 진행 / 주황 재실행 / 회색 대기', 24, timelineY, '#5b7882', w < 500 ? 10 : 12);
    const entries = result.timeline.slice(-30),
        cols = Math.min(30, Math.max(10, Math.floor((w - 42) / 22))),
        step = (w - 42) / cols;
    for (let i = 0; i < Math.max(1, entries.length); i++) {
        const entry = entries[i],
            x = 21 + (i % cols) * step,
            y = timelineY + 12 + Math.floor(i / cols) * 23;
        rect(
            x,
            y,
            step - 3,
            17,
            !entry ? '#d6e3e6' : entry.waited ? '#9db2ba' : entry.rollback ? '#df9a5f' : '#7ab7ac',
            3,
        );
        if (entry) text(String(entry.wall), x + 3, y + 12, '#fff', 9);
    }
}
function reset() {
    for (const [key, value] of Object.entries(defaults)) {
        if (typeof value === 'boolean') input(key).checked = value;
        else input(key).value = String(value);
    }
    wallTicks = 0;
    draw();
}
for (const key of Object.keys(defaults)) on(key, 'input', draw);
on('step', 'click', () => {
    wallTicks = Math.min(60, wallTicks + 1);
    draw();
});
on('run', 'click', () => {
    wallTicks = 30;
    draw();
});
on('reset', 'click', reset);
boot(draw);
