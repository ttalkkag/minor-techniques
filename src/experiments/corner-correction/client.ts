const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>('scene');
const ctx = canvas.getContext('2d')!;
const menu = $<HTMLButtonElement>('menu'),
    settings = $<HTMLElement>('settings');
function setMenuOpen(open: boolean) {
    settings.hidden = !open;
    $('menu-backdrop').hidden = !open;
    menu.setAttribute('aria-expanded', String(open));
    for (const region of document.querySelectorAll<HTMLElement>(
        'main > :not(nav):not(#settings):not(#menu-backdrop), nav > :not(#menu)',
    )) region.inert = open;
    if (open) $('close-menu').focus();
    else menu.focus();
}
function closeMenu() {
    setMenuOpen(false);
}
menu.onclick = () => setMenuOpen(Boolean(settings.hidden));
$<HTMLButtonElement>('close-menu').onclick = closeMenu;
$('menu-backdrop').onclick = closeMenu;
const dialog = $<HTMLDialogElement>('explanation');
$<HTMLButtonElement>('explain').onclick = () => dialog.showModal();
$<HTMLButtonElement>('close-explanation').onclick = () => dialog.close();
document.addEventListener('keydown', (e) => {
    if (dialog.open || settings.hidden) return;
    if (e.key === 'Escape') {
        e.preventDefault();
        closeMenu();
    }
    if (e.key === 'Tab') {
        const controls = [...settings.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href]',
        )];
        const first = controls[0]!, last = controls[controls.length - 1]!;
        if (!settings.contains(document.activeElement) || (e.shiftKey && document.activeElement === first)) {
            e.preventDefault();
            (e.shiftKey ? last : first).focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }
});
let width = 900,
    height = 450;
function resize() {
    const r = canvas.getBoundingClientRect();
    width = r.width;
    height = r.height;
    const dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
}
const observer = new ResizeObserver(resize);
observer.observe(canvas);

function text(t: string, x: number, y: number, color = '#53626d', size = 14) {
    ctx.fillStyle = color;
    ctx.font = `${size}px -apple-system, sans-serif`;
    ctx.fillText(t, x, y);
}
import { correct, sweptBlocked, liftBonus, type Rect } from './model';
const inputs = ['overlap', 'limit', 'delay', 'grace'];
const number = (id: string) => Number($<HTMLInputElement>(id).value);
const mode = () => $<HTMLSelectElement>('mode').value;
type Actor = {
    body: Rect;
    vx: number;
    vy: number;
    status: string;
    attempts: { offset: number; ok: boolean; x: number; y: number }[];
};
let actors: Actor[] = [],
    tick = 0,
    playing = false,
    raf = 0,
    last = 0,
    acc = 0;
