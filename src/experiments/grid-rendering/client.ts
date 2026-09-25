import { castRay, columnRay, makeMap, projection } from './model';
import type { Point, RayHit } from './model';

const canvas = document.querySelector<HTMLCanvasElement>('#gr-scene')!;
const ctx = canvas.getContext('2d')!;
const menu = document.querySelector<HTMLElement>('#gr-settings')!;
const backdrop = document.querySelector<HTMLElement>('#gr-backdrop')!;
const menuButton = document.querySelector<HTMLButtonElement>('#gr-menu')!;
const dialog = document.querySelector<HTMLDialogElement>('#gr-dialog')!;
const menuMedia = matchMedia('(min-width: 0px)');
const menuBackground = Array.from(document.querySelectorAll<HTMLElement>('.grid-lab > nav, .grid-lab > header, .scene-wrap, .grid-lab > footer'));
function menuControls() {
    return Array.from(menu.querySelectorAll<HTMLElement>('button, input, select, a[href]'))
        .filter((control) => control.getClientRects().length && !control.hasAttribute('disabled'));
}
function syncMenu() {
    const modal = !menu.hidden && menuMedia.matches;
    for (const element of menuBackground) element.inert = modal;
    menu.setAttribute('role', modal ? 'dialog' : 'complementary');
    if (modal) menu.setAttribute('aria-modal', 'true');
    else menu.removeAttribute('aria-modal');
}
function trapMenu(event: KeyboardEvent) {
    if (dialog.open || menu.hidden || !menuMedia.matches || event.key !== 'Tab') return;
    const controls = menuControls(), first = controls[0], last = controls.at(-1);
    if (!first || !last) return;
    if (!menu.contains(document.activeElement) || (event.shiftKey ? document.activeElement === first : document.activeElement === last)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
    }
}
menuMedia.addEventListener('change', () => {
    syncMenu();
    if (!menu.hidden && menuMedia.matches && !dialog.open) menuControls()[0]?.focus();
});
const controls = {
    map: document.querySelector<HTMLSelectElement>('#gr-map')!,
    bearing: document.querySelector<HTMLInputElement>('#gr-bearing')!,
    fov: document.querySelector<HTMLInputElement>('#gr-fov')!,
    column: document.querySelector<HTMLInputElement>('#gr-column')!,
    resolution: document.querySelector<HTMLInputElement>('#gr-resolution')!,
};
const abort = new AbortController();
const eventOptions = { signal: abort.signal };
let grid = makeMap('flat');
let origin: Point = { x: 3.5, y: 5 };
let mapBox = { x: 0, y: 0, size: 0 };
let width = 0;
let height = 0;
const radians = (degrees: number) => (degrees * Math.PI) / 180;
const setText = (id: string, text: string) => {
    document.getElementById(id)!.textContent = text;
};

