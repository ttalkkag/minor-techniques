const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const value = (id: string) => Number($<HTMLInputElement>(id).value);
const checked = (id: string) => $<HTMLInputElement>(id).checked;
const choice = (id: string) => $<HTMLSelectElement>(id).value;
const lab = $('lab'),
    panel = $('settings'),
    menu = $('menu'),
    info = $<HTMLDialogElement>('info');
const keys = new Set<string>();
const compact = matchMedia('(max-width: 700px)');
const backdrop = $('menu-backdrop');
const background = [
    lab.querySelector<HTMLElement>('.scene')!,
    lab.querySelector<HTMLElement>('footer')!,
    lab.querySelector<HTMLElement>('header a')!,
    $('explain'),
];
function menuControls() {
    return Array.from(panel.querySelectorAll<HTMLElement>('button, input, select, a[href]'))
        .filter((element) => !element.hasAttribute('disabled') && element.getClientRects().length > 0);
}
function syncMenu() {
    const modal = compact.matches && !panel.hidden;
    backdrop.hidden = !modal;
    background.forEach((element) => {
        element.inert = modal;
    });
    if (modal) {
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-modal', 'true');
    } else {
        panel.setAttribute('role', 'complementary');
        panel.removeAttribute('aria-modal');
    }
}
function setMenu(open: boolean, focus = true) {
    panel.hidden = !open;
    lab.classList.toggle('menu-open', open);
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? '설정 닫기' : '설정 열기');
    keys.clear();
    syncMenu();
    if (focus) {
        if (open) menuControls()[0]?.focus();
        else menu.focus();
    }
}
setMenu(!compact.matches, false);
menu.onclick = () => setMenu(Boolean(panel.hidden));
$('close-menu').onclick = () => setMenu(false);
backdrop.onclick = () => setMenu(false);
compact.addEventListener('change', () => {
    syncMenu();
    if (compact.matches && !panel.hidden && !info.open) menuControls()[0]?.focus();
});
$('explain').onclick = () => {
    keys.clear();
    info.showModal();
    $('info-title').focus();
    info.scrollTop = 0;
};
$('close-info').onclick = () => info.close();
document.addEventListener('keydown', (e) => {
    if (info.open) return;
    if (e.key === 'Escape' && !panel.hidden) {
        e.preventDefault();
        setMenu(false);
    } else if (e.key === 'Tab' && compact.matches && !panel.hidden) {
        const controls = menuControls();
        const first = controls[0], last = controls[controls.length - 1];
        if (e.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
            e.preventDefault();
            last?.focus();
        } else if (!e.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
            e.preventDefault();
            first?.focus();
        }
    }
});
document.querySelectorAll<HTMLInputElement>('input[type="range"]').forEach((input) =>
    input.addEventListener('input', () => {
        const out = document.getElementById(input.id + '-value');
        if (out) out.textContent = input.value;
    }),
);
const accepted = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS', 'Space'];
document.addEventListener('keydown', (e) => {
    if (
        info.open || (compact.matches && !panel.hidden) ||
        (e.target instanceof HTMLElement && e.target.closest('input, select, textarea, button, a'))
    ) return;
    if (accepted.includes(e.code)) {
        e.preventDefault();
        keys.add(e.code);
    }
});
document.addEventListener('keyup', (e) => keys.delete(e.code));
document.querySelectorAll<HTMLButtonElement>('[data-key]').forEach((b) => {
    let keyboardHeld = false;
    b.onpointerdown = (e) => {
        b.setPointerCapture(e.pointerId);
        keys.add(b.dataset.key!);
    };
    b.onpointerup = b.onpointercancel = () => keys.delete(b.dataset.key!);
    b.onkeydown = (e) => {
        if (e.code === 'Enter' || e.code === 'Space') {
            e.preventDefault();
            keyboardHeld = true;
            keys.add(b.dataset.key!);
        }
    };
    b.onkeyup = (e) => {
        if (e.code === 'Enter' || e.code === 'Space') {
            keyboardHeld = false;
            keys.delete(b.dataset.key!);
        }
    };
    b.onblur = () => {
        if (keyboardHeld) keys.delete(b.dataset.key!);
        keyboardHeld = false;
    };
});
window.addEventListener('blur', () => keys.clear());
function restoreControls() {
    document.querySelectorAll<HTMLInputElement>('input').forEach((e) => {
        e.value = e.defaultValue;
        e.checked = e.defaultChecked;
        e.dispatchEvent(new Event('input'));
    });
    document.querySelectorAll<HTMLSelectElement>('select').forEach((e) => (e.selectedIndex = 0));
    keys.clear();
}
const canvas = $<HTMLCanvasElement>('scene');
const ctx = canvas.getContext('2d')!;
let W = 800,
    H = 500;
