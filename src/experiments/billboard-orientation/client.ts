import { add, sub, scale, dot, basis, camera, type V3, type Basis } from './model';
const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = el<HTMLCanvasElement>('canvas'),
    ctx = canvas.getContext('2d')!;
const controls = ['azimuth', 'elevation', 'observer-azimuth', 'observer-elevation'];
const value = (id: string) => Number(el<HTMLInputElement>(id).value);
const select = (id: string) => el<HTMLSelectElement>(id).value;
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
let last: V3[] = [
        [0, 0, 1],
        [0, 0, 1],
        [0, 0, 1],
    ],
    width = 0,
    height = 0;
const positions: V3[] = [
    [-2.5, 1.5, -0.5],
    [0, 1.5, 0],
    [2.5, 1.5, -1],
];
function render() {
    for (const id of controls) el(`${id}-out`).textContent = `${value(id)}°`;
    el('observer-controls').hidden = select('observer') !== 'external';
    const cam = camera(value('azimuth'), value('elevation')),
        external = select('observer') === 'external';
    const view = external ? camera(value('observer-azimuth'), value('observer-elevation')) : cam;
    const ortho = select('projection') === 'ortho',
        preserve = el<HTMLInputElement>('preserve').checked;
    const vertical = width < 620,
        panels = vertical ? 1 : 3,
        rows = vertical ? 3 : 1,
        pw = width / panels,
        ph = height / rows;
    ctx.clearRect(0, 0, width, height);
    const modes = ['screen', 'point', 'axis'] as const,
        labels = ['화면 평행', '개별 시점 지향', '세로축 고정'];
    let central!: Basis;
    modes.forEach((mode, i) => {
        const ox = vertical ? 0 : i * pw,
            oy = vertical ? i * ph : 0;
        ctx.save();
        ctx.beginPath();
        ctx.rect(ox + 1, oy + 1, pw - 2, ph - 2);
        ctx.clip();
        ctx.fillStyle = i === 1 ? '#f0f7f5' : '#f8fbfb';
        ctx.fillRect(ox, oy, pw, ph);
        const factor = Math.min(pw / 8.7, (ph - 76) / 6.5);
        const project = (p: V3): [number, number] => {
            const d = sub(p, view.position),
                z = -dot(d, view.normal),
                q = ortho ? 1 : 10 / Math.max(1, z);
            return [
                ox + pw / 2 + dot(d, view.right) * factor * q,
                oy + ph * 0.56 - dot(d, view.up) * factor * q,
            ];
        };
        const line = (a: V3, b: V3, color: string, thickness = 1) => {
            const p = project(a),
                q = project(b);
            ctx.beginPath();
            ctx.moveTo(...p);
            ctx.lineTo(...q);
            ctx.strokeStyle = color;
            ctx.lineWidth = thickness;
            ctx.stroke();
        };
        for (let j = -4; j <= 4; j++) {
            line([j, 0, -4], [j, 0, 4], '#d6e3e1');
            line([-4, 0, j], [4, 0, j], '#d6e3e1');
        }
        const prepared = positions
            .map((p, index) => {
                const virtualCam =
                    ortho && mode !== 'screen' ? { ...cam, position: add(p, scale(cam.normal, 10)) } : cam;
                const b = basis(mode, p, virtualCam, preserve, last[index]);
                if (mode === 'axis' && !b.degenerate) last[index] = b.normal;
                if (mode === 'axis' && index === 1) central = b;
                return { p, b, index, depth: -dot(sub(p, view.position), view.normal) };
            })
            .sort((a, b) => b.depth - a.depth);
        for (const { p, b, index } of prepared) {
            line(add(p, [0, -1.5, 0]), add(p, [0, 2, 0]), '#9aaeb1', 1);
            if (!b.valid) {
                const [x, y] = project(p);
                ctx.fillStyle = '#a84132';
                ctx.font = '12px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('기저 없음', x, y);
                continue;
            }
            const local = (x: number, y: number) => add(p, add(scale(b.right, x), scale(b.up, y)));
            const poly = (points: [number, number][], fill: string, stroke?: string) => {
                ctx.beginPath();
                points.forEach(([x, y], j) => {
                    const pt = project(local(x, y));
                    j ? ctx.lineTo(...pt) : ctx.moveTo(...pt);
                });
                ctx.closePath();
                ctx.fillStyle = fill;
                ctx.fill();
                if (stroke) {
                    ctx.strokeStyle = stroke;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            };
            poly(
                [
                    [-0.95, -1.5],
                    [0.95, -1.5],
                    [0.95, 1.5],
                    [-0.95, 1.5],
                ],
                '#daece955',
                '#8dbeb5',
            );
            poly(
                [
                    [-0.12, -1.5],
                    [0.12, -1.5],
                    [0.12, -0.4],
                    [-0.12, -0.4],
                ],
                '#a36942',
            );
            poly(
                [
                    [-0.85, -0.65],
                    [0.85, -0.65],
                    [0.5, -0.05],
                    [0.72, -0.05],
                    [0.32, 0.65],
                    [0.48, 0.65],
                    [0, 1.5],
                    [-0.48, 0.65],
                    [-0.32, 0.65],
                    [-0.72, -0.05],
                    [-0.5, -0.05],
                ],
                index === 1 ? '#147c73' : '#63a596',
            );
            line(p, add(p, scale(b.normal, 1.7)), '#0d666a', 2.5);
            line(p, add(p, scale(b.up, 1.9)), '#cc703e', 2);
        }
        ctx.textAlign = 'left';
        ctx.fillStyle = '#243f46';
        ctx.font = 'bold 15px sans-serif';
        ctx.fillText(labels[i]!, ox + 17, oy + 29);
        const b = prepared.find((p) => p.index === 1)!.b;
        const tilt = (Math.acos(Math.max(-1, Math.min(1, b.up[1]))) * 180) / Math.PI;
        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#536f76';
        ctx.fillText(`중앙 평면 세로축 기울기 ${tilt.toFixed(0)}°`, ox + 17, oy + 50);
        ctx.fillText(
            b.degenerate ? (preserve ? '퇴화 → 대체 기저' : '퇴화 → 정렬 실패') : '유효한 기저',
            ox + 17,
            oy + ph - 19,
        );
        ctx.strokeStyle = '#ccdbdc';
        ctx.strokeRect(ox + 0.5, oy + 0.5, pw - 1, ph - 1);
        ctx.restore();
    });
    const ratio = Math.abs(dot(central.normal, cam.normal));
    el('angle').textContent = `${value('elevation')}°`;
    el('area').textContent = central.valid ? `${(ratio * 100).toFixed(1)}%` : '계산 불가';
    el('basis-state').textContent = central.degenerate ? (preserve ? '직전 방향 유지' : '정렬 실패') : '유효';
    el('summary').textContent = central.degenerate
        ? `중앙 나무는 정확히 상공입니다. ${preserve ? '세로축 고정 방향을 유지해도 정면 비율은 0%입니다. 기저 안정화와 평면의 얇아짐은 별개입니다.' : '정규화할 수평 방향이 없어 중앙 평면을 그릴 수 없습니다. 퇴화 처리를 켜서 비교하세요.'}`
        : `세로축 고정은 나무를 수직으로 세우지만, 상승 ${value('elevation')}°에서 정면 비율이 ${(ratio * 100).toFixed(1)}%가 됩니다. ${external ? '외부 관찰 카메라에서 정렬 결과를 보고 있습니다.' : '외부 관찰로 바꾸면 평면이 기울어지는 방향을 볼 수 있습니다.'}`;
}
function resize() {
    const rect = canvas.parentElement!.getBoundingClientRect();
    canvas.parentElement!.style.minHeight = rect.width < 620 ? '690px' : '410px';
    const updated = canvas.parentElement!.getBoundingClientRect();
    width = updated.width;
    height = updated.height;
    const dpr = Math.min(devicePixelRatio, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    render();
}
for (const id of [...controls, 'projection', 'observer', 'preserve'])
    el(id).addEventListener('input', render);
el('overhead').addEventListener('click', () => {
    el<HTMLInputElement>('elevation').value = '90';
    render();
});
el('reset').addEventListener('click', () => {
    for (const [id, v] of Object.entries({
        azimuth: '25',
        elevation: '25',
        'observer-azimuth': '45',
        'observer-elevation': '30',
        projection: 'perspective',
        observer: 'player',
    }))
        el<HTMLInputElement>(id).value = v;
    el<HTMLInputElement>('preserve').checked = true;
    last = [
        [0, 0, 1],
        [0, 0, 1],
        [0, 0, 1],
    ];
    render();
});
let resizeFrame = 0;
const observer = new ResizeObserver(() => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(resize);
});
observer.observe(canvas.parentElement!);
window.addEventListener('pagehide', (event) => {
    cancelAnimationFrame(resizeFrame);
    observer.disconnect();
    if (!event.persisted) document.removeEventListener('keydown', onKey);
});
window.addEventListener('pageshow', () => {
    observer.observe(canvas.parentElement!);
    syncMenu();
    resize();
});
resize();

for (const id of ['projection', 'observer']) el(id).addEventListener('change', render);