function obstacles() {
    const out: Rect[] =
        mode() === 'rise'
            ? [{ x: 230, y: 40, w: 135, h: 75 }]
            : mode() === 'dash'
              ? [{ x: 230, y: 110, w: 135, h: 160 }]
              : mode() === 'wall'
                ? [{ x: 270, y: 20, w: 50, h: 250 }]
                : [];
    if ($<HTMLInputElement>('blocker').checked && ['rise', 'dash'].includes(mode()))
        out.push(mode() === 'rise' ? { x: 199, y: 116, w: 1, h: 65 } : { x: 185, y: 71, w: 48, h: 1 });
    return out;
}
function reset() {
    playing = false;
    $('play').textContent = '실험 재생';
    tick = 0;
    acc = 0;
    const overlap = number('overlap');
    actors = [0, 1].map(() => ({
        body: {
            x:
                mode() === 'rise'
                    ? 198 + overlap
                    : mode() === 'wall'
                      ? 238 - overlap
                      : mode() === 'lift'
                        ? 175
                        : 180,
            y: mode() === 'rise' ? 135 : mode() === 'dash' ? 70 + overlap : mode() === 'lift' ? 210 : 165,
            w: 32,
            h: 40,
        },
        vx: 0,
        vy: 0,
        status: '출발 대기',
        attempts: [],
    }));
    $('log').textContent = '';
    draw();
}
function step() {
    const dt = 0.05,
        wall = obstacles();
    actors.forEach((a, i) => {
        if (tick === 0) {
            a.vy = mode() === 'rise' ? -245 : 0;
            a.vx = mode() === 'dash' ? 300 : 0;
            if (mode() === 'wall') {
                const gap = Math.max(0, 270 - a.body.x - a.body.w);
                if (gap <= (i ? number('limit') : 0)) {
                    a.vx = -140;
                    a.vy = -260;
                    a.status = `거리 ${gap.toFixed(0)}px · 벽 점프 승인`;
                } else a.status = `거리 ${gap.toFixed(0)}px · 범위 밖`;
            }
            if (mode() === 'lift') {
                const bonus = i
                    ? liftBonus(
                          number('delay'),
                          0,
                          number('grace'),
                          3,
                          $<HTMLInputElement>('same-platform').checked,
                      )
                    : 0;
                a.vy = -180 - bonus * 35;
                a.status = `저장 보너스 ${bonus} m/s`;
            }
        }
        if (mode() !== 'dash' || tick > 11) a.vy += 420 * dt;
        const dx = a.vx * dt,
            dy = a.vy * dt;
        if (mode() === 'dash' && tick <= 11) {
            const result = correct(a.body, dx, 0, i ? number('limit') : 0, wall, -1);
            if (result.attempts.length)
                a.attempts = result.attempts.map((attempt) => ({
                    ...attempt,
                    x: a.body.x,
                    y: a.body.y + attempt.offset,
                }));
            if (!result.success) {
                a.vx = 0;
                a.status = '측면 충돌 · 대시 중단';
            } else {
                a.body.x = result.x;
                a.body.y = result.y;
                if (result.offset) a.status = `위로 ${-result.offset}px 보정`;
            }
        } else {
            if (!sweptBlocked(a.body, dx, 0, wall)) a.body.x += dx;
            const result = correct(
                a.body,
                0,
                dy,
                i && a.vy < 0 && mode() === 'rise' ? number('limit') : 0,
                wall,
                -1,
            );
            if (result.attempts.length)
                a.attempts = result.attempts.map((attempt) => ({
                    ...attempt,
                    x: a.body.x + attempt.offset,
                    y: a.body.y,
                }));
            if (!result.success) {
                if (a.vy < 0) a.status = '천장 충돌 · 상승 중단';
                a.vy = 0;
            } else {
                a.body.x = result.x;
                a.body.y = result.y;
                if (result.offset) a.status = `옆으로 ${result.offset}px 보정`;
            }
        }
        const floor = mode() === 'lift' ? 250 : 270;
        if (a.body.y + a.body.h >= floor) {
            a.body.y = floor - a.body.h;
            a.vy = 0;
            a.vx = 0;
            if (a.status === '출발 대기') a.status = '착지';
        }
        a.body.x = Math.max(5, Math.min(355, a.body.x));
    });
    tick++;
    if (tick >= 45) {
        playing = false;
        $('play').textContent = '다시 재생';
    }
    $('log').textContent =
        `${tick} 틱 · ${(tick * 0.05).toFixed(2)}s · B 후보 검사 ${actors[1].attempts.length}회${mode() === 'lift' ? ` · 속도 기록 나이 ${number('delay')}ms / 유예 ${number('grace')}ms` : ''}`;
    draw();
}
function draw() {
    ctx.clearRect(0, 0, width, height);
    if (!actors.length) return;
    const stacked = width < 620,
        pw = stacked ? width : width / 2,
        ph = stacked ? height / 2 : height;
    actors.forEach((a, i) => {
        ctx.save();
        ctx.translate(stacked ? 0 : i * pw, stacked ? i * ph : 0);
        text(i ? 'B · 조건부 보정' : 'A · 보정 없음', 20, 28, i ? '#157970' : '#b45f2c', 14);
        const scale = Math.min((pw - 28) / 390, (ph - 46) / 300);
        ctx.translate((pw - 390 * scale) / 2, 42);
        ctx.scale(scale, scale);
        ctx.fillStyle = '#c8d5d9';
        ctx.fillRect(0, 270, 390, 10);
        for (const o of obstacles()) {
            ctx.fillStyle = o.w === 1 || o.h === 1 ? '#c04f43' : '#9eafb6';
            ctx.fillRect(o.x, o.y, o.w, o.h);
        }
        if (mode() === 'lift') {
            ctx.fillStyle = '#8199a3';
            ctx.fillRect(155, 250, 100, 20);
            text('발판 정지', 156, 294, '#53626d', 13);
        }
        if (a.attempts.length) {
            ctx.setLineDash([3, 3]);
            for (const attempt of a.attempts) {
                ctx.strokeStyle = attempt.ok ? '#167e72' : '#d78446';
                ctx.strokeRect(attempt.x, attempt.y, a.body.w, a.body.h);
            }
            ctx.setLineDash([]);
        }
        ctx.fillStyle = i ? '#1a8277' : '#d98549';
        ctx.fillRect(a.body.x, a.body.y, a.body.w, a.body.h);
        ctx.fillStyle = '#fff';
        ctx.fillRect(a.body.x + 20, a.body.y + 8, 5, 5);
        ctx.restore();
    });
    $('raw-result').textContent = actors[0].status;
    $('fixed-result').textContent = actors[1].status;
}
function frame(now: number) {
    acc += Math.min(0.1, (now - last) / 1000);
    last = now;
    if (playing) {
        while (acc >= 0.05 && playing) {
            step();
            acc -= 0.05;
        }
    } else acc = 0;
    raf = requestAnimationFrame(frame);
}
function toggle() {
    if (tick >= 45) reset();
    playing = !playing;
    $('play').textContent = playing ? '일시 정지' : '실험 재생';
}
function move(direction: number) {
    for (const a of actors)
        if (!sweptBlocked(a.body, direction * 2, 0, obstacles())) a.body.x += direction * 2;
    draw();
}
$('play').onclick = toggle;
$('step').onclick = () => {
    playing = false;
    $('play').textContent = '실험 재생';
    if (tick >= 45) reset();
    step();
};
$('reset').onclick = reset;
$('left').onclick = () => move(-1);
$('right').onclick = () => move(1);
inputs.forEach(
    (id) =>
        ($<HTMLInputElement>(id).oninput = () => {
            $(`${id}-value`).textContent =
                `${number(id)} ${id === 'overlap' || id === 'limit' ? 'px' : 'ms'}`;
            reset();
        }),
);
['mode', 'blocker', 'same-platform'].forEach((id) => ($(id).onchange = reset));
document.addEventListener('keydown', (e) => {
    if (dialog.open || !settings.hidden || ['INPUT', 'SELECT', 'BUTTON'].includes((e.target as HTMLElement).tagName)) return;
    if (e.code === 'Space') {
        e.preventDefault();
        if (!e.repeat) toggle();
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        move(e.key === 'ArrowLeft' ? -1 : 1);
    }
});
window.addEventListener('pagehide', (event) => {
    if (event.persisted) return;
    cancelAnimationFrame(raf);
    observer.disconnect();
});
window.addEventListener('pageshow', (event) => {
    if (!event.persisted) return;
    last = performance.now();
    acc = 0;
    resize();
});
reset();
raf = requestAnimationFrame((now) => {
    last = now;
    frame(now);
});
