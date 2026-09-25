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
import { analytic, fabrik, distance, type Point } from './model';
const number = (id: string) => Number($<HTMLInputElement>(id).value);
const root = { x: 0, y: 0 };
let origin = { x: 0, y: 0 },
    scale = 180,
    dragging = false;
const groundHeight = (x: number) => (x < -0.35 ? 0.98 : x < 0.2 ? 0.78 : x < 0.65 ? 0.57 : 0.36);
function setup() {
    for (const id of ['l1', 'l2', 'tx', 'ty']) $(`${id}-value`).textContent = `${number(id).toFixed(2)} m`;
    $('iterations-value').textContent = `${number('iterations')} 회`;
    $('weight-value').textContent = `${number('weight')} %`;
    draw();
}
function draw() {
    ctx.clearRect(0, 0, width, height);
    scale = Math.min(width / 3.2, (height - 50) / 2.1);
    origin = { x: width * 0.5, y: height * 0.29 };
    let target: Point = { x: number('tx'), y: number('ty') };
    if ($<HTMLInputElement>('ground').checked) {
        target.y = groundHeight(target.x);
        $<HTMLInputElement>('ty').value = String(target.y);
        $('ty-value').textContent = `${target.y.toFixed(2)} m`;
    }
    const l1 = number('l1'),
        l2 = number('l2'),
        pole = number('pole');
    const result =
        $<HTMLSelectElement>('solver').value === 'analytic'
            ? analytic(root, target, l1, l2, pole)
            : fabrik(root, target, l1, l2, pole, number('iterations'));
    const weight = number('weight') / 100,
        a1 = Math.atan2(result.knee.y, result.knee.x),
        a2 = Math.atan2(result.foot.y - result.knee.y, result.foot.x - result.knee.x);
    const mix = (angle: number) =>
        Math.PI / 2 + Math.atan2(Math.sin(angle - Math.PI / 2), Math.cos(angle - Math.PI / 2)) * weight;
    const knee = { x: Math.cos(mix(a1)) * l1, y: Math.sin(mix(a1)) * l1 };
    const foot = { x: knee.x + Math.cos(mix(a2)) * l2, y: knee.y + Math.sin(mix(a2)) * l2 };
    const point = (p: Point) => ({ x: origin.x + p.x * scale, y: origin.y + p.y * scale });
    ctx.save();
    ctx.translate(origin.x, origin.y);
    ctx.strokeStyle = '#c5d3d7';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    for (const radius of [Math.abs(l1 - l2), l1 + l2]) {
        ctx.beginPath();
        ctx.arc(0, 0, radius * scale, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();
    ctx.fillStyle = '#dde5e6';
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = -1.6; x <= 1.6; x += 0.01)
        ctx.lineTo(origin.x + x * scale, origin.y + groundHeight(x) * scale);
    ctx.lineTo(width, height);
    ctx.fill();
    const drawBone = (points: Point[], color: string, lineWidth: number) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.beginPath();
        points.forEach((p, i) => {
            const s = point(p);
            if (i === 0) ctx.moveTo(s.x, s.y);
            else ctx.lineTo(s.x, s.y);
        });
        ctx.stroke();
    };
    drawBone([root, { x: 0, y: l1 }, { x: 0, y: l1 + l2 }], '#c1cdd2', 7);
    if (weight < 1) drawBone([root, result.knee, result.foot], '#7fb7ad', 3);
    drawBone([root, knee, foot], '#177e73', 10);
    for (const p of [root, knee, foot]) {
        const s = point(p);
        ctx.beginPath();
        ctx.arc(s.x, s.y, 7, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = '#177e73';
        ctx.lineWidth = 3;
        ctx.stroke();
    }
    const t = point(target),
        f = point(foot);
    ctx.strokeStyle = '#c86d36';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(t.x, t.y);
    ctx.lineTo(f.x, f.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(t.x, t.y, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(t.x - 16, t.y);
    ctx.lineTo(t.x + 16, t.y);
    ctx.moveTo(t.x, t.y - 16);
    ctx.lineTo(t.x, t.y + 16);
    ctx.stroke();
    text('고정된 골반', 16, 26, '#53626d', 13);
    text('2D · 뼈 길이 유지', 16, height - 16, '#53626d', 12);
    $('reach-result').textContent =
        `${Math.abs(l1 - l2).toFixed(2)}–${(l1 + l2).toFixed(2)} m / ${distance(root, target).toFixed(2)} m`;
    $('error-result').textContent =
        `${(distance(foot, target) * 1000).toFixed(1)} / ${(result.error * 1000).toFixed(1)} mm`;
    $('log').textContent =
        `${result.clamped ? '도달 범위 밖 → 목표 제한' : result.error > 0.001 ? '반복 풀이의 잔여 오차' : '목표 도달'} · 실제 뼈 길이 ${distance(root, knee).toFixed(3)} / ${distance(knee, foot).toFixed(3)} m`;
}
function targetAt(x: number, y: number) {
    $<HTMLInputElement>('tx').value = String(Math.max(-1.2, Math.min(1.2, (x - origin.x) / scale)));
    $<HTMLInputElement>('ty').value = String(Math.max(-0.5, Math.min(1.3, (y - origin.y) / scale)));
    setup();
}
canvas.onpointerdown = (e) => {
    dragging = true;
    canvas.setPointerCapture(e.pointerId);
    const r = canvas.getBoundingClientRect();
    targetAt(e.clientX - r.left, e.clientY - r.top);
};
canvas.onpointermove = (e) => {
    if (dragging) {
        const r = canvas.getBoundingClientRect();
        targetAt(e.clientX - r.left, e.clientY - r.top);
    }
};
canvas.onpointerup = () => (dragging = false);
canvas.onpointercancel = () => (dragging = false);
document.addEventListener('keydown', (e) => {
    if (
        dialog.open || !settings.hidden ||
        ['INPUT', 'SELECT'].includes((e.target as HTMLElement).tagName) ||
        !e.key.startsWith('Arrow')
    )
        return;
    e.preventDefault();
    const id = e.key === 'ArrowLeft' || e.key === 'ArrowRight' ? 'tx' : 'ty';
    $<HTMLInputElement>(id).value = String(
        number(id) + (e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -0.03 : 0.03),
    );
    setup();
});
for (const id of ['solver', 'l1', 'l2', 'tx', 'ty', 'pole', 'iterations', 'weight', 'ground'])
    $(id).oninput = setup;
$('near').onclick = () => {
    $<HTMLInputElement>('ground').checked = false;
    $<HTMLInputElement>('tx').value = '0';
    $<HTMLInputElement>('ty').value = '0.02';
    setup();
};
$('far').onclick = () => {
    $<HTMLInputElement>('ground').checked = false;
    $<HTMLInputElement>('tx').value = '1.15';
    $<HTMLInputElement>('ty').value = '1.15';
    setup();
};
$('flip').onclick = () => {
    $<HTMLSelectElement>('pole').value = String(-number('pole'));
    setup();
};
$('reset').onclick = () => {
    for (const [id, value] of Object.entries({
        l1: '.5',
        l2: '.4',
        tx: '.35',
        ty: '.65',
        pole: '1',
        iterations: '4',
        weight: '100',
        solver: 'analytic',
    }))
        $<HTMLInputElement>(id).value = value;
    $<HTMLInputElement>('ground').checked = false;
    setup();
};
setup();

window.addEventListener('pagehide', (event) => {
    dragging = false;
    if (!event.persisted) observer.disconnect();
});
window.addEventListener('pageshow', (event) => {
    if (event.persisted) resize();
});
