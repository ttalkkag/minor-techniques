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
import { clearSight, landmarkProjection, type Point } from './model';
const base: Record<string, Point> = {
    S: { x: 15, y: 85 },
    F: { x: 30, y: 70 },
    A: { x: 22, y: 30 },
    B: { x: 76, y: 72 },
    C: { x: 78, y: 30 },
    G: { x: 83, y: 12 },
};
const names: Record<string, string> = {
    S: '시작',
    F: '갈림길',
    A: 'A · 정원',
    B: 'B · 전망길',
    C: '합류·문',
    G: '목표 탑',
};
const edges: Record<string, string[]> = {
    S: ['F'],
    F: ['A', 'B', 'S'],
    A: ['C', 'F'],
    B: ['C', 'F'],
    C: ['G', 'A', 'B'],
    G: ['C'],
};
let node = 'S',
    position = { ...base.S },
    travel: { from: Point; to: Point; id: string; length: number; done: number } | null = null,
    key = false,
    distance = 0,
    elapsed = 0,
    first: number | null = null,
    visited = new Set(['S']),
    trail: Point[] = [{ ...base.S }],
    message = '갈림길로 출발하세요.',
    heading = -Math.PI / 4,
    raf = 0,
    last = performance.now();
function points() {
    return choice('route') === 'long' ? { ...base, A: { x: 8, y: 22 }, B: { x: 92, y: 82 } } : base;
}
function visible() {
    return !checked('occlusion') || clearSight(position, base.G, { x: 50, y: 48 }, 18);
}
function restart() {
    node = 'S';
    position = { ...base.S };
    travel = null;
    key = false;
    distance = 0;
    elapsed = 0;
    first = null;
    visited = new Set(['S']);
    trail = [{ ...base.S }];
    message = '갈림길로 출발하세요.';
    heading = -Math.PI / 4;
    buttons();
}
function buttons() {
    const box = $('choices');
    box.replaceChildren();
    if (travel) {
        const p = document.createElement('span');
        p.textContent = '다음 지점까지 이동 중…';
        box.append(p);
        return;
    }
    for (const id of edges[node]) {
        const b = document.createElement('button');
        b.textContent = checked('guidance') ? names[id] + ' →' : `경로 ${id} →`;
        b.onclick = () => {
            if (id === 'G' && !key) {
                message = '문이 잠겼습니다. A 분기로 돌아가 열쇠를 찾아야 합니다.';
                return;
            }
            const to = points()[id],
                length = Math.hypot(to.x - position.x, to.y - position.y);
            travel = { from: { ...position }, to: { ...to }, id, length, done: 0 };
            heading = Math.atan2(to.y - position.y, to.x - position.x);
            message = names[id] + '로 이동 중';
            buttons();
        };
        box.append(b);
    }
}
$('reset').onclick = () => {
    restoreControls();
    restart();
};
$('return').onclick = restart;
$<HTMLSelectElement>('route').onchange = restart;
$<HTMLSelectElement>('keyRule').onchange = restart;
$<HTMLInputElement>('guidance').onchange = buttons;
function update(dt: number) {
    if (travel) {
        const step = Math.min(travel.length - travel.done, value('speed') * dt);
        travel.done += step;
        distance += step;
        elapsed += step / value('speed');
        const t = travel.done / travel.length;
        position = {
            x: travel.from.x + (travel.to.x - travel.from.x) * t,
            y: travel.from.y + (travel.to.y - travel.from.y) * t,
        };
        if (
            trail.length === 0 ||
            Math.hypot(position.x - trail[trail.length - 1].x, position.y - trail[trail.length - 1].y) > 0.7
        )
            trail.push({ ...position });
        if (t >= 1) {
            node = travel.id;
            visited.add(node);
            travel = null;
            if (node === 'A' || (node === 'B' && choice('keyRule') === 'both')) {
                key = true;
                message = '열쇠를 얻었습니다. 합류점의 문을 열 수 있습니다.';
            } else
                message =
                    node === 'G'
                        ? '목표 도착! 이동거리와 발견 시점을 비교하세요.'
                        : node === 'C' && !key
                          ? '합류했지만 열쇠가 없습니다. 문 앞에서 진행이 막힙니다.'
                          : names[node] + ' 도착';
            buttons();
        }
    }
    if (first === null && visible() && landmarkProjection(position, base.G, heading, W).onScreen)
        first = distance;
}
function draw() {
    ctx.clearRect(0, 0, W, H);
    const top = H * 0.57,
        size = Math.min(W - 48, top - 40),
        ox = (W - size) / 2,
        oy = 27,
        s = size / 100,
        sx = (x: number) => ox + x * s,
        sy = (y: number) => oy + y * s;
    ctx.fillStyle = '#e2ece3';
    ctx.fillRect(0, 0, W, top);
    ctx.strokeStyle = '#b9cdbe';
    ctx.strokeRect(ox, oy, size, size);
    const pts = points();
    for (const [id, targets] of Object.entries(edges)) {
        for (const to of targets) {
            if (id > to || (!checked('map') && !visited.has(id) && node !== to)) continue;
            line(sx(pts[id].x), sy(pts[id].y), sx(pts[to].x), sy(pts[to].y), '#afc2b0', 9);
        }
    }
    circle(sx(50), sy(48), 18 * s, checked('occlusion') ? '#91a58a' : '#c6d6c1');
    textAt('산', sx(48), sy(49), '#425a40');
    ctx.strokeStyle = '#de8d49';
    ctx.lineWidth = 3;
    ctx.beginPath();
    trail.forEach((p, i) => (i ? ctx.lineTo(sx(p.x), sy(p.y)) : ctx.moveTo(sx(p.x), sy(p.y))));
    ctx.stroke();
    for (const [id, p] of Object.entries(pts)) {
        if (!checked('map') && !visited.has(id) && !edges[node].includes(id)) continue;
        circle(
            sx(p.x),
            sy(p.y),
            id === 'G' ? 8 : 5,
            id === 'G' ? '#d48649' : visited.has(id) ? '#287f71' : '#f9fbf3',
        );
        if (checked('guidance')) textAt(names[id], sx(p.x) + 7, sy(p.y) - 5, '#496359', 11);
        if ((id === 'A' || (id === 'B' && choice('keyRule') === 'both')) && !visited.has(id))
            textAt('⚿', sx(p.x) - 8, sy(p.y) + 18, '#995d20', 17);
    }
    circle(sx(position.x), sy(position.y), 7, '#137c77');
    line(
        sx(position.x),
        sy(position.y),
        sx(position.x + Math.cos(heading) * 6),
        sy(position.y + Math.sin(heading) * 6),
        '#163f42',
        2,
    );
    textAt('100 × 100 m · ' + (checked('map') ? '전체 경로와 이동 기록' : '탐색한 경로와 이웃만'), 14, 20);
    const vh = H - top;
    ctx.fillStyle = '#d9ebeb';
    ctx.fillRect(0, top, W, vh * 0.56);
    ctx.fillStyle = '#c5d9bf';
    ctx.fillRect(0, top + vh * 0.56, W, vh * 0.44);
    const projection = landmarkProjection(position, base.G, heading, W),
        tx = projection.x,
        dist = Math.hypot(base.G.x - position.x, base.G.y - position.y),
        h = Math.min(vh * 0.75, 700 / Math.max(6, dist));
    const mountainAngle = Math.atan2(48 - position.y, 50 - position.x) - heading,
        mx = W / 2 + Math.sin(mountainAngle) * W * 0.7;
    if (checked('occlusion')) {
        ctx.fillStyle = '#829c85';
        ctx.beginPath();
        ctx.moveTo(mx - W * 0.25, top + vh * 0.6);
        ctx.lineTo(mx, top + vh * 0.12);
        ctx.lineTo(mx + W * 0.25, top + vh * 0.6);
        ctx.fill();
    }
    if (visible() && projection.onScreen) {
        ctx.fillStyle = '#cf894d';
        ctx.fillRect(tx - 9, top + vh * 0.57 - h, 18, h);
        ctx.beginPath();
        ctx.moveTo(tx - 17, top + vh * 0.57 - h);
        ctx.lineTo(tx, top + vh * 0.57 - h - 18);
        ctx.lineTo(tx + 17, top + vh * 0.57 - h);
        ctx.fill();
    }
    ctx.fillStyle = '#f8fbf0e6';
    ctx.fillRect(10, top + 8, W - 20, 29);
    textAt(
        !visible()
            ? '산이 목표 탑으로 가는 시선을 가립니다'
            : projection.onScreen
              ? '목표 탑이 화면에 보입니다'
              : '산 가림 없음 · 목표 탑은 화면 밖입니다',
        20,
        top + 27,
    );
    if (checked('guidance'))
        textAt('↑ ' + (travel ? names[travel.id] : names[node]), W / 2 - 35, H - 18, '#385e4d', 15);
    $('readout').textContent =
        `${distance.toFixed(1)}m · ${elapsed.toFixed(1)}초 · 최초 화면 노출 ${first === null ? '아직 없음' : first.toFixed(1) + 'm'} · 열쇠 ${key ? '있음' : '없음'} · ${message}`;
}
buttons();
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