function resizeCanvas() {
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    const dpr = Math.min(devicePixelRatio, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
const resize = new ResizeObserver(resizeCanvas);
resize.observe(canvas);
function textAt(t: string, x: number, y: number, color = '#47666d', size = 12) {
    ctx.fillStyle = color;
    ctx.font = `${size}px sans-serif`;
    ctx.fillText(t, x, y);
}
function line(x1: number, y1: number, x2: number, y2: number, color = '#b8cdcd', width = 1) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}
function circle(x: number, y: number, r: number, color: string) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(1, r), 0, Math.PI * 2);
    ctx.fill();
}
import { damp, confine, deadTarget } from './model';
let player = 10,
    camera = 13,
    direction = 1,
    pending = 0,
    pendingTime = 0,
    velocity = 0,
    target = 13,
    room = 0;
let previous = performance.now(),
    accumulator = 0,
    raf = 0;
function reset() {
    restoreControls();
    player = 10;
    camera = 13;
    direction = 1;
    pending = 0;
    pendingTime = 0;
    velocity = 0;
    target = 13;
    room = 0;
    accumulator = 0;
}
$('reset').onclick = reset;
$('teleport').onclick = () => {
    player = 50;
    camera = 53;
    target = 53;
    room = 1;
    direction = 1;
    pendingTime = 0;
};
function update(dt: number) {
    const input =
        Number(keys.has('ArrowRight') || keys.has('KeyD')) -
        Number(keys.has('ArrowLeft') || keys.has('KeyA'));
    velocity = input * 7;
    player = Math.max(0.5, Math.min(79.5, player + velocity * dt));
    if (input && input !== direction) {
        if (pending !== input) {
            pending = input;
            pendingTime = 0;
        }
        pendingTime += dt;
        if (!checked('hysteresis') || pendingTime >= 0.25) {
            direction = input;
            pendingTime = 0;
        }
    } else pendingTime = 0;
    const nextRoom = player >= 40 ? 1 : 0;
    if (nextRoom !== room) {
        room = nextRoom;
        camera = room * 40 + 20;
        pendingTime = 0;
    }
    target =
        player +
        (choice('mode') === 'offset'
            ? direction * value('offset')
            : choice('mode') === 'velocity'
              ? velocity * 0.5
              : 0);
    const desired = deadTarget(camera, target, value('dead'));
    camera =
        choice('damping') === 'time'
            ? damp(camera, desired, value('half'), dt)
            : camera + (desired - camera) * 0.1;
    camera = checked('confine')
        ? confine(camera, room * 40, room * 40 + 40, value('view'))
        : Math.max(room * 40, Math.min(room * 40 + 40, camera));
}
function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#e6eff0';
    ctx.fillRect(0, 0, W, H);
    const width = value('view'),
        scale = W / width,
        ground = H * 0.7,
        sx = (x: number) => (x - camera) * scale + W / 2;
    for (let x = 0; x <= 80; x += 2) {
        const px = sx(x);
        line(px, ground, px, ground + 7);
        if (x % 10 === 0) textAt(`${x}m`, px + 3, ground + 25);
    }
    ctx.fillStyle = '#d0ddd6';
    ctx.fillRect(sx(0), ground, 80 * scale, H - ground);
    for (let r = 0; r < 2; r++) {
        ctx.fillStyle = r ? '#cddedb' : '#dce7de';
        ctx.fillRect(sx(r * 40), ground - 95, 40 * scale, 95);
        textAt(r ? '다음 방' : '시작 방', sx(r * 40 + 2), ground - 112, '#557373', 14);
    }
    for (const x of [3, 18, 30, 46, 57, 72]) {
        ctx.fillStyle = '#62867b';
        ctx.fillRect(sx(x), ground - 40, scale * 0.55, 40);
        circle(sx(x + 0.28), ground - 46, 18, '#8daf9c');
    }
    ctx.fillStyle = '#e09b64';
    ctx.fillRect(sx(32), ground - 26, scale, 26);
    textAt('장애물', sx(31), ground - 40, '#995a33');
    for (const x of [0, 40, 80]) {
        line(sx(x), 60, sx(x), ground, '#5a7d7c', 2);
        textAt(x === 40 ? '진입 트리거' : '방 경계', sx(x) + 6, 76);
    }
    const dz = value('dead') * scale;
    ctx.fillStyle = '#1c847511';
    ctx.fillRect(W / 2 - dz, 90, dz * 2, Math.max(20, ground - 90));
    ctx.setLineDash([5, 5]);
    line(W / 2 - dz, 90, W / 2 - dz, ground, '#31988e');
    line(W / 2 + dz, 90, W / 2 + dz, ground, '#31988e');
    ctx.setLineDash([]);
    line(W / 2, 100, W / 2, ground, '#9db5b5');
    textAt('화면 중심', W / 2 + 8, 116);
    circle(sx(target), ground - 76, 6, '#d38347');
    line(sx(player), ground - 60, sx(target), ground - 76, '#d38347', 2);
    textAt('예측 목표', sx(target) + 10, ground - 77, '#9d5a2e');
    ctx.fillStyle = '#177e74';
    ctx.fillRect(sx(player) - 10, ground - 37, 20, 37);
    circle(sx(player), ground - 44, 10, '#177e74');
    textAt(direction > 0 ? '→' : '←', sx(player) - 8, ground - 18, 'white', 17);
    if (width > 40) {
        ctx.fillStyle = '#364c4b22';
        ctx.fillRect(0, 0, Math.max(0, sx(room * 40)), ground);
        ctx.fillRect(sx(room * 40 + 40), 0, W, ground);
    }
    textAt('직교 화면 · 청록 캐릭터 / 주황 목표', 16, 26, '#405f65', 12);
    const front = width / 2 + direction * (camera - player),
        fixed = Math.pow(0.9, Number(choice('fps'))) * 100;
    $('readout').textContent =
        `전방 ${front.toFixed(1)}m · 7m/s 이동 여유 ${(front / 7).toFixed(2)}초 · 방 ${room + 1} · ${width > 40 ? '화면이 방보다 큼: 여백 정책' : checked('confine') ? '화면 경계 제한' : '중심만 제한'} · 고정 목표 1초 오차 ${choice('damping') === 'time' ? (100 * Math.pow(0.5, 1 / value('half'))).toFixed(2) : fixed.toFixed(2)}%`;
}
function frame(now: number) {
    const dt = Math.min(0.1, (now - previous) / 1000);
    previous = now;
    accumulator += dt;
    const step = 1 / Number(choice('fps'));
    while (accumulator >= step) {
        if (!info.open) update(step);
        accumulator -= step;
    }
    draw();
    raf = requestAnimationFrame(frame);
}
raf = requestAnimationFrame(frame);
window.addEventListener('pagehide', (e) => {
    keys.clear();
    cancelAnimationFrame(raf);
    if (!e.persisted) resize.disconnect();
});
window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    previous = performance.now();
    accumulator = 0;
    syncMenu();
    resize.observe(canvas);
    resizeCanvas();
    raf = requestAnimationFrame(frame);
});
