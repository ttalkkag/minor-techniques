import { inspect, type Point, type Settings } from './model';
const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = el<HTMLCanvasElement>('canvas'),
    ctx = canvas.getContext('2d')!;
const val = (id: string) => Number(el<HTMLInputElement>(id).value),
    checked = (id: string) => el<HTMLInputElement>(id).checked;
const menu = el<HTMLButtonElement>('menu'),
    settings = el<HTMLElement>('settings'),
    dialog = el<HTMLDialogElement>('explanation');
const menuMedia = matchMedia('(max-width: 750px)');
const menuBackground = Array.from(document.querySelectorAll<HTMLElement>('.stage, .lab > header > a'));
function menuControls() {
    return Array.from(settings.querySelectorAll<HTMLElement>('button, input, select, a[href]'))
        .filter((control) => control.getClientRects().length && !control.hasAttribute('disabled'));
}
function syncMenu() {
    const modal = !settings.hidden && menuMedia.matches;
    for (const element of menuBackground) element.inert = modal;
    settings.setAttribute('role', modal ? 'dialog' : 'complementary');
    if (modal) settings.setAttribute('aria-modal', 'true');
    else settings.removeAttribute('aria-modal');
}
function trapMenu(event: KeyboardEvent) {
    if (dialog.open || settings.hidden || !menuMedia.matches || event.key !== 'Tab') return;
    const controls = menuControls(), first = controls[0], last = controls.at(-1);
    if (!first || !last) return;
    if (!settings.contains(document.activeElement) || (event.shiftKey ? document.activeElement === first : document.activeElement === last)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
    }
}
menuMedia.addEventListener('change', () => {
    syncMenu();
    if (!settings.hidden && menuMedia.matches && !dialog.open) menuControls()[0]?.focus();
});
function setMenu(open: boolean, focus = true) {
    settings.hidden = !open;
    menu.setAttribute('aria-expanded', String(open));
    syncMenu();
    if (focus) (open ? menuControls()[0] : menu)?.focus();
}
setMenu(!menuMedia.matches, false);
menu.addEventListener('click', () => setMenu(Boolean(settings.hidden)));
el('close-menu').addEventListener('click', () => setMenu(false));
el('explain').addEventListener('click', () => dialog.showModal());
el('close-dialog').addEventListener('click', () => dialog.close());
const onKey = (e: KeyboardEvent) => {
    if (dialog.open) return;
    if (e.key === 'Escape' && !settings.hidden) {
        e.preventDefault();
        setMenu(false);
    }
    trapMenu(e);
};
document.addEventListener('keydown', onKey);
let width = 0,
    height = 0,
    origin: Point = { x: -7, y: 0 },
    time = 0,
    lastSeen = -Infinity;
const fixed: Point[] = [
    { x: -3, y: -3.5 },
    { x: 7.5, y: 4 },
    { x: -6, y: 4.3 },
    { x: 3, y: -2.4 },
    { x: 8.5, y: -4.5 },
];
let unit = 1,
    offsetX = 0,
    offsetY = 0;