function label(text: string, x: number, y: number, color = '#45616c', size = 12) {
    ctx.fillStyle = color;
    ctx.font = `600 ${size}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillText(text, x, y);
}

function drawMap(bearing: number, fov: number, selected: { direction: Point; offset: number }, hit: RayHit) {
    const { x, y, size } = mapBox;
    const cell = size / 10;
    const sx = (value: number) => x + value * cell;
    const sy = (value: number) => y + value * cell;
    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 10; col++) {
            const wall = grid[row]![col]!;
            ctx.fillStyle = wall ? ['#f7fafb', '#718992', '#2e8a82', '#9aabb0'][wall]! : '#f7fafb';
            ctx.fillRect(sx(col), sy(row), cell - 1, cell - 1);
        }
    }
    for (const cellVisit of hit.cells) {
        ctx.fillStyle = '#df92583c';
        ctx.fillRect(sx(cellVisit.x) + 1, sy(cellVisit.y) + 1, cell - 3, cell - 3);
    }
    for (let i = 0; i <= 24; i++) {
        const ray = columnRay(bearing, fov, i / 24);
        const rayHit = castRay(grid, origin, ray.direction);
        if (!rayHit) continue;
        ctx.strokeStyle = '#26928625';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx(origin.x), sy(origin.y));
        ctx.lineTo(
            sx(origin.x + ray.direction.x * rayHit.distance),
            sy(origin.y + ray.direction.y * rayHit.distance),
        );
        ctx.stroke();
    }
    const hitPoint = {
        x: origin.x + selected.direction.x * hit.distance,
        y: origin.y + selected.direction.y * hit.distance,
    };
    const depth = hit.distance * Math.cos(selected.offset);
    const forwardPoint = { x: origin.x + Math.cos(bearing) * depth, y: origin.y + Math.sin(bearing) * depth };
    ctx.strokeStyle = '#d77935';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(sx(origin.x), sy(origin.y));
    ctx.lineTo(sx(hitPoint.x), sy(hitPoint.y));
    ctx.stroke();
    ctx.strokeStyle = '#087b73';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx(origin.x), sy(origin.y));
    ctx.lineTo(sx(forwardPoint.x), sy(forwardPoint.y));
    ctx.stroke();
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(sx(forwardPoint.x), sy(forwardPoint.y));
    ctx.lineTo(sx(hitPoint.x), sy(hitPoint.y));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#d77935';
    ctx.beginPath();
    ctx.arc(sx(hitPoint.x), sy(hitPoint.y), 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(sx(origin.x), sy(origin.y));
    ctx.rotate(bearing);
    ctx.fillStyle = '#254954';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(-7, -6);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-7, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
}

function drawProjection(
    x: number,
    y: number,
    panelWidth: number,
    panelHeight: number,
    corrected: boolean,
    bearing: number,
    fov: number,
) {
    const inner = { x: x + 10, y: y + 33, w: panelWidth - 20, h: panelHeight - 45 };
    ctx.fillStyle = '#f8fbfc';
    ctx.beginPath();
    ctx.roundRect(x, y, panelWidth, panelHeight, 14);
    ctx.fill();
    label(
        corrected ? 'B · 전방 깊이 z' : 'A · 광선 거리 s',
        x + 14,
        y + 21,
        corrected ? '#087b73' : '#ad6736',
        width < 650 ? 11 : 13,
    );
    ctx.save();
    ctx.beginPath();
    ctx.rect(inner.x, inner.y, inner.w, inner.h);
    ctx.clip();
    const sky = ctx.createLinearGradient(0, inner.y, 0, inner.y + inner.h);
    sky.addColorStop(0, '#d6e3e8');
    sky.addColorStop(0.5, '#eaf0f2');
    sky.addColorStop(0.501, '#bccdd0');
    sky.addColorStop(1, '#e7edef');
    ctx.fillStyle = sky;
    ctx.fillRect(inner.x, inner.y, inner.w, inner.h);
    const count = Number(controls.resolution.value);
    const focalLength = inner.w / (2 * Math.tan(fov / 2));
    for (let i = 0; i < count; i++) {
        const ray = columnRay(bearing, fov, (i + 0.5) / count);
        const hit = castRay(grid, origin, ray.direction);
        if (!hit) continue;
        const result = projection(hit.distance, ray.offset, focalLength, 1);
        const wallHeight = corrected ? result.correctedHeight : result.rawHeight;
        const hitCoordinate =
            hit.side === 'x'
                ? origin.y + ray.direction.y * hit.distance
                : origin.x + ray.direction.x * hit.distance;
        const seam = ((hitCoordinate % 1) + 1) % 1 < 0.04;
        const lightness = Math.max(
            26,
            66 - hit.distance * 3.5 - (hit.side === 'y' ? 10 : 0) - (seam ? 14 : 0),
        );
        ctx.fillStyle = `hsl(${corrected ? 173 : 28} ${hit.wall === 1 ? 22 : 44}% ${lightness}%)`;
        ctx.fillRect(
            inner.x + (i * inner.w) / count,
            inner.y + (inner.h - wallHeight) / 2,
            Math.ceil(inner.w / count) + 0.5,
            wallHeight,
        );
    }
    const selectedX = inner.x + Math.min(0.999, Number(controls.column.value) / 100) * inner.w;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(selectedX, inner.y);
    ctx.lineTo(selectedX, inner.y + inner.h);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    return focalLength;
}

function draw() {
    const bearing = radians(Number(controls.bearing.value));
    const fov = radians(Number(controls.fov.value));
    const selected = columnRay(bearing, fov, Number(controls.column.value) / 100);
    const hit = castRay(grid, origin, selected.direction)!;
    if (!width || !hit) return;
    ctx.clearRect(0, 0, width, height);
    const mobile = width < 650;
    let focalLength: number;
    if (mobile) {
        const size = Math.min(width - 38, height * 0.53, 300);
        mapBox = { x: (width - size) / 2, y: 34, size };
        label('격자 지도 · 주황 s / 청록 z', 16, 21, '#4c686f', 11);
        const y = size + 52;
        const panelWidth = (width - 30) / 2;
        const panelHeight = Math.max(140, height - y - 34);
        drawProjection(10, y, panelWidth, panelHeight, false, bearing, fov);
        focalLength = drawProjection(20 + panelWidth, y, panelWidth, panelHeight, true, bearing, fov);
    } else {
        const areaWidth = width * 0.43;
        const size = Math.min(areaWidth - 48, height - 100);
        mapBox = { x: (areaWidth - size) / 2, y: (height - size) / 2, size };
        label('격자 지도 · 주황 s / 청록 z', mapBox.x, mapBox.y - 17, '#355862', 13);
        const px = areaWidth + 8;
        const panelWidth = width - px - 18;
        const panelHeight = (height - 48) / 2;
        drawProjection(px, 16, panelWidth, panelHeight, false, bearing, fov);
        focalLength = drawProjection(px, panelHeight + 30, panelWidth, panelHeight, true, bearing, fov);
    }
    drawMap(bearing, fov, selected, hit);
    const result = projection(hit.distance, selected.offset, focalLength, 1);
    setText('gr-distance', `${hit.distance.toFixed(2)}칸`);
    setText('gr-depth', `${result.depth.toFixed(2)}칸`);
    setText('gr-height', `${result.rawHeight.toFixed(0)} / ${result.correctedHeight.toFixed(0)}px`);
    setText('gr-steps', `${hit.cells.length}개`);
    const shrink = 100 * (1 - result.rawHeight / result.correctedHeight);
    setText(
        'gr-summary',
        `선택 열 ${controls.column.value}% · 벽 셀 (${hit.x}, ${hit.y}) · 전방과 ${Math.abs((selected.offset * 180) / Math.PI).toFixed(1)}° · 거리만 쓰면 높이가 ${shrink.toFixed(1)}% 줄어듭니다.`,
    );
    setText('gr-position', `카메라 (${origin.x.toFixed(2)}, ${origin.y.toFixed(2)}) · 한 칸 = 벽 너비`);
    for (const key of ['bearing', 'fov', 'column', 'resolution'] as const) {
        setText(
            `gr-${key}-value`,
            controls[key].value + (key === 'column' ? '%' : key === 'resolution' ? '열' : '°'),
        );
    }
}

function resize() {
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    draw();
}

function toggleMenu(open: boolean) {
    menu.hidden = !open;
    backdrop.hidden = !open;
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? '설정 메뉴 닫기' : '설정 메뉴 열기');
    syncMenu();
    if (open) document.querySelector<HTMLButtonElement>('#gr-close')!.focus();
    else menuButton.focus();
}

function move(dx: number, dy: number) {
    const next = { x: origin.x + dx, y: origin.y + dy };
    const margin = 0.12;
    if (
        [-margin, margin].every((ox) =>
            [-margin, margin].every((oy) => grid[Math.floor(next.y + oy)]?.[Math.floor(next.x + ox)] === 0),
        )
    )
        origin = next;
    draw();
}

function reset() {
    controls.map.value = 'flat';
    controls.bearing.value = '0';
    controls.fov.value = '90';
    controls.column.value = '90';
    controls.resolution.value = '160';
    grid = makeMap('flat');
    origin = { x: 3.5, y: 5 };
    draw();
}

menuButton.addEventListener('click', () => toggleMenu(Boolean(menu.hidden)), eventOptions);
document.querySelector('#gr-close')!.addEventListener('click', () => toggleMenu(false), eventOptions);
backdrop.addEventListener('click', () => toggleMenu(false), eventOptions);
document.querySelector('#gr-help')!.addEventListener('click', () => dialog.showModal(), eventOptions);
document.querySelector('#gr-dialog-close')!.addEventListener('click', () => dialog.close(), eventOptions);
document.querySelector('#gr-reset')!.addEventListener('click', reset, eventOptions);
document.addEventListener(
    'keydown',
    (event) => {
        if (dialog.open) return;
        if (event.key === 'Escape' && !menu.hidden) {
            event.preventDefault();
            toggleMenu(false);
        }
        trapMenu(event);
    },
    eventOptions,
);
controls.map.addEventListener(
    'change',
    () => {
        grid = makeMap(controls.map.value as 'flat' | 'rooms');
        origin = { x: 3.5, y: 5 };
        draw();
    },
    eventOptions,
);
for (const control of [controls.bearing, controls.fov, controls.column, controls.resolution])
    control.addEventListener('input', draw, eventOptions);
for (const [id, angle] of [
    ['forward', 0],
    ['back', Math.PI],
    ['left', -Math.PI / 2],
    ['right', Math.PI / 2],
] as const) {
    document.querySelector(`#gr-${id}`)!.addEventListener(
        'click',
        () => {
            const a = radians(Number(controls.bearing.value)) + angle;
            move(Math.cos(a) * 0.35, Math.sin(a) * 0.35);
        },
        eventOptions,
    );
}
canvas.addEventListener(
    'click',
    (event) => {
        const rect = canvas.getBoundingClientRect();
        const x = ((event.clientX - rect.left - mapBox.x) * 10) / mapBox.size;
        const y = ((event.clientY - rect.top - mapBox.y) * 10) / mapBox.size;
        if (x >= 0 && x < 10 && y >= 0 && y < 10) move(x - origin.x, y - origin.y);
    },
    eventOptions,
);
const observer = new ResizeObserver(resize);
observer.observe(canvas);
window.addEventListener('pagehide', (event) => {
    observer.disconnect();
    if (!event.persisted) abort.abort();
});
window.addEventListener('pageshow', () => {
    observer.observe(canvas);
    syncMenu();
    resize();
});
resize();
