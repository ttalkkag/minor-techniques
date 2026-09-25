import { outline, volumeSamples, volumeBelow, levelForVolume, clipLiquid, oscillatorStep } from './model';
import type { Point, Shape } from './model';
const get = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = get<HTMLCanvasElement>('scene');
const ctx = canvas.getContext('2d')!;
const tilt = get<HTMLInputElement>('tilt'),
    fill = get<HTMLInputElement>('fill'),
    damping = get<HTMLInputElement>('damping');
const shape = get<HTMLSelectElement>('shape'),
    level = get<HTMLSelectElement>('level');
const menu = get<HTMLButtonElement>('menu'),
    settings = get<HTMLElement>('settings'),
    info = get<HTMLDialogElement>('info');
let samples = volumeSamples('bottle'),
    slosh = 0,
    velocity = 0,
    frame = 0,
    lastTime = 0;
const menuBackground = document.querySelectorAll<HTMLElement>(
    'main > :not(nav):not(#settings):not(dialog), nav > :not(#menu)',
);
function syncMenu() {
    const modal = !settings.hidden;
    menuBackground.forEach((element) => {
        element.inert = modal;
    });
    if (modal) {
        settings.setAttribute('role', 'dialog');
        settings.setAttribute('aria-modal', 'true');
        if (!info.open && !settings.contains(document.activeElement)) get('close-menu').focus();
    } else {
        settings.setAttribute('role', 'complementary');
        settings.removeAttribute('aria-modal');
    }
}
function menuOpen(open: boolean, focus = true) {
    settings.hidden = !open;
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? '설정 메뉴 닫기' : '설정 메뉴 열기');
    syncMenu();
    if (focus) (open ? get('close-menu') : menu).focus();
}
menu.addEventListener('click', () => menuOpen(Boolean(settings.hidden)));
get('close-menu').addEventListener('click', () => menuOpen(false));
get('explain').addEventListener('click', () => info.showModal());
get('close-info').addEventListener('click', () => info.close());
document.addEventListener('keydown', (event) => {
    if (info.open || settings.hidden) return;
    if (event.key === 'Escape') {
        event.preventDefault();
        menuOpen(false);
    } else if (event.key === 'Tab') {
        const controls = Array.from(
            settings.querySelectorAll<HTMLElement>('button, input, select, a[href], [tabindex]'),
        ).filter(
            (control) =>
                !control.matches(':disabled') && control.tabIndex >= 0 && control.getClientRects().length,
        );
        const first = controls[0]!,
            last = controls[controls.length - 1]!;
        if (
            event.shiftKey &&
            (document.activeElement === first || !settings.contains(document.activeElement))
        ) {
            event.preventDefault();
            last.focus();
        } else if (
            !event.shiftKey &&
            (document.activeElement === last || !settings.contains(document.activeElement))
        ) {
            event.preventDefault();
            first.focus();
        }
    }
});
function path(points: Point[], project: (point: Point) => Point) {
    ctx.beginPath();
    points.forEach((p, i) => {
        const q = project(p);
        if (i === 0) ctx.moveTo(q.x, q.y);
        else ctx.lineTo(q.x, q.y);
    });
    ctx.closePath();
}
function draw() {
    const box = canvas.getBoundingClientRect(),
        w = box.width,
        h = box.height,
        dpr = Math.min(devicePixelRatio, 2);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const angle = (Number(tilt.value) * Math.PI) / 180,
        fraction = Number(fill.value) / 100;
    const nx = Math.sin(angle - slosh),
        ny = Math.cos(angle - slosh);
    const localHeight = levelForVolume(samples, 0, 1, fraction);
    const worldHeight = level.value === 'volume' ? levelForVolume(samples, nx, ny, fraction) : localHeight;
    const total = samples.reduce((sum, p) => sum + p.weight, 0),
        localVolume = volumeBelow(samples, 0, 1, localHeight),
        worldVolume = volumeBelow(samples, nx, ny, worldHeight);
    const mobile = w < 610,
        regionW = mobile ? w : w / 2,
        regionH = mobile ? h / 2 : h;
    const scale = Math.min(regionW / 4.4, (regionH - 110) / 3.6, 128);
    const points = outline(shape.value as Shape);
    [0, 1].forEach((i) => {
        const x = mobile ? w / 2 : regionW * (i + 0.5),
            y = (mobile ? regionH * i : 0) + regionH / 2 + 4;
        const project = (p: Point) => ({
            x: x + (Math.cos(angle) * p.x - Math.sin(angle) * p.y) * scale,
            y: y - (Math.sin(angle) * p.x + Math.cos(angle) * p.y) * scale,
        });
        const titleY = (mobile ? regionH * i : 0) + 30;
        ctx.textAlign = 'center';
        ctx.fillStyle = i === 0 ? '#a75424' : '#086e69';
        ctx.font = '600 17px sans-serif';
        ctx.fillText(i === 0 ? '병에 고정된 수면' : '세계의 위를 따르는 수면', x, titleY);
        ctx.fillStyle = '#566a70';
        ctx.font = '12px sans-serif';
        ctx.fillText(
            i === 0
                ? '양은 유지되지만 병과 함께 회전'
                : level.value === 'volume'
                  ? '목표량에 맞춰 수면 높이를 조정'
                  : '세계 수면 · 높이는 고정',
            x,
            titleY + 23,
        );
        ctx.strokeStyle = '#c6d0d3';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 7]);
        ctx.beginPath();
        ctx.moveTo(x - regionW * 0.4, y);
        ctx.lineTo(x + regionW * 0.4, y);
        ctx.stroke();
        ctx.setLineDash([]);
        path(points, project);
        ctx.fillStyle = '#ffffff88';
        ctx.fill();
        const a = i === 0 ? 0 : nx,
            b = i === 0 ? 1 : ny,
            height = i === 0 ? localHeight : worldHeight;
        path(clipLiquid(points, a, b, height), project);
        const gradient = ctx.createLinearGradient(0, y - scale, 0, y + scale * 1.5);
        gradient.addColorStop(0, i === 0 ? '#efb478bb' : '#50b5aebb');
        gradient.addColorStop(1, i === 0 ? '#dc8a4699' : '#137e8999');
        ctx.fillStyle = gradient;
        ctx.fill();
        const surface: Point[] = [];
        for (let j = 0; j < points.length; j++) {
            const p = points[j],
                q = points[(j + 1) % points.length];
            const dp = a * p.x + b * p.y - height,
                dq = a * q.x + b * q.y - height;
            if (dp * dq < 0) {
                const t = dp / (dp - dq);
                surface.push({
                    x: p.x + t * (q.x - p.x),
                    y: p.y + t * (q.y - p.y),
                });
            }
        }
        if (surface.length >= 2) {
            const p = project(surface[0]),
                q = project(surface[1]);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = i === 0 ? '#b76125' : '#05726c';
            ctx.lineWidth = 3;
            ctx.stroke();
        }
        path(points, project);
        ctx.strokeStyle = '#53666c';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#263e48';
        ctx.font = '700 20px sans-serif';
        ctx.fillText(
            `${(((i === 0 ? localVolume : worldVolume) / total) * 100).toFixed(1)}%`,
            x,
            (mobile ? regionH * (i + 1) : h) - 23,
        );
    });
    get('tilt-value').textContent = `${tilt.value}°`;
    get('fill-value').textContent = `${fill.value}%`;
    get('damping-value').textContent = Number(damping.value).toFixed(2);
    get('summary').textContent =
        `목표 ${fill.value}% · 세계 수면의 실제 양 ${((worldVolume / total) * 100).toFixed(1)}% · 차이 ${((worldVolume / total) * 100 - Number(fill.value)).toFixed(1)}%p · 수면 기울기 ${((slosh * 180) / Math.PI).toFixed(1)}°. ${level.value === 'fixed' ? '부피 보정을 켜면 회전해도 목표량에 가까워집니다.' : '깊이 가중 격자 합산으로 목표량을 유지합니다.'}`;
}
function animate(time: number) {
    const dt = Math.min((time - lastTime) / 1000, 0.04);
    lastTime = time;
    for (let i = 0; i < 8; i++)
        [slosh, velocity] = oscillatorStep(slosh, velocity, Number(damping.value), dt / 8);
    draw();
    if (Math.abs(slosh) + Math.abs(velocity) > 0.0002) frame = requestAnimationFrame(animate);
    else {
        frame = 0;
        slosh = 0;
        velocity = 0;
        draw();
    }
}
function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    slosh = 0;
    velocity = 0;
    draw();
}
get('pulse').addEventListener('click', () => {
    velocity += 2;
    if (!frame) {
        lastTime = performance.now();
        frame = requestAnimationFrame(animate);
    }
});
get('stop').addEventListener('click', stop);
[tilt, fill, damping, level].forEach((control) => control.addEventListener('input', draw));
level.addEventListener('change', draw);
shape.addEventListener('change', () => {
    samples = volumeSamples(shape.value as Shape);
    draw();
});
get('reset').addEventListener('click', () => {
    tilt.value = '55';
    fill.value = '40';
    damping.value = '0.25';
    shape.value = 'bottle';
    level.value = 'fixed';
    samples = volumeSamples('bottle');
    stop();
});
const observer = new ResizeObserver(draw);
observer.observe(canvas);
window.addEventListener('pagehide', (event) => {
    stop();
    if (!event.persisted) observer.disconnect();
});
window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        observer.observe(canvas);
        syncMenu();
        draw();
    }
});
draw();
