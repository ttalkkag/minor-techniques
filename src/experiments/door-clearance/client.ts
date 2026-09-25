const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const value = (id: string) => Number($<HTMLInputElement>(id).value);
const checked = (id: string) => $<HTMLInputElement>(id).checked;
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
import { walls, blocked, cameraFraction, type Wall } from './model';
let px = 0.65,
    pz = -3,
    cx = 1.45,
    cz = -6,
    collision = false,
    passed = false,
    actual = 3,
    raf = 0,
    last = performance.now();
function reset() {
    restoreControls();
    px = 0.65;
    pz = -3;
    passed = false;
    collision = false;
}
$('reset').onclick = reset;
$('center').onclick = () => {
    px = 0;
};
function update(dt: number) {
    const g = walls(value('width')),
        r = value('radius');
    let ix =
        Number(keys.has('ArrowRight') || keys.has('KeyD')) -
        Number(keys.has('ArrowLeft') || keys.has('KeyA'));
    let iz =
        Number(keys.has('ArrowUp') || keys.has('KeyW')) - Number(keys.has('ArrowDown') || keys.has('KeyS'));
    const norm = Math.max(1, Math.hypot(ix, iz));
    ix = (ix / norm) * 2.4 * dt;
    iz = (iz / norm) * 2.4 * dt;
    collision = false;
    if (!blocked(px + ix, pz, r, g)) px += ix;
    else if (ix) collision = true;
    if (!blocked(px, pz + iz, r, g)) pz += iz;
    else if (iz) collision = true;
    const dx = value('shoulder'),
        dz = -value('arm'),
        fraction = checked('collision') ? cameraFraction(px, pz, dx, dz, value('probe'), g) : 1;
    cx = px + dx * fraction;
    cz = pz + dz * fraction;
    actual = Math.hypot(dx, dz) * fraction;
    if (pz > 1) passed = true;
}
type V = { x: number; y: number; z: number };
function drawView(g: Wall[], top: number, height: number) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, top, W, height);
    ctx.clip();
    ctx.fillStyle = '#d9e9e9';
    ctx.fillRect(0, top, W, height / 2);
    ctx.fillStyle = '#c0d1c8';
    ctx.fillRect(0, top + height / 2, W, height / 2);
    const fx = (px - cx) / Math.max(0.001, actual),
        fz = (pz - cz) / Math.max(0.001, actual),
        focal = height / (2 * Math.tan((value('fov') * Math.PI) / 360));
    function local(x: number, y: number, z: number): V {
        return { x: (x - cx) * fz - (z - cz) * fx, y: y - 1.35, z: (x - cx) * fx + (z - cz) * fz };
    }
    function polygon(v: V[], color: string) {
        let out: V[] = [];
        for (let i = 0; i < v.length; i++) {
            const a = v[i],
                b = v[(i + 1) % v.length],
                inside = a.z > 0.08,
                next = b.z > 0.08;
            if (inside) out.push(a);
            if (inside !== next) {
                const t = (0.08 - a.z) / (b.z - a.z);
                out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: 0.08 });
            }
        }
        if (out.length < 3) return;
        ctx.fillStyle = color;
        ctx.strokeStyle = '#6f9090';
        ctx.lineWidth = 1;
        ctx.beginPath();
        out.forEach((p, i) => {
            const x = W / 2 + (p.x / p.z) * focal,
                y = top + height * 0.49 - (p.y / p.z) * focal;
            (i ? ctx.lineTo.bind(ctx) : ctx.moveTo.bind(ctx))(x, y);
        });
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }
    const faces: { v: V[]; color: string; d: number }[] = [];
    for (const b of g) {
        const corners = [
            [b.x, b.z],
            [b.x + b.w, b.z],
            [b.x + b.w, b.z + b.d],
            [b.x, b.z + b.d],
        ];
        for (let i = 0; i < 4; i++) {
            const a = corners[i],
                e = corners[(i + 1) % 4],
                v = [
                    local(a[0], 0, a[1]),
                    local(e[0], 0, e[1]),
                    local(e[0], 2.8, e[1]),
                    local(a[0], 2.8, a[1]),
                ];
            faces.push({ v, color: i % 2 ? '#95b4b0' : '#acc6c0', d: v.reduce((s, p) => s + p.z, 0) });
        }
    }
    faces.sort((a, b) => b.d - a.d).forEach((f) => polygon(f.v, f.color));
    const p = local(px, 0, pz),
        radius = (value('radius') * focal) / Math.max(0.1, p.z);
    if (p.z > 0.1) {
        ctx.fillStyle = '#167f76';
        const hh = (1.7 * focal) / p.z;
        ctx.fillRect(
            W / 2 + (p.x / p.z) * focal - radius,
            top + height * 0.49 + (1.35 * focal) / p.z - hh,
            radius * 2,
            hh,
        );
    }
    if (blocked(cx, cz, value('probe'), g)) {
        ctx.fillStyle = '#a64c3dcc';
        ctx.fillRect(0, top, W, height);
        textAt('카메라가 벽과 겹칩니다', 20, top + 55, 'white', 18);
    }
    ctx.fillStyle = '#f6faf5e8';
    ctx.fillRect(10, top + 8, Math.min(W - 20, 300), 28);
    textAt('카메라 원근 투영 · 수직 FOV ' + value('fov') + '°', 20, top + 27);
    ctx.restore();
}
function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#edf3ef';
    ctx.fillRect(0, 0, W, H);
    const g = walls(value('width')),
        mapH = H * 0.5,
        s = Math.min(W / 12, mapH / 15),
        ox = W / 2,
        oy = mapH / 2,
        sx = (x: number) => ox + x * s,
        sy = (z: number) => oy - z * s;
    for (const b of g) {
        ctx.fillStyle = '#78968f';
        ctx.fillRect(sx(b.x), sy(b.z + b.d), b.w * s, b.d * s);
    }
    ctx.setLineDash([4, 4]);
    line(sx(px), sy(pz), sx(px + value('shoulder')), sy(pz - value('arm')), '#b3a08a', 2);
    ctx.setLineDash([]);
    line(sx(px), sy(pz), sx(cx), sy(cz), '#dd904d', 2);
    circle(sx(cx), sy(cz), Math.max(3, value('probe') * s), '#d78b45');
    circle(sx(px), sy(pz), value('radius') * s, collision ? '#be5544' : '#197d73');
    textAt('이동체', sx(px) + 12, sy(pz) - 7);
    textAt('카메라', sx(cx) + 10, sy(cz) + 15, '#9a602e');
    textAt('상면 단면 · 주황 선 = 카메라 팔', 14, 22);
    drawView(g, mapH, H - mapH);
    line(0, mapH, W, mapH, '#fafbf9', 4);
    const clearance = value('width') - 2 * value('radius');
    const passage = clearance < -1e-10
        ? '중심 통과 위치 없음'
        : Math.abs(clearance) <= 1e-10
          ? '중심 통과 폭 0.00m (접촉 경계)'
          : `중심 통과 폭 ${clearance.toFixed(2)}m`;
    $('readout').textContent =
        `${passage} · ${collision ? '이동 충돌' : passed ? '문 통과 성공' : '문을 향해 이동'} · 카메라 거리 ${actual.toFixed(2)}m / 희망 ${Math.hypot(value('arm'), value('shoulder')).toFixed(2)}m · 프로브 검사 ${checked('collision') ? '켜짐' : '꺼짐'}`;
}
function frame(now: number) {
    const dt = Math.min(0.04, (now - last) / 1000);
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