function render() {
    if (width <= 34 || height <= 70) return;
    const units: Record<string, string> = {
        heading: '°',
        fov: '°',
        range: ' m',
        'target-x': ' m',
        'target-y': ' m',
        'wall-end': ' m',
        memory: '초',
    };
    for (const [id, suffix] of Object.entries(units)) el(`${id}-out`).textContent = `${val(id)}${suffix}`;
    const s: Settings = {
        origin,
        heading: val('heading'),
        fov: val('fov'),
        range: val('range'),
        normalize: checked('normalize'),
        occlusion: checked('occlusion'),
        samples: val('samples'),
        wall: { x0: 0.8, x1: 1.2, y0: -4.5, y1: val('wall-end') },
    };
    const target = { x: val('target-x'), y: val('target-y') },
        targets = [target, ...fixed],
        results = targets.map((t) => inspect(t, s)),
        main = results[0]!;
    if (main.visible) lastSeen = time;
    const remembered =
        !main.visible && Number.isFinite(lastSeen) && time - lastSeen <= val('memory') && val('memory') > 0;
    el('memory-state').textContent = main.visible
        ? '현재 발견'
        : remembered
          ? `기억 중 · ${(val('memory') - (time - lastSeen)).toFixed(1)}초 남음`
          : '미발견';
    el('time').textContent = `${time.toFixed(1)}초`;
    el('pipeline').textContent =
        `${targets.length} → ${results.filter((r) => r.inRange).length} → ${results.filter((r) => r.inRange && r.inAngle).length} → ${results.filter((r) => r.visible).length}`;
    el('dot-value').textContent = `${main.value.toFixed(3)} / ${main.threshold.toFixed(3)}`;
    const rayCount = results.reduce((n, r) => n + r.rays.length, 0);
    el('ray-count').textContent = `${rayCount}회`;
    const first = el<HTMLSelectElement>('query').value === 'first';
    const reason = main.originBlocked
        ? '관측자가 벽 내부입니다. 내부 시작점을 안전한 시야로 간주하지 않습니다.'
        : main.same
          ? '관측자와 표적이 같은 위치입니다. 방향 없이 발견하는 정책입니다.'
          : !main.inRange
            ? '주 표적은 거리 한도 밖입니다.'
            : !main.inAngle
              ? '주 표적은 각도 단계에서 탈락했습니다.'
              : !s.occlusion
                ? '차폐 검사가 꺼져 벽 뒤 표적도 발견됩니다.'
                : main.visible
                  ? `주 표적 ${s.samples}개 표본 중 ${main.exposed}개가 노출되었습니다. ${first ? '첫 충돌이 표적입니다.' : '해당 광선에 벽 충돌이 없습니다.'}`
                  : `주 표적의 모든 광선이 벽에서 막혔습니다. ${first ? '첫 충돌이 벽입니다.' : '벽 충돌이 존재합니다.'}`;
    el('summary').textContent =
        `${reason} 거리 ${main.distance.toFixed(2)} m. ${!s.normalize ? '방향 정규화가 꺼져 내적에 거리가 섞여 있습니다.' : '거리와 각도는 표적 중심으로 판정합니다.'}`;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#f6faf9';
    ctx.fillRect(0, 0, width, height);
    unit = Math.min((width - 34) / 20, (height - 70) / 13);
    offsetX = width / 2;
    offsetY = height / 2 + 8;
    const pos = (p: Point): [number, number] => [offsetX + p.x * unit, offsetY - p.y * unit];
    const line = (a: Point, b: Point, color: string, size = 1) => {
        ctx.beginPath();
        ctx.moveTo(...pos(a));
        ctx.lineTo(...pos(b));
        ctx.strokeStyle = color;
        ctx.lineWidth = size;
        ctx.stroke();
    };
    for (let x = -10; x <= 10; x++) line({ x, y: -6 }, { x, y: 6 }, '#deebe8');
    for (let y = -6; y <= 6; y++) line({ x: -10, y }, { x: 10, y }, '#deebe8');
    const [ox, oy] = pos(origin),
        a = (-s.heading * Math.PI) / 180,
        half = (s.fov * Math.PI) / 360;
    ctx.save();
    ctx.beginPath();
    ctx.rect(offsetX - 10 * unit, offsetY - 6 * unit, 20 * unit, 12 * unit);
    ctx.clip();
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.arc(ox, oy, s.range * unit, a - half, a + half);
    ctx.closePath();
    ctx.fillStyle = '#42a89918';
    ctx.fill();
    ctx.strokeStyle = '#2b92857a';
    ctx.setLineDash([5, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    const [wx, wy] = pos({ x: s.wall.x0, y: s.wall.y1 });
    ctx.fillStyle = s.occlusion ? '#50656d' : '#b5c4c6';
    ctx.fillRect(wx, wy, (s.wall.x1 - s.wall.x0) * unit, (s.wall.y1 - s.wall.y0) * unit);
    for (let i = 0; i < targets.length; i++) {
        const t = targets[i]!,
            r = results[i]!;
        for (const ray of r.rays) {
            const end =
                ray.hit === null
                    ? ray.point
                    : {
                          x: origin.x + (ray.point.x - origin.x) * ray.hit,
                          y: origin.y + (ray.point.y - origin.y) * ray.hit,
                      };
            line(origin, end, ray.hit === null ? '#178272aa' : '#c55745aa', i === 0 ? 2 : 1);
            if (ray.hit !== null) {
                ctx.setLineDash([3, 4]);
                line(end, ray.point, '#b8c5c5');
                ctx.setLineDash([]);
            }
            if (i === 0) {
                const p = pos(ray.point);
                ctx.beginPath();
                ctx.arc(...p, 3.5, 0, Math.PI * 2);
                ctx.fillStyle = ray.hit === null ? '#178272' : '#c55745';
                ctx.fill();
            }
        }
        const [x, y] = pos(t);
        ctx.beginPath();
        ctx.arc(x, y, i === 0 ? 8 : 6, 0, Math.PI * 2);
        ctx.fillStyle = i === 0 ? '#d77941' : r.visible ? '#198778' : '#8ca1a8';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        if (i === 0 && remembered) {
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.arc(x, y, 14, 0, Math.PI * 2);
            ctx.strokeStyle = '#cf7a42';
            ctx.stroke();
            ctx.setLineDash([]);
        }
        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#2e4b51';
        ctx.textAlign = 'center';
        ctx.fillText(i === 0 ? '주 표적' : `${i}`, x, y - 12);
    }
    ctx.beginPath();
    ctx.arc(ox, oy, 9, 0, 2 * Math.PI);
    ctx.fillStyle = '#106f6a';
    ctx.fill();
    line(origin, { x: origin.x + Math.cos(-a) * 1.3, y: origin.y + Math.sin(-a) * 1.3 }, '#075d59', 3);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#4c6970';
    ctx.font = '12px sans-serif';
    ctx.fillText('위에서 본 2D 공간 · 격자 1 m', 16, 25);
    ctx.fillText(`광선: ${first ? '첫 충돌 검사' : '벽 전용 검사'} · 시간은 수동 진행`, 16, height - 17);
}
function resize() {
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    const dpr = Math.min(devicePixelRatio, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    render();
}
for (const id of [
    'heading',
    'fov',
    'range',
    'normalize',
    'occlusion',
    'samples',
    'query',
    'target-x',
    'target-y',
    'wall-end',
    'memory',
])
    el(id).addEventListener('input', render);
function reset() {
    for (const [id, v] of Object.entries({
        heading: '0',
        fov: '90',
        range: '15',
        samples: '1',
        query: 'wall',
        'target-x': '5',
        'target-y': '0',
        'wall-end': '0.4',
        memory: '2',
    }))
        el<HTMLInputElement>(id).value = v;
    el<HTMLInputElement>('normalize').checked = true;
    el<HTMLInputElement>('occlusion').checked = true;
    origin = { x: -7, y: 0 };
    time = 0;
    lastSeen = -Infinity;
    render();
}
el('reset').addEventListener('click', reset);
el('counterexample').addEventListener('click', () => {
    reset();
    el<HTMLInputElement>('target-x').value = '-4';
    el<HTMLInputElement>('target-y').value = '4';
    render();
});
el('inside-wall').addEventListener('click', () => {
    origin = { x: 1, y: -1 };
    render();
});
el('same-position').addEventListener('click', () => {
    el<HTMLInputElement>('target-x').value = String(origin.x);
    el<HTMLInputElement>('target-y').value = String(origin.y);
    render();
});
el('tick').addEventListener('click', () => {
    time += 0.5;
    render();
});
canvas.addEventListener('pointerdown', (e) => {
    const r = canvas.getBoundingClientRect();
    el<HTMLInputElement>('target-x').value = String(
        Math.max(-8, Math.min(9, (e.clientX - r.left - offsetX) / unit)),
    );
    el<HTMLInputElement>('target-y').value = String(
        Math.max(-5, Math.min(5, -(e.clientY - r.top - offsetY) / unit)),
    );
    render();
});
const observer = new ResizeObserver(resize);
observer.observe(canvas.parentElement!);
window.addEventListener('pagehide', (event) => {
    observer.disconnect();
    if (!event.persisted) document.removeEventListener('keydown', onKey);
});
window.addEventListener('pageshow', () => {
    observer.observe(canvas.parentElement!);
    syncMenu();
    resize();
});
resize();

for (const id of ['samples', 'query']) el(id).addEventListener('change', render);
