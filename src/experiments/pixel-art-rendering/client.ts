import {
    colors,
    sprite,
    linearToSrgb,
    displayPosition,
    raster,
    stripeWidths,
    brightnessPair,
    dither,
} from './model';
import type { RGB } from './model';
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const inp = (id: string) => $<HTMLInputElement>(id);
const num = (id: string) => Number(inp(id).value);
const val = (id: string) => $<HTMLSelectElement>(id).value;
const menu = $('menu'),
    panel = $('settings'),
    form = $<HTMLFormElement>('controls'),
    dialog = $<HTMLDialogElement>('explanation');
const menuMedia = matchMedia('(max-width: 620px)');
function overlayMenu() {
    return true;
}
function setMenu(open: boolean, moveFocus = true) {
    panel.hidden = !open;

    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? '설정 메뉴 닫기' : '설정 메뉴 열기');
    const modal = open && overlayMenu();
    panel.setAttribute('role', modal ? 'dialog' : 'complementary');
    if (modal) panel.setAttribute('aria-modal', 'true');
    else panel.removeAttribute('aria-modal');
    for (const child of Array.from(panel.parentElement!.children)) {
        if (child instanceof HTMLElement && child !== panel && child.tagName !== 'NAV')
            child.inert = modal;
    }
    for (const child of Array.from(menu.parentElement!.children))
        if (child instanceof HTMLElement && child !== menu) child.inert = modal;
    if (moveFocus) (open ? $('close-menu') : menu).focus();

}
menu.addEventListener('click', () => setMenu(Boolean(panel.hidden)));
$('close-menu').addEventListener('click', () => setMenu(false));
$('help').addEventListener('click', () => dialog.showModal());
$('close-help').addEventListener('click', () => dialog.close());
document.addEventListener('keydown', (event) => {
    if (dialog.open || panel.hidden) return;
    if (event.key === 'Escape') {
        event.preventDefault();
        setMenu(false);
    } else if (event.key === 'Tab' && overlayMenu()) {
        const controls = Array.from(panel.querySelectorAll<HTMLElement>(
            'button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href]',
        )).filter((control) => control.getClientRects().length > 0);
        const first = controls[0]!, last = controls[controls.length - 1]!;
        if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
            event.preventDefault();
            first.focus();
        }
    }
});
menuMedia.addEventListener('change', () => setMenu(!panel.hidden, !panel.hidden && overlayMenu()));
const canvas = $<HTMLCanvasElement>('scene'),
    ctx = canvas.getContext('2d')!;
