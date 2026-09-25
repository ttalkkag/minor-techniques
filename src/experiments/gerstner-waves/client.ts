import { sample, safeWaves, strength } from './model';
import type { Wave } from './model';
const get = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = get<HTMLCanvasElement>('scene'),
    ctx = canvas.getContext('2d')!;
const menu = get<HTMLButtonElement>('menu'),
    settings = get<HTMLElement>('settings'),
    info = get<HTMLDialogElement>('info');
const background = [
    ...document.querySelectorAll<HTMLElement>(
        'main > :not(nav):not(#settings):not(dialog), nav > :not(#menu)',
    ),
];
function menuOpen(open: boolean) {
    settings.hidden = !open;
    settings.setAttribute('role', 'dialog');
    settings.setAttribute('aria-modal', String(open));
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? '설정 메뉴 닫기' : '설정 메뉴 열기');
    menu.tabIndex = open ? -1 : 0;
    background.forEach((element) => {
        element.inert = open;
    });
    if (open) {
        settings.scrollTop = 0;
        get('close-menu').focus();
    } else menu.focus();
}
menu.addEventListener('click', () => menuOpen(Boolean(settings.hidden)));
get('close-menu').addEventListener('click', () => menuOpen(false));
get('explain').addEventListener('click', () => info.showModal());
get('close-info').addEventListener('click', () => info.close());
document.addEventListener('keydown', (e) => {
    if (settings.hidden || info.open) return;
    if (e.key === 'Escape') {
        e.preventDefault();
        menuOpen(false);
    } else if (e.key === 'Tab') {
        const controls = [...settings.querySelectorAll<HTMLElement>('button, input, select, a[href]')].filter(
            (element) => !element.hasAttribute('disabled') && element.getClientRects().length,
        );
        const first = controls[0],
            last = controls[controls.length - 1];
        if (e.shiftKey && (document.activeElement === first || !settings.contains(document.activeElement))) {
            e.preventDefault();
            last.focus();
        } else if (
            !e.shiftKey &&
            (document.activeElement === last || !settings.contains(document.activeElement))
        ) {
            e.preventDefault();
            first.focus();
        }
    }
});
function surface() {
    const r = canvas.getBoundingClientRect(),
        dpr = Math.min(devicePixelRatio, 2);
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w: r.width, h: r.height };
}
function textAt(text: string, x: number, y: number, color = '#334d58', size = 13) {
    ctx.fillStyle = color;
    ctx.font = `${size}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(text, x, y);
}
function range(id: string) {
    const control = get<HTMLInputElement>(id);
    get(`${id}-value`).textContent = control.value;
    return Number(control.value);
}
let playing = false,
    frame = 0,
    last = 0,
    clockTime = 0;
function draw() {
    const { w, h } = surface(),
        a = range('amplitude'),
        lambda = range('wavelength'),
        q = range('steepness'),
        yaw = (range('yaw') * Math.PI) / 180,
        pitch = (range('pitch') * Math.PI) / 180,
        n = range('resolution'),
        time = range('time');
    const initial: Wave[] = [{ a, lambda, q, angle: 0 }];
    if (get<HTMLInputElement>('multiple').checked)
        initial.push(
            { a: a * 0.4, lambda: lambda * 0.63, q, angle: 1.1 },
            { a: a * 0.25, lambda: lambda * 0.37, q, angle: 2.2 },
        );
    const waves = safeWaves(initial, get<HTMLInputElement>('safe').checked),
        mainH = h * 0.69,
        horizontal =
            6 * (Math.abs(Math.cos(yaw)) + Math.abs(Math.sin(yaw))) +
            waves.reduce((sum, wave) => sum + Math.abs(wave.q * wave.a), 0) +
            1.5,
        vertical =
            horizontal * Math.sin(pitch) +
            (waves.reduce((sum, wave) => sum + wave.a, 0) + 1.5) * Math.cos(pitch),
        scale = Math.min((w - 28) / (2 * horizontal), (mainH - 64) / (2 * vertical)),
        cy = mainH * 0.5 + 5;
    const project = (x: number, y: number, z: number) => {
        const xx = x * Math.cos(yaw) - z * Math.sin(yaw),
            zz = x * Math.sin(yaw) + z * Math.cos(yaw);
        return {
            x: w / 2 + xx * scale,
            y: cy + (zz * Math.sin(pitch) - y * Math.cos(pitch)) * scale,
            depth: zz * Math.cos(pitch) + y * Math.sin(pitch),
        };
    };
    textAt('수평 격자의 변형 · 관찰 회전과 고도를 조절하세요', w / 2, 23, '#4a6970', 13);
    const vertices = Array.from({ length: n + 1 }, (_, j) =>
        Array.from({ length: n + 1 }, (_, i) => sample(-6 + (12 * i) / n, -6 + (12 * j) / n, time, waves)),
    );
    const quads: {
        points: ReturnType<typeof project>[];
        shade: number;
        fold: boolean;
        depth: number;
    }[] = [];
    let minimum = Infinity;
    for (let j = 0; j < n; j++)
        for (let i = 0; i < n; i++) {
            const points = [vertices[j][i], vertices[j][i + 1], vertices[j + 1][i + 1], vertices[j + 1][i]],
                p = points[0];
            minimum = Math.min(minimum, ...points.map((v) => v.det));
            const normal = get<HTMLSelectElement>('normal').value === 'full' ? p.normal : p.heightNormal;
            const shade = Math.max(0, normal[0] * 0.35 + normal[1] * 0.86 + normal[2] * 0.37),
                projected = points.map((p) => project(p.x, p.y, p.z));
            quads.push({
                points: projected,
                shade,
                fold: p.det < 0,
                depth: projected.reduce((s, p) => s + p.depth, 0) / 4,
            });
        }
    quads.sort((a, b) => a.depth - b.depth);
    for (const face of quads) {
        ctx.beginPath();
        face.points.forEach((p, i) => {
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        });
        ctx.closePath();
        ctx.fillStyle = face.fold
            ? `hsl(24 68% ${40 + face.shade * 25}%)`
            : `hsl(176 38% ${28 + face.shade * 42}%)`;
        ctx.fill();
        ctx.strokeStyle = '#266d7040';
        ctx.lineWidth = 0.7;
        ctx.stroke();
    }
    const p = sample(0, 0, time, waves),
        point = project(p.x, p.y, p.z);
    ctx.strokeStyle = '#c97929';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i <= 80; i++) {
        const o = sample(0, 0, i * 0.12, waves),
            r = project(o.x, o.y, o.z);
        if (i === 0) ctx.moveTo(r.x, r.y);
        else ctx.lineTo(r.x, r.y);
    }
    ctx.stroke();
    ctx.fillStyle = '#ffab50';
    ctx.beginPath();
    ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
    ctx.fill();
    const normal = get<HTMLSelectElement>('normal').value === 'full' ? p.normal : p.heightNormal,
        end = project(p.x + normal[0] * 1.5, p.y + normal[1] * 1.5, p.z + normal[2] * 1.5);
    ctx.strokeStyle = '#173e47';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    const chartY = h * 0.84,
        chartScaleX = w / 17,
        chartScaleY = Math.min(25, h * 0.05);
    textAt('v=0 단면 · 회색: 높이만 / 청록: 수평 변위 포함', w / 2, mainH + 18, '#4b6870', 12);
    ctx.strokeStyle = '#c5d1d3';
    ctx.beginPath();
    ctx.moveTo(20, chartY);
    ctx.lineTo(w - 20, chartY);
    ctx.stroke();
    [false, true].forEach((horizontal) => {
        ctx.beginPath();
        for (let i = 0; i <= 240; i++) {
            const u = -7 + (14 * i) / 240,
                pt = sample(u, 0, time, waves),
                x = w / 2 + (horizontal ? pt.x : u) * chartScaleX,
                y = chartY - pt.y * chartScaleY;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = horizontal ? '#087f76' : '#abb9bd';
        ctx.lineWidth = horizontal ? 2.7 : 2;
        ctx.stroke();
    });
    get('metric-0').textContent = strength(waves).toFixed(3);
    get('metric-1').textContent = minimum.toFixed(3);
    get('metric-2').textContent = `${Math.hypot(p.x, p.z).toFixed(2)} m`;
    get('summary').textContent =
        `${waves.length}개 파동 · ${(n + 1) ** 2}개 정점 · t=${time.toFixed(2)}s. ${minimum < 0 ? '주황 구간에서 수평 사상이 뒤집혀 표면이 접힙니다.' : strength(waves) < 1 ? '보수적 가파름 조건 ΣQAk < 1을 만족합니다.' : '현재 표본에 접힘이 없어도 전체 조건을 보장하지 않습니다.'} ${get<HTMLInputElement>('safe').checked ? '요청 Q에 가파름 상한을 적용했습니다.' : ''}`;
}
function animate(now: number) {
    if (!playing) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const time = get<HTMLInputElement>('time');
    clockTime = (clockTime + dt) % 10;
    time.value = String(clockTime);
    draw();
    frame = requestAnimationFrame(animate);
}
get('play').addEventListener('click', () => {
    playing = !playing;
    get('play').textContent = playing ? '일시 정지' : '재생';
    if (playing) {
        clockTime = Number(get<HTMLInputElement>('time').value);
        last = performance.now();
        frame = requestAnimationFrame(animate);
    } else cancelAnimationFrame(frame);
});
document
    .querySelectorAll<HTMLInputElement | HTMLSelectElement>('#settings input,#settings select')
    .forEach((c) => {
        const update = () => {
            if (c.id === 'time') {
                clockTime = Number(c.value);
                last = performance.now();
            }
            draw();
        };
        c.addEventListener('input', update);
        c.addEventListener('change', update);
    });
get('reset').addEventListener('click', () => {
    playing = false;
    cancelAnimationFrame(frame);
    clockTime = 0;
    get('play').textContent = '재생';
    for (const [id, value] of Object.entries({
        amplitude: '1',
        wavelength: '10',
        steepness: '2',
        yaw: '30',
        pitch: '35',
        resolution: '24',
        time: '0',
    }))
        get<HTMLInputElement>(id).value = value;
    get<HTMLInputElement>('safe').checked = false;
    get<HTMLInputElement>('multiple').checked = false;
    get<HTMLSelectElement>('normal').value = 'full';
    draw();
});
const observer = new ResizeObserver(draw);
observer.observe(canvas);
window.addEventListener('pagehide', () => {
    playing = false;
    get('play').textContent = '재생';
    cancelAnimationFrame(frame);
    observer.disconnect();
});
window.addEventListener('pageshow', () => {
    observer.observe(canvas);
    draw();
});
draw();
