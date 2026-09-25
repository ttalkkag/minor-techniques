import { bump, cosine, encode, normalAt, normalize, tangentNormal, toWorld } from './model';
import type { Fault, Vec3 } from './model';
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>('scene');
const ctx = canvas.getContext('2d')!;
const form = $<HTMLFormElement>('controls');
const menu = $('menu');
const panel = $('settings');
const dialog = $<HTMLDialogElement>('explanation');
const number = (id: string) => Number($<HTMLInputElement>(id).value);
const checked = (id: string) => $<HTMLInputElement>(id).checked;
let sample: [number, number] = [-0.3, -0.2];
let surface = { x: 0, y: 0, width: 0, size: 0 };
const menuBackground = document.querySelectorAll<HTMLElement>(
    'main > :not(nav):not(#settings):not(dialog), nav > :not(#menu)',
);
function syncMenu() {
    const modal = !panel.hidden;
    menuBackground.forEach((element) => {
        element.inert = modal;
    });
    if (modal) {
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-modal', 'true');
        if (!dialog.open && !panel.contains(document.activeElement)) $('close-menu').focus();
    } else {
        panel.setAttribute('role', 'complementary');
        panel.removeAttribute('aria-modal');
    }
}
function toggleMenu(open: boolean, focus = true) {
    panel.hidden = !open;
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? '설정 메뉴 닫기' : '설정 메뉴 열기');
    syncMenu();
    if (focus) (open ? $('close-menu') : menu).focus();
}
menu.addEventListener('click', () => toggleMenu(Boolean(panel.hidden)));
$('close-menu').addEventListener('click', () => {
    toggleMenu(false);
    menu.focus();
});
$('help').addEventListener('click', () => dialog.showModal());
$('close-help').addEventListener('click', () => dialog.close());
document.addEventListener('keydown', (event) => {
    if (dialog.open || panel.hidden) return;
    if (event.key === 'Escape') {
        event.preventDefault();
        toggleMenu(false);
    } else if (event.key === 'Tab') {
        const controls = Array.from(
            panel.querySelectorAll<HTMLElement>('button, input, select, a[href], [tabindex]'),
        ).filter(
            (control) =>
                !control.matches(':disabled') && control.tabIndex >= 0 && control.getClientRects().length,
        );
        const first = controls[0]!,
            last = controls[controls.length - 1]!;
        if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
            event.preventDefault();
            last.focus();
        } else if (
            !event.shiftKey &&
            (document.activeElement === last || !panel.contains(document.activeElement))
        ) {
            event.preventDefault();
            first.focus();
        }
    }
});
function text(value: string, x: number, y: number, color = '#304950', size = 13) {
    ctx.fillStyle = color;
    ctx.font = `600 ${size}px -apple-system, sans-serif`;
    ctx.fillText(value, x, y);
}
function draw() {
    const width = canvas.clientWidth,
        height = canvas.clientHeight,
        ratio = Math.min(devicePixelRatio, 2);
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    ctx.scale(ratio, ratio);
    const yaw = (number('yaw') * Math.PI) / 180,
        lightAngle = (number('light') * Math.PI) / 180;
    const strength = number('strength'),
        phase = number('phase'),
        flipped = checked('flipped'),
        raw = checked('raw');
    const fault = $<HTMLSelectElement>('fault').value as Fault;
    $('light-out').textContent = `${number('light')}°`;
    $('yaw-out').textContent = `${number('yaw')}°`;
    $('strength-out').textContent = strength.toFixed(2);
    $('phase-out').textContent = phase.toFixed(2);
    const light: Vec3 = normalize([Math.cos(lightAngle), Math.sin(lightAngle), 0.75]);
    const flatNormal = toWorld([0, 0, 1], yaw);
    const flatCos = cosine(flatNormal, light);
    const narrow = width < 600,
        size = narrow ? Math.min(width - 26, 218) : Math.min((width - 100) / 2, height - 170, 340);
    const x1 = narrow ? (width - size) / 2 : (width - 2 * size - 46) / 2,
        y1 = 44;
    const x2 = narrow ? x1 : x1 + size + 46,
        y2 = narrow ? y1 + size + 49 : y1;
    text('A  기본 법선 · 같은 방향', x1, y1 - 20);
    text(
        raw ? 'B  조명 전 방향 RGB 원본' : `B  ${fault === 'none' ? '정상 노멀맵' : '오류가 있는 노멀맵'}`,
        x2,
        y2 - 20,
        fault === 'none' ? '#087c76' : '#bc6835',
    );
    const projectedWidth = size * Math.cos(yaw);
    for (let plane = 0; plane < 2; plane++) {
        const x = plane === 0 ? x1 : x2,
            y = plane === 0 ? y1 : y2;
        const buffer = document.createElement('canvas');
        buffer.width = buffer.height = Math.min(300, Math.ceil(size * Math.min(devicePixelRatio, 1.2)));
        const off = buffer.getContext('2d')!;
        const data = off.createImageData(buffer.width, buffer.height);
        for (let j = 0; j < buffer.height; j++)
            for (let i = 0; i < buffer.width; i++) {
                const u = (i / (buffer.width - 1)) * 2 - 1,
                    v = 1 - (j / (buffer.height - 1)) * 2,
                    mapU = flipped ? -u : u;
                const h = bump(mapU, v, phase).height;
                const albedo: Vec3 =
                    h > 0.17 ? [125, 168, 144] : h > 0.055 && h < 0.08 ? [55, 100, 99] : [100, 157, 145];
                const grid = Math.abs(u) > 0.96 || Math.abs(v) > 0.96;
                const n = plane === 0 ? flatNormal : normalAt(u, v, phase, strength, yaw, flipped, fault);
                const brightness = 0.18 + 0.82 * cosine(n, light);
                const rgb =
                    plane === 1 && raw
                        ? encode(tangentNormal(mapU, v, phase, strength)).map((c) => c * 255)
                        : albedo.map((c) => c * brightness);
                const index = (j * buffer.width + i) * 4;
                data.data[index] = grid ? 60 : rgb[0]!;
                data.data[index + 1] = grid ? 89 : rgb[1]!;
                data.data[index + 2] = grid ? 88 : rgb[2]!;
                data.data[index + 3] = 255;
            }
        off.putImageData(data, 0, 0);
        ctx.drawImage(buffer, x + (size - projectedWidth) / 2, y, projectedWidth, size);
        ctx.strokeStyle = '#dae7e3';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + (size - projectedWidth) / 2, y, projectedWidth, size);
        const lx = x + size / 2 + light[0] * size * 0.43,
            ly = y + size / 2 - light[1] * size * 0.43;
        ctx.strokeStyle = '#e89752';
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx - light[0] * 27, ly + light[1] * 27);
        ctx.stroke();
        ctx.fillStyle = '#e89752';
        ctx.beginPath();
        ctx.arc(lx, ly, 6, 0, Math.PI * 2);
        ctx.fill();
        if (plane === 1)
            surface = {
                x: x + (size - projectedWidth) / 2,
                y,
                width: projectedWidth,
                size,
            };
    }
    const selectedNormal = normalAt(sample[0], sample[1], phase, strength, yaw, flipped, fault);
    const goodNormal = normalAt(sample[0], sample[1], phase, strength, yaw, flipped, 'none');
    const px = surface.x + ((sample[0] + 1) / 2) * projectedWidth,
        py = surface.y + ((1 - sample[1]) / 2) * size;
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(px - 5, py);
    ctx.lineTo(px + 5, py);
    ctx.moveTo(px, py - 5);
    ctx.lineTo(px, py + 5);
    ctx.stroke();
    if (!raw) {
        ctx.strokeStyle = '#f3efd8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + selectedNormal[0] * 35, py - selectedNormal[1] * 35);
        ctx.stroke();
    }
    const diagramY = narrow ? y2 + size + 23 : y1 + size + 36;
    const baseline = Math.min(height - 29, diagramY + 45),
        diagramWidth = Math.min(width - 36, 480),
        left = (width - diagramWidth) / 2;
    text('선택 행의 단면 · 주황선 = 평면/충돌', left, diagramY, '#657b7c', 11);
    ctx.strokeStyle = '#96b6ad';
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i <= 140; i++) {
        const u = (i / 140) * 2 - 1,
            h = bump(flipped ? -u : u, sample[1], phase).height;
        const y = baseline - h * strength * 65;
        if (i === 0) ctx.moveTo(left, y);
        else ctx.lineTo(left + (i / 140) * diagramWidth, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = '#df8a50';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(left, baseline);
    ctx.lineTo(left + diagramWidth, baseline);
    ctx.stroke();
    text('점선 = 방향을 만든 가상의 높이', left, baseline + 20, '#657b7c', 10);
    const alignment =
        goodNormal[0] * selectedNormal[0] +
        goodNormal[1] * selectedNormal[1] +
        goodNormal[2] * selectedNormal[2];
    const error = (Math.acos(Math.min(1, Math.max(-1, alignment))) * 180) / Math.PI;
    $('result').textContent =
        `흰 십자 픽셀 · 기본 max(0,n·l) = ${flatCos.toFixed(3)} / 선택 = ${cosine(selectedNormal, light).toFixed(3)} · 정상 방향과 ${error.toFixed(1)}° 차이`;
    $('detail').textContent =
        `세계 법선 (${selectedNormal.map((v) => v.toFixed(2)).join(', ')}) · 표면 회전 ${number('yaw')}° · 정점 변위 0 · ${flipped ? '좌우 반전 켜짐' : '좌우 반전 꺼짐'}`;
}
form.addEventListener('input', draw);
form.addEventListener('change', draw);
form.addEventListener('reset', () => {
    sample = [-0.3, -0.2];
    requestAnimationFrame(draw);
});
$('fix').addEventListener('click', () => {
    $<HTMLSelectElement>('fault').value = 'none';
    draw();
});
canvas.addEventListener('pointerdown', (event) => {
    const bounds = canvas.getBoundingClientRect(),
        x = event.clientX - bounds.left,
        y = event.clientY - bounds.top;
    if (x >= surface.x && x <= surface.x + surface.width && y >= surface.y && y <= surface.y + surface.size) {
        sample = [((x - surface.x) / surface.width) * 2 - 1, 1 - ((y - surface.y) / surface.size) * 2];
        draw();
    }
});
canvas.addEventListener('keydown', (event) => {
    const step = event.shiftKey ? 0.01 : 0.05;
    const directions: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, step],
        ArrowDown: [0, -step],
    };
    if (event.key === 'Home') sample = [-0.3, -0.2];
    else if (directions[event.key]) {
        const delta = directions[event.key]!;
        sample = [
            Math.max(-1, Math.min(1, sample[0] + delta[0])),
            Math.max(-1, Math.min(1, sample[1] + delta[1])),
        ];
    } else return;
    event.preventDefault();
    draw();
});
const observer = new ResizeObserver(draw);
observer.observe(canvas);
window.addEventListener('pagehide', (event) => {
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
