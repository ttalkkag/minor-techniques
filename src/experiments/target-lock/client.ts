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
import { basis, groupBounds, type V } from './model';
type Enemy = { id: string; x: number; z: number; alive: boolean; hide: number };
let enemies: Enemy[] = [
        { id: 'A', x: -2, z: 3, alive: true, hide: 0 },
        { id: 'B', x: 2, z: 3, alive: true, hide: 0 },
        { id: 'C', x: 9, z: 10, alive: true, hide: 0 },
    ],
    p: V = { x: 0, z: -5 },
    target: string | null = null,
    forward: V = { x: 0, z: 1 },
    occluded = 0,
    reason = '자유 이동',
    time = 0,
    last = performance.now(),
    raf = 0,
    switches = 0;
const dist = (e: Enemy) => Math.hypot(e.x - p.x, e.z - p.z);
function candidates() {
    return enemies.filter((e) => e.alive && e.hide <= 0 && dist(e) < 20).sort((a, b) => dist(a) - dist(b));
}
function lock() {
    if (target) {
        target = null;
        reason = '직접 해제';
    } else {
        target = candidates()[0]?.id ?? null;
        reason = target ? '대상 획득' : '유효한 후보 없음';
    }
    occluded = 0;
}
function switchTarget() {
    const list = candidates();
    if (!list.length) return;
    const index = list.findIndex((e) => e.id === target);
    target = list[(index + 1) % list.length].id;
    reason = '전환 입력';
    occluded = 0;
    switches++;
}
function reset() {
    restoreControls();
    p = { x: 0, z: -5 };
    target = null;
    forward = { x: 0, z: 1 };
    occluded = 0;
    reason = '자유 이동';
    time = 0;
    switches = 0;
    enemies = [
        { id: 'A', x: -2, z: 3, alive: true, hide: 0 },
        { id: 'B', x: 2, z: 3, alive: true, hide: 0 },
        { id: 'C', x: 9, z: 10, alive: true, hide: 0 },
    ];
}
$('reset').onclick = reset;
$('lock').onclick = lock;
$('switch').onclick = switchTarget;
$('hide-target').onclick = () => {
    const e = enemies.find((e) => e.id === target) ?? candidates()[0];
    if (e) {
        e.hide = value('hideTime');
        reason = '가림 시작';
    }
};
$('remove-target').onclick = () => {
    const e = enemies.find((e) => e.id === target);
    if (e) {
        e.alive = false;
        target = null;
        occluded = 0;
        reason = '대상 삭제 → 마커·이동·카메라 동시 해제';
    }
};
document.addEventListener('keydown', (e) => {
    if (
        info.open || (compact.matches && !panel.hidden) ||
        (e.target instanceof HTMLElement && e.target.closest('input, select, textarea, button, a'))
    ) return;
    if (e.code === 'KeyL' && !e.repeat) lock();
    if (e.code === 'KeyN' && !e.repeat) {
        e.preventDefault();
        switchTarget();
    }
});
function update(dt: number) {
    time += dt;
    enemies[0].x = -2 + Math.sin(time * 0.65) * 3;
    enemies[1].x = 2 - Math.sin(time * 0.65) * 3;
    enemies.forEach((e) => (e.hide = Math.max(0, e.hide - dt)));
    if (target && choice('mode') === 'nearest') {
        const next = candidates()[0]?.id;
        if (next && next !== target) {
            target = next;
            switches++;
            reason = '거리 순위 변경으로 자동 전환';
            occluded = 0;
        }
    }
    let enemy = enemies.find((e) => e.id === target && e.alive);
    if (enemy) {
        if (dist(enemy) > 20) {
            target = null;
            reason = '유지 거리 초과';
        } else if (enemy.hide > 0) {
            occluded += dt;
            if (occluded >= value('grace')) {
                target = null;
                reason = '가림 유예 만료';
            }
        } else occluded = 0;
    }
    if (target && enemy) {
        forward = basis(p, enemy, forward).forward;
    } else {
        const theta = (value('orbit') * Math.PI) / 180;
        forward = { x: Math.sin(theta), z: Math.cos(theta) };
    }
    const { right } = basis(p, { x: p.x + forward.x, z: p.z + forward.z }, forward);
    const ix =
            Number(keys.has('ArrowRight') || keys.has('KeyD')) -
            Number(keys.has('ArrowLeft') || keys.has('KeyA')),
        iz =
            Number(keys.has('ArrowUp') || keys.has('KeyW')) -
            Number(keys.has('ArrowDown') || keys.has('KeyS')),
        n = Math.max(1, Math.hypot(ix, iz));
    p.x = Math.max(-16, Math.min(16, p.x + ((forward.x * iz + right.x * ix) / n) * 4 * dt));
    p.z = Math.max(-16, Math.min(16, p.z + ((forward.z * iz + right.z * ix) / n) * 4 * dt));
}
function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#e6efea';
    ctx.fillRect(0, 0, W, H);
    const enemy = enemies.find((e) => e.id === target),
        r = enemy?.id === 'B' ? value('size') : 1,
        bounds = enemy ? groupBounds(p, enemy, r, checked('group')) : null;
    const center = bounds ? { x: (bounds.left + bounds.right) / 2, z: (bounds.bottom + bounds.top) / 2 } : p;
    const span = bounds
            ? Math.max(10, Math.hypot(bounds.right - bounds.left, bounds.top - bounds.bottom) + 3)
            : 23,
        scale = Math.min(W, H - 30) / span;
    const f = target
            ? forward
            : {
                  x: Math.sin((value('orbit') * Math.PI) / 180),
                  z: Math.cos((value('orbit') * Math.PI) / 180),
              },
        rt = { x: f.z, z: -f.x };
    const project = (q: V) => ({
        x: W / 2 + ((q.x - center.x) * rt.x + (q.z - center.z) * rt.z) * scale,
        y: H * 0.54 - ((q.x - center.x) * f.x + (q.z - center.z) * f.z) * scale,
    });
    for (let x = -20; x <= 20; x += 2) {
        let a = project({ x, z: -20 }),
            b = project({ x, z: 20 });
        line(a.x, a.y, b.x, b.y, '#d1dfd6');
        a = project({ x: -20, z: x });
        b = project({ x: 20, z: x });
        line(a.x, a.y, b.x, b.y, '#d1dfd6');
    }
    if (bounds) {
        ctx.setLineDash([6, 5]);
        ctx.strokeStyle = '#528a82';
        ctx.beginPath();
        [
            { x: bounds.left, z: bounds.bottom },
            { x: bounds.right, z: bounds.bottom },
            { x: bounds.right, z: bounds.top },
            { x: bounds.left, z: bounds.top },
        ].forEach((q, i) => {
            const a = project(q);
            if (i) ctx.lineTo(a.x, a.y);
            else ctx.moveTo(a.x, a.y);
        });
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);
    }
    for (const e of enemies) {
        if (!e.alive) continue;
        const q = project(e),
            radius = (e.id === 'B' ? value('size') : 1) * scale,
            distant = checked('fairy') && dist(e) > 11;
        if (e.hide > 0) {
            ctx.fillStyle = '#7a9189';
            ctx.fillRect(q.x - radius - 12, q.y - radius - 8, radius * 2 + 24, radius * 2 + 16);
            textAt('가림', q.x - 12, q.y + 4, '#fff');
        } else if (!distant) {
            circle(q.x, q.y, radius, e.id === 'B' ? '#d69b66' : '#aebc8c');
            textAt(e.id, q.x - 4, q.y + 4, '#2b473e', 14);
        } else {
            ctx.fillStyle = '#789b76';
            ctx.beginPath();
            ctx.moveTo(q.x, q.y - 7);
            ctx.lineTo(q.x + 5, q.y);
            ctx.lineTo(q.x, q.y + 7);
            ctx.lineTo(q.x - 5, q.y);
            ctx.closePath();
            ctx.fill();
            textAt('존재 ' + e.id, q.x + 9, q.y, '#577f60');
        }
        if (e.id === target) {
            ctx.strokeStyle = '#df8142';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(q.x, q.y, radius + 8, 0, Math.PI * 2);
            ctx.stroke();
            textAt('선택 ' + e.id, q.x - 19, q.y - radius - 16, '#9b552d', 13);
        }
    }
    const a = project(p),
        fp = project({ x: p.x + f.x * 2, z: p.z + f.z * 2 }),
        rp = project({ x: p.x + rt.x * 2, z: p.z + rt.z * 2 });
    circle(a.x, a.y, 0.5 * scale, '#127f77');
    line(a.x, a.y, fp.x, fp.y, '#137a77', 3);
    line(a.x, a.y, rp.x, rp.y, '#de914f', 3);
    textAt('전후', fp.x + 6, fp.y, '#116963');
    textAt('좌우', rp.x + 5, rp.y, '#985b30');
    textAt('수평면 · 카메라 기준으로 회전한 화면', 16, 24);
    textAt(
        target ? '마커 = 이동 = 카메라: ' + target : '자유 이동 · 카메라 방향을 돌려 보세요',
        16,
        46,
        '#17766d',
        13,
    );
    $('readout').textContent =
        `대상 ${target ?? '없음'} · ${reason} · 전환 ${switches}회 · 거리 ${enemy ? dist(enemy).toFixed(1) + 'm' : '—'} · 가림 ${occluded.toFixed(2)} / ${value('grace').toFixed(1)}초 · 구도 ${checked('group') ? '크기 포함' : '중심만'}`;
}
function frame(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!info.open) update(dt);
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
    last = performance.now();
    syncMenu();
    resize.observe(canvas);
    resizeCanvas();
    raf = requestAnimationFrame(frame);
});
