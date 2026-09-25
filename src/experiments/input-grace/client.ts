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
        if (!automatic) release();
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
import { canJump, consume, type GraceState } from './model';
const number = (id: string) => Number($<HTMLInputElement>(id).value),
    checked = (id: string) => $<HTMLInputElement>(id).checked;
type Actor = {
    x: number;
    y: number;
    vy: number;
    grounded: boolean;
    memory: GraceState;
    status: string;
    events: { t: number; type: string }[];
    jumps: number;
};
let actors: Actor[] = [],
    time = 0,
    tick = 0,
    playing = false,
    pressed = false,
    automatic = true,
    pressAt = 0.05,
    raf = 0,
    last = 0,
    acc = 0;
const keys = new Set<string>();
const scenario = () => $<HTMLSelectElement>('scenario').value;
function landingTime() {
    let y = 110,
        v = 100,
        t = 0;
    const dt = 1 / number('hz');
    while (y + 30 < 290) {
        v += 600 * dt;
        y += v * dt;
        t += dt;
    }
    return t;
}
function reset() {
    playing = false;
    $('play').textContent = '예시 재생';
    time = 0;
    tick = 0;
    pressed = false;
    automatic = true;
    acc = 0;
    const s = scenario();
    pressAt = s === 'buffer' ? Math.max(0, landingTime() - number('offset') / 1000) : number('offset') / 1000;
    actors = [0, 1].map(() => ({
        x: s === 'buffer' ? 300 : s === 'manual' ? 130 : 221,
        y: s === 'buffer' ? 110 : 190,
        vy: s === 'buffer' ? 100 : 0,
        grounded: s === 'manual',
        memory: {
            lastGround: s === 'buffer' ? -Infinity : 0,
            lastPress: -Infinity,
            groundAvailable: s !== 'buffer',
            inputAvailable: false,
            held: false,
        },
        status: '출발 대기',
        events: s === 'coyote' ? [{ t: 0, type: '이탈' }] : [],
        jumps: 0,
    }));
    $('log').textContent =
        `예정 입력 ${Math.round(pressAt * 1000)}ms · 한 틱 ${(1000 / number('hz')).toFixed(1)}ms`;
    draw();
}
function press(at = time) {
    for (const a of actors) {
        a.memory.lastPress = at;
        a.memory.inputAvailable = true;
        a.memory.held = true;
        a.events.push({ t: at, type: '누름' });
    }
    pressed = true;
}
function release() {
    for (const a of actors) a.memory.held = false;
}
function step() {
    const dt = 1 / number('hz');
    time += dt;
    tick++;
    if (automatic && scenario() !== 'manual' && !pressed && time + 1e-9 >= pressAt) press();
    if (automatic && pressed && !checked('hold-example') && time - actors[0].memory.lastPress > 0.033)
        release();
    actors.forEach((a, i) => {
        const horizontal =
            scenario() === 'manual'
                ? (keys.has('ArrowRight') ? 1 : 0) - (keys.has('ArrowLeft') ? 1 : 0)
                : scenario() === 'coyote'
                  ? 1
                  : 0;
        a.x = Math.max(0, Math.min(475, a.x + horizontal * 110 * dt));
        const floor = scenario() === 'buffer' ? 290 : a.x < 220 ? 220 : 320;
        const wasGrounded = a.grounded;
        a.vy += 600 * dt;
        a.y += a.vy * dt;
        a.grounded = a.y + 30 >= floor && a.vy >= 0;
        if (a.grounded) {
            a.y = floor - 30;
            a.vy = 0;
            a.memory.lastGround = time;
            if (!wasGrounded) {
                a.memory.groundAvailable = true;
                a.events.push({ t: time, type: '착지' });
            }
        }
        if (!a.grounded && wasGrounded) a.events.push({ t: time, type: '이탈' });
        if (
            canJump(
                a.memory,
                time,
                a.grounded,
                i ? number('coyote') / 1000 : 0,
                i ? number('buffer') / 1000 : 0,
                checked('require-held'),
            )
        ) {
            consume(a.memory);
            a.vy = -320;
            a.grounded = false;
            a.jumps++;
            a.status = `${Math.round(time * 1000)}ms · 점프 ${a.jumps}회`;
            a.events.push({ t: time, type: '승인' });
        } else if (
            a.memory.inputAvailable &&
            time - a.memory.lastPress > (i ? number('buffer') / 1000 : 0) + 1e-9
        ) {
            a.memory.inputAvailable = false;
            if (!a.jumps) a.status = '입력 만료 · 점프 없음';
            a.events.push({ t: time, type: '만료' });
        }
    });
    if (time >= 2.1 && scenario() !== 'manual') {
        playing = false;
        $('play').textContent = '다시 재생';
    }
    $('log').textContent =
        `${tick} 틱 · ${Math.round(time * 1000)}ms · 입력 적용 ${pressed ? Math.round(actors[0].memory.lastPress * 1000) + 'ms' : '대기'} · B ${actors[1].memory.groundAvailable ? '접지 자격 있음' : '접지 자격 소비됨'}`;
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
        text(i ? 'B · 접지 + 입력 기억' : 'A · 현재 틱만', 16, 23, i ? '#14776d' : '#ad5c2c', 13);
        const s = Math.min((pw - 28) / 510, (ph - 68) / 340);
        ctx.translate((pw - 500 * s) / 2, 36);
        ctx.scale(s, s);
        ctx.fillStyle = '#bdcdd1';
        if (scenario() === 'buffer') ctx.fillRect(0, 290, 500, 14);
        else {
            ctx.fillRect(0, 220, 220, 14);
            ctx.fillRect(220, 320, 280, 14);
        }
        ctx.fillStyle = i ? '#188277' : '#d48043';
        ctx.fillRect(a.x, a.y, 24, 30);
        ctx.fillStyle = '#fff';
        ctx.fillRect(a.x + 15, a.y + 6, 4, 4);
        ctx.restore();
        const baseX = stacked ? 0 : i * pw,
            baseY = (stacked ? i * ph : 0) + ph - 16;
        ctx.strokeStyle = '#c0ced2';
        ctx.beginPath();
        ctx.moveTo(baseX + 18, baseY);
        ctx.lineTo(baseX + pw - 18, baseY);
        ctx.stroke();
        for (const event of a.events) {
            ctx.fillStyle = event.type === '승인' ? '#147b70' : event.type === '누름' ? '#cb7538' : '#8b9ca3';
            ctx.fillRect(baseX + 18 + (event.t / 2.1) * (pw - 36), baseY - 5, 4, 10);
        }
    });
    $('raw-result').textContent = actors[0].status;
    $('fixed-result').textContent = actors[1].status;
}
function frame(now: number) {
    const elapsed = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (playing) {
        acc += elapsed;
        const dt = 1 / number('hz');
        while (acc >= dt && playing) {
            step();
            acc -= dt;
        }
    } else acc = 0;
    raf = requestAnimationFrame(frame);
}
$('play').onclick = () => {
    if (time >= 2.1 && scenario() !== 'manual') reset();
    playing = !playing;
    $('play').textContent = playing ? '일시 정지' : '예시 재생';
};
$('step').onclick = () => {
    playing = false;
    $('play').textContent = '예시 재생';
    step();
};
$('reset').onclick = reset;
function directPress() {
    automatic = false;
    press(time + 1 / number('hz'));
    playing = true;
    $('play').textContent = '일시 정지';
    draw();
}
$('jump').onpointerdown = (e) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    directPress();
};
$('jump').onpointerup = release;
$('jump').onpointercancel = release;
$('jump').onkeydown = (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
        e.preventDefault();
        directPress();
    }
};
$('jump').onkeyup = release;
function move(direction: number) {
    for (const a of actors) a.x = Math.max(0, Math.min(475, a.x + direction * 12));
    draw();
}
$('left').onclick = () => move(-1);
$('right').onclick = () => move(1);
document.addEventListener('keydown', (e) => {
    if (dialog.open || !settings.hidden || ['INPUT', 'SELECT', 'BUTTON'].includes((e.target as HTMLElement).tagName)) return;
    if (e.code === 'Space') {
        e.preventDefault();
        if (!e.repeat) directPress();
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        keys.add(e.key);
        playing = true;
        $('play').textContent = '일시 정지';
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
for (const id of ['offset', 'coyote', 'buffer'])
    $<HTMLInputElement>(id).oninput = () => {
        $(`${id}-value`).textContent = `${number(id)} ms`;
        reset();
    };
for (const id of ['scenario', 'hz', 'require-held', 'hold-example']) $(id).onchange = reset;
window.addEventListener('pagehide', (event) => {
    keys.clear();
    if (!automatic) release();
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
