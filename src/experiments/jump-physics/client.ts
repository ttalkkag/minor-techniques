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
    if (open) {
        keys.clear();
        if (!autoRelease) release();
        $('close-menu').focus();
    }
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
import { integrate, brake, cutJump, jumpSamples, type Integration } from './model';
const number = (id: string) => Number($<HTMLInputElement>(id).value),
    checked = (id: string) => $<HTMLInputElement>(id).checked;
const method = () => $<HTMLSelectElement>('method').value as Integration;
let y = 0,
    vy = 0,
    x = 0,
    vx = 0,
    previous = { x: 0, y: 0 },
    time = 0,
    jumpTime = 0,
    airborne = false,
    playing = true,
    autoRelease = true,
    released = false,
    last = 0,
    acc = 0,
    lastDraw = 0,
    raf = 0,
    peak = 0;
const keys = new Set<string>();
function release() {
    if (!released) {
        vy = cutJump(vy, number('cut'));
        released = true;
    }
}
function jump(automatic: boolean) {
    if (airborne) return;
    previous = { x, y };
    vy = 10;
    airborne = true;
    autoRelease = automatic;
    released = false;
    jumpTime = 0;
    peak = 0;
    playing = true;
    $('play').textContent = '일시 정지';
    draw();
}
function reset() {
    x = 0;
    y = 0;
    vx = 0;
    vy = 0;
    previous = { x: 0, y: 0 };
    time = 0;
    jumpTime = 0;
    airborne = false;
    playing = true;
    released = false;
    acc = 0;
    peak = 0;
    keys.clear();
    $('play').textContent = '일시 정지';
    updatePrediction();
    draw();
}
function updatePrediction() {
    const prediction = jumpSamples(
        1 / number('hz'),
        method(),
        number('fall'),
        number('release') >= 1200 ? 99 : number('release') / 1000,
        number('cut'),
    );
    $('model-result').textContent = `${prediction.peak.toFixed(3)} m / ${prediction.landing.toFixed(3)} s`;
    for (const id of ['fall', 'release', 'cut', 'acceleration', 'braking', 'air'])
        $(`${id}-value`).textContent =
            id === 'release'
                ? number(id) >= 1200
                    ? '유지'
                    : `${number(id)} ms`
                : `${number(id).toFixed(id === 'fall' || id === 'cut' ? 1 : 0)} ${id === 'fall' ? '×' : id === 'cut' ? 'm/s' : id === 'air' ? '%' : 'm/s²'}`;
}
function step() {
    const dt = 1 / number('hz');
    previous = { x, y };
    time += dt;
    const direction = (keys.has('ArrowRight') ? 1 : 0) - (keys.has('ArrowLeft') ? 1 : 0),
        control = airborne ? number('air') / 100 : 1;
    if (direction) {
        const acceleration = number('acceleration') * (vx * direction < 0 ? 1.8 : 1) * control;
        vx = Math.max(-6, Math.min(6, vx + direction * acceleration * dt));
    } else vx = brake(vx, number('braking') * dt);
    x += vx * dt;
    if (x > 5 || x < -5) {
        x = Math.max(-5, Math.min(5, x));
        vx = 0;
        previous.x = x;
    }
    if (airborne) {
        if (autoRelease && !released && jumpTime + 1e-10 >= number('release') / 1000 && number('release') < 1200)
            release();
        const next = integrate(y, vy, -20 * (vy < -1e-10 ? number('fall') : 1), dt, method());
        y = next.y;
        vy = next.v;
        jumpTime += dt;
        peak = Math.max(peak, y);
        if (y <= 1e-10) {
            y = 0;
            vy = 0;
            airborne = false;
        }
    }
    $('log').textContent =
        `게임 ${time.toFixed(2)}s · 물리 높이 ${y.toFixed(3)}m · 수평 속도 ${vx.toFixed(2)}m/s · 실제 최고점 ${peak.toFixed(3)}m${airborne ? '' : ' · 접지'}`;
}
function draw() {
    ctx.clearRect(0, 0, width, height);
    const ground = height * 0.81,
        s = Math.min((height * 0.68) / 3.1, width / 11),
        cx = width / 2,
        alpha = playing && checked('interpolate') ? Math.min(1, acc * number('hz')) : 1;
    const display = { x: previous.x + (x - previous.x) * alpha, y: previous.y + (y - previous.y) * alpha };
    ctx.strokeStyle = '#d2dde0';
    ctx.lineWidth = 1;
    for (let h = 0; h <= 3; h++) {
        ctx.beginPath();
        ctx.moveTo(18, ground - h * s);
        ctx.lineTo(width - 18, ground - h * s);
        ctx.stroke();
        text(`${h}m`, 20, ground - h * s - 5, '#6a7b84', 11);
    }
    ctx.fillStyle = '#c4d3d6';
    ctx.fillRect(0, ground, width, height - ground);
    const graphX = Math.max(30, width * 0.08),
        graphWidth = width * 0.84;
    ctx.beginPath();
    ctx.strokeStyle = '#cc8048';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    for (let n = 0; n <= 100; n++) {
        const t = n / 100,
            gy = 10 * t - 10 * t * t,
            px = graphX + (t / 1.3) * graphWidth,
            py = ground - gy * s;
        if (n === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    const prediction = jumpSamples(
        1 / number('hz'),
        method(),
        number('fall'),
        number('release') >= 1200 ? 99 : number('release') / 1000,
        number('cut'),
    );
    ctx.strokeStyle = '#27877b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    prediction.points.forEach((p, i) => {
        const px = graphX + (p.t / 1.3) * graphWidth,
            py = ground - p.y * s;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    });
    ctx.stroke();
    ctx.strokeStyle = '#558b82';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx + x * s - 10, ground - y * s - 26, 20, 26);
    ctx.fillStyle = '#167d73';
    ctx.fillRect(cx + display.x * s - 10, ground - display.y * s - 26, 20, 26);
    ctx.fillStyle = '#fff';
    ctx.fillRect(cx + display.x * s + 2, ground - display.y * s - 20, 4, 4);
    text('실선: 예측 높이–시간 · 점선: 일정 중력 기준', 16, 24, '#53626d', width < 500 ? 11 : 13);
    text(
        `표시 ${number('fps')}fps / 물리 ${number('hz')}Hz${checked('interpolate') ? ' · 보간 ON' : ''}`,
        16,
        height - 17,
        '#53626d',
        12,
    );
}
function frame(now: number) {
    const elapsed = Math.min(0.15, (now - last) / 1000);
    last = now;
    if (playing) {
        acc += elapsed;
        const dt = 1 / number('hz');
        while (acc >= dt) {
            step();
            acc -= dt;
        }
    } else acc = 0;
    if (now - lastDraw >= 1000 / number('fps')) {
        draw();
        lastDraw = now;
    }
    raf = requestAnimationFrame(frame);
}
$('jump').onclick = () => {
    if (airborne) {
        y = 0;
        vy = 0;
        airborne = false;
        previous = { x, y };
    }
    jump(true);
};
$('play').onclick = () => {
    playing = !playing;
    $('play').textContent = playing ? '일시 정지' : '재생';
};
$('step').onclick = () => {
    playing = false;
    $('play').textContent = '재생';
    if (!airborne) jump(true);
    playing = false;
    $('play').textContent = '재생';
    step();
    acc = 1 / number('hz');
    draw();
};
$('reset').onclick = reset;
for (const [id, key] of [
    ['left', 'ArrowLeft'],
    ['right', 'ArrowRight'],
]) {
    const button = $(id);
    button.onpointerdown = (e) => {
        button.setPointerCapture(e.pointerId);
        keys.add(key);
    };
    button.onpointerup = () => keys.delete(key);
    button.onpointercancel = () => keys.delete(key);
    button.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            keys.add(key);
        }
    };
    button.onkeyup = () => keys.delete(key);
}
document.addEventListener('keydown', (e) => {
    if (dialog.open || !settings.hidden || ['INPUT', 'SELECT', 'BUTTON'].includes((e.target as HTMLElement).tagName)) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        keys.add(e.key);
    }
    if (e.code === 'Space') {
        e.preventDefault();
        if (!e.repeat) jump(false);
    }
});
document.addEventListener('keyup', (e) => {
    keys.delete(e.key);
    if (e.code === 'Space' && !['INPUT', 'SELECT', 'BUTTON'].includes((e.target as HTMLElement).tagName)) release();
});
window.addEventListener('blur', () => {
    keys.clear();
    release();
});
for (const id of ['method', 'hz', 'fall', 'release', 'cut', 'acceleration', 'braking', 'air'])
    $(id).oninput = reset;
for (const id of ['fps', 'interpolate'])
    $(id).oninput = () => {
        updatePrediction();
        draw();
    };
window.addEventListener('pagehide', (event) => {
    keys.clear();
    if (!autoRelease) release();
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
