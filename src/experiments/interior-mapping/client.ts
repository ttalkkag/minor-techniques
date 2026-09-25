import { trace } from './model';
import type { Hit, Vec3 } from './model';
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>('scene');
const ctx = canvas.getContext('2d')!;
const form = $<HTMLFormElement>('controls');
const menu = $<HTMLButtonElement>('menu');
const panel = $('settings');
const dialog = $<HTMLDialogElement>('explanation');
const inputs = ['camera-x', 'camera-y', 'depth', 'furniture-z'];
let sample: [number, number] = [0, 0];
let hitRect = { x: 0, y: 0, size: 0 };
const faces: Record<string, string> = {
    left: '왼쪽 벽',
    right: '오른쪽 벽',
    floor: '바닥',
    ceiling: '천장',
    back: '뒷벽',
    furniture: '가구 평면',
};
const number = (id: string) => Number($<HTMLInputElement>(id).value);
const checked = (id: string) => $<HTMLInputElement>(id).checked;
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
function color(hit: Hit | null): [number, number, number] {
    if (!hit) return [206, 217, 217];
    const [u, v] = hit.uv;
    if (hit.face === 'furniture') return [180 + v * 45, 104 + v * 30, 61];
    if (hit.face === 'back') {
        if (u > 0.29 && u < 0.71 && v > 0.44 && v < 0.83)
            return u < 0.32 || u > 0.68 || v < 0.47 || v > 0.8
                ? [215, 176, 103]
                : [37 + u * 35, 112 + v * 45, 112 + u * 35];
        if (v < 0.06) return [82, 105, 95];
        return [186, 210, 185];
    }
    if (hit.face === 'floor') {
        const line = (u * 9) % 1 < 0.035 || (v * 7) % 1 < 0.035;
        return line ? [109, 85, 64] : [177, 147, 107];
    }
    if (hit.face === 'ceiling') return [211, 226, 213];
    const stripe = Math.floor(u * 12) % 2 ? 0 : 8;
    return hit.face === 'left'
        ? [143 + stripe, 181 + stripe, 157 + stripe]
        : [107 + stripe, 151 + stripe, 136 + stripe];
}
function room(
    x: number,
    y: number,
    size: number,
    camera: Vec3,
    depth: number,
    furniture: number | null,
    mask: boolean,
) {
    const buffer = document.createElement('canvas');
    buffer.width = buffer.height = Math.min(360, Math.ceil(size * Math.min(devicePixelRatio, 1.25)));
    const off = buffer.getContext('2d')!;
    const data = off.createImageData(buffer.width, buffer.height);
    for (let j = 0; j < buffer.height; j++)
        for (let i = 0; i < buffer.width; i++) {
            const px = ((i / (buffer.width - 1)) * 2 - 1) * 1.12,
                py = (1 - (j / (buffer.height - 1)) * 2) * 1.12;
            const outside = Math.abs(px) > 0.96 || Math.abs(py) > 0.96;
            const p: Vec3 = [
                Math.max(-0.9999, Math.min(0.9999, px)),
                Math.max(-0.9999, Math.min(0.9999, py)),
                0,
            ];
            const rgb =
                mask && outside
                    ? Math.abs(px) < 1.055 && Math.abs(py) < 1.055
                        ? [61, 81, 87]
                        : [207, 218, 218]
                    : color(trace(p, [p[0] - camera[0], p[1] - camera[1], -camera[2]], depth, furniture));
            const offset = (j * buffer.width + i) * 4;
            data.data[offset] = rgb[0]!;
            data.data[offset + 1] = rgb[1]!;
            data.data[offset + 2] = rgb[2]!;
            data.data[offset + 3] = 255;
        }
    off.putImageData(data, 0, 0);
    ctx.drawImage(buffer, x, y, size, size);
}
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
    inputs.forEach((id) => ($(id + '-out').textContent = number(id).toFixed(2)));
    const camera: Vec3 = [number('camera-x'), number('camera-y'), -4],
        depth = number('depth');
    const furniture = checked('furniture') ? depth * number('furniture-z') : null;
    const narrow = width < 600;
    const size = narrow ? Math.min(width - 14, 230) : Math.min((width - 90) / 2, height - 168, 360);
    const x1 = narrow ? (width - size) / 2 : (width - size * 2 - 40) / 2,
        y1 = 37;
    const x2 = narrow ? x1 : x1 + size + 40,
        y2 = narrow ? y1 + size + 42 : y1;
    text('A  정면 사진 · 시점 고정', x1, y1 - 13);
    text('B  가상 방 · 시점에 따른 교차', x2, y2 - 13, '#0b8078');
    room(x1, y1, size, [0, 0, -4], depth, furniture, checked('mask'));
    room(x2, y2, size, camera, depth, furniture, checked('mask'));
    hitRect = { x: x2, y: y2, size };
    const p: Vec3 = [sample[0], sample[1], 0],
        d: Vec3 = [p[0] - camera[0], p[1] - camera[1], 4];
    const hit = trace(p, d, depth, furniture)!;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x2 + ((p[0] / 1.12 + 1) / 2) * size, y2 + ((1 - p[1] / 1.12) / 2) * size, 6, 0, Math.PI * 2);
    ctx.stroke();
    const diagramY = narrow ? y2 + size + 22 : y1 + size + 24;
    const diagramHeight = Math.max(50, height - diagramY - 12),
        scale = Math.min((width - 40) / 11, diagramHeight / (depth + 4.7));
    const center = width / 2,
        z0 = diagramY + 4 * scale;
    ctx.strokeStyle = '#92b4ad';
    ctx.lineWidth = 2;
    ctx.strokeRect(center - scale, z0, 2 * scale, depth * scale);
    ctx.fillStyle = '#b4d2c944';
    ctx.fillRect(center - scale, z0, 2 * scale, depth * scale);
    ctx.strokeStyle = '#e0884e';
    ctx.beginPath();
    ctx.moveTo(center + camera[0] * scale, z0 - 4 * scale);
    ctx.lineTo(center + hit.point[0] * scale, z0 + hit.point[2] * scale);
    ctx.stroke();
    ctx.fillStyle = '#e0884e';
    ctx.beginPath();
    ctx.arc(center + camera[0] * scale, z0 - 4 * scale, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#07877c';
    ctx.beginPath();
    ctx.arc(center + hit.point[0] * scale, z0 + hit.point[2] * scale, 5, 0, Math.PI * 2);
    ctx.fill();
    text('x-z 단면', 12, diagramY + 12, '#657b7c', 11);
    $('result').textContent =
        `선택 픽셀 → ${faces[hit.face]} · 교차점 (${hit.point.map((v) => v.toFixed(2)).join(', ')}) · t = ${hit.t.toFixed(3)}`;
    $('detail').textContent =
        `카메라 (${camera[0].toFixed(1)}, ${camera[1].toFixed(1)}, −4) · 방 깊이 ${depth.toFixed(1)} · ${checked('mask') ? '외벽 마스크 적용' : '외벽 마스크 없음: 테두리까지 내부 노출'}`;
}
form.addEventListener('input', draw);
form.addEventListener('change', draw);
form.addEventListener('reset', () => {
    sample = [0, 0];
    requestAnimationFrame(draw);
});
$('front').addEventListener('click', () => {
    $<HTMLInputElement>('camera-x').value = '0';
    $<HTMLInputElement>('camera-y').value = '0';
    draw();
});
canvas.addEventListener('pointerdown', (event) => {
    const bounds = canvas.getBoundingClientRect();
    const x = event.clientX - bounds.left,
        y = event.clientY - bounds.top;
    if (x >= hitRect.x && x <= hitRect.x + hitRect.size && y >= hitRect.y && y <= hitRect.y + hitRect.size) {
        sample = [
            Math.max(-0.95, Math.min(0.95, (((x - hitRect.x) / hitRect.size) * 2 - 1) * 1.12)),
            Math.max(-0.95, Math.min(0.95, (1 - ((y - hitRect.y) / hitRect.size) * 2) * 1.12)),
        ];
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
    if (event.key === 'Home') sample = [0, 0];
    else if (directions[event.key]) {
        const delta = directions[event.key]!;
        sample = [
            Math.max(-0.95, Math.min(0.95, sample[0] + delta[0])),
            Math.max(-0.95, Math.min(0.95, sample[1] + delta[1])),
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