let mode: 'raster' | 'color' = 'raster';
function switchMode(next: 'raster' | 'color') {
    mode = next;
    for (const name of ['raster', 'color']) {
        $(name + '-controls').hidden = name !== mode;
        $(name + '-mode').setAttribute('aria-pressed', String(name === mode));
    }
    draw();
}
$('raster-mode').addEventListener('click', () => switchMode('raster'));
$('color-mode').addEventListener('click', () => switchMode('color'));
function rgb(c: RGB) {
    return (
        '#' +
        c
            .map((v) =>
                Math.round(Math.max(0, Math.min(1, linearToSrgb(v))) * 255)
                    .toString(16)
                    .padStart(2, '0'),
            )
            .join('')
    );
}
function text(s: string, x: number, y: number, color = '#32544e', size = 12) {
    ctx.font = `600 ${size}px -apple-system,sans-serif`;
    ctx.fillStyle = color;
    ctx.fillText(s, x, y);
}
function grid(pixels: RGB[], columns: number, x: number, y: number, size: number) {
    const cell = size / columns;
    for (let i = 0; i < pixels.length; i++) {
        ctx.fillStyle = rgb(pixels[i]!);
        ctx.fillRect(x + (i % columns) * cell, y + Math.floor(i / columns) * cell, cell + 0.15, cell + 0.15);
    }
    ctx.strokeStyle = '#658a823c';
    ctx.lineWidth = 0.75;
    for (let i = 0; i <= columns; i++) {
        ctx.beginPath();
        ctx.moveTo(x + i * cell, y);
        ctx.lineTo(x + i * cell, y + size);
        ctx.moveTo(x, y + i * cell);
        ctx.lineTo(x + size, y + i * cell);
        ctx.stroke();
    }
}
function drawRaster(width: number) {
    const scale = num('scale'),
        world = num('world'),
        ppu = num('ppu'),
        snap = inp('snap').checked,
        display = displayPosition(world, ppu, snap),
        filter = val('filter') as 'nearest' | 'linear',
        source = sprite(inp('jagged').checked),
        output = raster(source, scale, display * ppu, filter);
    const narrow = width < 600,
        sourceSize = narrow ? 126 : 224,
        outputSize = narrow ? Math.min(width - 24, 244) : Math.min(350, width * 0.4),
        gap = narrow ? 0 : 72,
        left = narrow ? (width - sourceSize) / 2 : (width - sourceSize - outputSize - gap) / 2,
        top = 33;
    text('원본 8×8 · 작화 격자', left, top - 14);
    grid(
        source.map((i) => colors[i]!),
        8,
        left,
        top,
        sourceSize,
    );
    const ox = narrow ? (width - outputSize) / 2 : left + sourceSize + gap,
        oy = narrow ? top + sourceSize + 45 : top;
    text(`출력 ${output.width}×${output.width} · ${scale}배`, ox, oy - 14, '#087c70');
    grid(output.pixels, output.width, ox, oy, outputSize);
    const widths = stripeWidths(scale),
        stripY = narrow ? oy + outputSize + 43 : top + Math.max(sourceSize, outputSize) + 50,
        stripWidth = Math.min(width - 24, 330),
        sx = (width - stripWidth) / 2,
        cell = stripWidth / widths.reduce((a, b) => a + b, 0);
    let cursor = 0;
    text('4칸 줄무늬 → 출력 칸 수', sx, stripY - 14);
    widths.forEach((count, i) => {
        ctx.fillStyle = ['#72a596', '#c2d9b3', '#d38f63', '#3c6864'][i]!;
        ctx.fillRect(sx + cursor * cell, stripY, count * cell, 24);
        ctx.strokeStyle = '#edf1f3';
        ctx.strokeRect(sx + cursor * cell, stripY, count * cell, 24);
        text(String(count), sx + (cursor + count / 2) * cell - 3, stripY + 17, '#173936');
        cursor += count;
    });
    const colorCount = new Set(output.pixels.map(rgb)).size;
    $('world-out').textContent = world.toFixed(2);
    $('ppu-out').textContent = String(ppu);
    $('result').textContent =
        `실제 x ${world.toFixed(2)} → 표시 x ${display.toFixed(2)} · 출력 이동 ${(display * ppu).toFixed(2)}픽셀 · ${snap ? '스냅 켜짐' : '스냅 꺼짐'}`;
    $('detail').textContent =
        `${scale}배 · 원본 4색 / 출력 ${colorCount}색 · 4칸의 출력 폭 [${widths.join(', ')}] · 원본 ${inp('jagged').checked ? '1픽셀 추가' : '기본 윤곽'}`;
}
function drawColors(width: number) {
    const t = num('phase'),
        pair = brightnessPair(t),
        pattern = dither(t),
        narrow = width < 600,
        cell = narrow ? 82 : 114,
        left = narrow ? (width - cell * 2) / 2 : (width - 2 * cell - 235 - 75) / 2,
        top = 55;
    text('고정 두 칸 · 색으로 중심 이동', left, top - 20);
    pair.forEach((b, i) => {
        ctx.fillStyle = rgb([b, b, b]);
        ctx.fillRect(left + i * cell, top, cell, cell);
        ctx.strokeStyle = '#4d7e7444';
        ctx.strokeRect(left + i * cell, top, cell, cell);
        text(b.toFixed(2), left + i * cell + cell / 2 - 14, top + cell + 23);
    });
    const centroid = left + cell * (0.5 + t);
    ctx.strokeStyle = '#dc894d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centroid, top + cell + 32);
    ctx.lineTo(centroid, top + cell + 46);
    ctx.stroke();
    text(`밝기 중심 ${t.toFixed(2)} · 좌표 고정`, left, top + cell + 68, '#ae6333');
    const size = narrow ? 196 : 235,
        dx = narrow ? (width - size) / 2 : left + cell * 2 + 75,
        dy = narrow ? top + cell + 132 : top;
    text('공간 디더링 · 두 색의 배치', dx, dy - 20, '#087c70');
    grid(
        pattern.map((v) => (v ? [0.9, 0.64, 0.32] : [0.025, 0.09, 0.105])),
        8,
        dx,
        dy,
        size,
    );
    const lit = pattern.reduce((a, b) => a + b, 0);
    text(`밝은 칸 ${lit}/64`, dx, dy + size + 24);
    $('phase-out').textContent = t.toFixed(2);
    $('result').textContent =
        `선형 밝기 (${pair[0].toFixed(2)}, ${pair[1].toFixed(2)}) · 합 ${(pair[0] + pair[1]).toFixed(2)} · 밝기 중심 ${t.toFixed(2)}픽셀`;
    $('detail').textContent =
        `디더링 밝은 면적 ${((lit / 64) * 100).toFixed(0)}% · 저장 색 ${new Set(pattern).size}개 · 두 방식 모두 픽셀 위치 고정`;
}
function draw() {
    const width = canvas.clientWidth,
        height = canvas.clientHeight,
        ratio = Math.min(devicePixelRatio, 2);
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    ctx.scale(ratio, ratio);
    if (mode === 'raster') drawRaster(width);
    else drawColors(width);
}
form.addEventListener('input', draw);
form.addEventListener('change', draw);
$('integer').addEventListener('click', () => {
    $<HTMLSelectElement>('scale').value = '2';
    $<HTMLSelectElement>('filter').value = 'nearest';
    draw();
});
$('next-frame').addEventListener('click', () => {
    inp('phase').value = String((num('phase') + 0.25) % 1.25);
    draw();
});
form.addEventListener('reset', () => requestAnimationFrame(draw));
const observer = new ResizeObserver(draw);
observer.observe(canvas);
window.addEventListener('pageshow', () => {
    setMenu(!panel.hidden, false);
    draw();
});
draw();
