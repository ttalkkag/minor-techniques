import { bitDepth, pack, unpack, paletteCost, tileCost, makeTile, expandTiles } from './model';
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const inp = (id: string) => $<HTMLInputElement>(id);
const num = (id: string) => Number(inp(id).value);
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
const baseColors = [
    '#233d48',
    '#326c68',
    '#4d9c86',
    '#89b998',
    '#c4d7b0',
    '#eee3bd',
    '#eeb87c',
    '#de8656',
    '#b65445',
    '#883a50',
    '#70496a',
    '#806a97',
    '#a0a4c5',
    '#c5c6d4',
    '#f5eddd',
    '#34524d',
];
const tilePalette = ['#e4eadb', '#4f9f89', '#df945c', '#2b5553'];
let mode: 'palette' | 'tile' = 'palette',
    palette: string[] = [],
    originalPalette: string[] = [],
    indices: number[] = [],
    tiles: number[][] = [],
    map: number[] = [];
const canvas = $<HTMLCanvasElement>('scene'),
    ctx = canvas.getContext('2d')!;
let mapRect = { x: 0, y: 0, size: 0 },
    editorRect = { x: 0, y: 0, size: 0 };
function initPalette() {
    const count = num('colors');
    palette = baseColors.slice(0, count);
    originalPalette = [...palette];
    indices = Array.from(
        { length: 256 },
        (_, i) =>
            Math.floor(
                Math.hypot((i % 16) - 7.5, Math.floor(i / 16) - 7.5) * 1.3 + Math.floor((i % 16) / 4),
            ) % count,
    );
    $<HTMLSelectElement>('color-index').innerHTML = palette
        .map((_, i) => `<option value="${i}">${i}번 색</option>`)
        .join('');
    $<HTMLSelectElement>('color-index').value = String(Math.min(2, count - 1));
    inp('color-value').value = palette[num('color-index')]!;
}
function initTiles() {
    const count = num('originals');
    tiles = Array.from({ length: count }, (_, i) => makeTile(i));
    map = Array.from({ length: 100 }, (_, i) => i % count);
    inp('tile-id').max = String(count - 1);
    inp('tile-id').value = String(selectedTileIndex());
}
function selectedTileIndex() {
    return Math.max(0, Math.min(tiles.length - 1, Math.trunc(num('tile-id')) || 0));
}
function switchMode(next: 'palette' | 'tile') {
    mode = next;
    for (const name of ['palette', 'tile']) {
        $(name + '-controls').hidden = name !== mode;
        $(name + '-mode').setAttribute('aria-pressed', String(name === mode));
    }
    draw();
}
$('palette-mode').addEventListener('click', () => switchMode('palette'));
$('tile-mode').addEventListener('click', () => switchMode('tile'));
function text(s: string, x: number, y: number, color = '#32544e', size = 12) {
    ctx.font = `600 ${size}px -apple-system,sans-serif`;
    ctx.fillStyle = color;
    ctx.fillText(s, x, y);
}
function grid(
    pixels: number[],
    columns: number,
    x: number,
    y: number,
    size: number,
    colors: string[],
    numbers = false,
) {
    const cell = size / columns;
    pixels.forEach((v, i) => {
        ctx.fillStyle = colors[v]!;
        ctx.fillRect(x + (i % columns) * cell, y + Math.floor(i / columns) * cell, cell + 0.15, cell + 0.15);
        if (numbers && cell >= 12) {
            ctx.font = `${Math.max(8, cell * 0.5)}px monospace`;
            const color = colors[v]!;
            const brightness =
                parseInt(color.slice(1, 3), 16) * 0.299 +
                parseInt(color.slice(3, 5), 16) * 0.587 +
                parseInt(color.slice(5, 7), 16) * 0.114;
            ctx.fillStyle = brightness > 150 ? '#233d48' : '#fff';
            ctx.fillText(
                String(v),
                x + (i % columns) * cell + cell * 0.15,
                y + Math.floor(i / columns) * cell + cell * 0.7,
            );
        }
    });
}
function drawPalette(width: number) {
    const cost = paletteCost(256, palette.length),
        bytes = pack(indices, bitDepth(palette.length)),
        decoded = unpack(bytes, bitDepth(palette.length), 256),
        selected = num('color-index');
    const narrow = width < 600,
        size = Math.min(narrow ? (width - 20) / 2 : (width - 80) / 2, 330),
        gap = narrow ? 14 : 42,
        left = (width - 2 * size - gap) / 2,
        top = 42;
    text('초기 팔레트', left, top - 14);
    text('공유 색 편집 후', left + size + gap, top - 14, '#087c70');
    grid(indices, 16, left, top, size, originalPalette, inp('numbers').checked);
    grid(decoded, 16, left + size + gap, top, size, palette, inp('numbers').checked);
    const cell = size / 16;
    ctx.strokeStyle = '#f3b16e';
    ctx.lineWidth = 1.5;
    decoded.forEach((v, i) => {
        if (v === selected)
            ctx.strokeRect(
                left + size + gap + (i % 16) * cell + 0.5,
                top + Math.floor(i / 16) * cell + 0.5,
                cell - 1,
                cell - 1,
            );
    });
    const swatch = Math.min(42, (width - 40) / 8),
        rowWidth = swatch * 8,
        x0 = (width - rowWidth) / 2,
        y0 = top + size + 56;
    text('공유 RGB 색 표 · 테두리 = 선택 번호', x0, y0 - 15);
    palette.forEach((color, i) => {
        const x = x0 + (i % 8) * swatch,
            y = y0 + Math.floor(i / 8) * (swatch + 22);
        ctx.fillStyle = color;
        ctx.fillRect(x + 2, y + 2, swatch - 4, swatch - 4);
        if (i === selected) {
            ctx.strokeStyle = '#dc8748';
            ctx.lineWidth = 3;
            ctx.strokeRect(x, y, swatch, swatch);
        }
        text(String(i), x + swatch * 0.4, y + swatch + 14, '#637871', 11);
    });
    const references = indices.filter((v) => v === selected).length,
        changed = decoded.filter((v, i) => palette[v] !== originalPalette[indices[i]!]).length;
    $('colors-out').textContent = String(palette.length);
    $('result').textContent =
        `RGB24 ${cost.rgb} B → 번호 ${bytes.length} + 색 표 ${cost.table} = ${cost.total} B · ${(cost.rgb / cost.total).toFixed(2)}배`;
    $('detail').textContent =
        `${bitDepth(palette.length)}비트 번호 · 선택 ${selected}번을 ${references}픽셀이 공유 · 초기 대비 ${changed}픽셀 색 변경 · 복원 오류 ${decoded.filter((v, i) => v !== indices[i]).length}`;
    $('byte-label').textContent =
        `실제로 묶은 색 번호 배열 · ${bytes.length} B 중 앞 ${Math.min(bytes.length, 24)} B`;
    $('byte-list').textContent = [...bytes.slice(0, 24)]
        .map((v) => v.toString(16).padStart(2, '0').toUpperCase())
        .join(' ');
}
function drawTiles(width: number) {
    const selected = selectedTileIndex(),
        indexBytes = num('index-bytes'),
        attributeBytes = num('attributes'),
        cost = tileCost(100, tiles.length, indexBytes, attributeBytes);
    const tileBytes = tiles.map((tile) => pack(tile, 2)),
        mapBytes = pack(map, indexBytes * 8),
        decodedMap = unpack(mapBytes, indexBytes * 8, map.length),
        decodedTiles = tileBytes.map((bytes) => unpack(bytes, 2, 64)),
        pixels = expandTiles(decodedTiles, decodedMap, 10),
        original = expandTiles(tiles, map, 10),
        attributes = new Uint8Array(100 * attributeBytes);
    const narrow = width < 600,
        mapSize = Math.min(narrow ? Math.min(width - 24, 290) : (width - 100) * 0.59, 360),
        sourceSize = narrow ? 148 : 192,
        left = narrow ? (width - mapSize) / 2 : (width - mapSize - sourceSize - 70) / 2,
        top = 32;
    text('지도 · 번호가 같은 칸을 강조', left, top - 12);
    grid(pixels, 80, left, top, mapSize, tilePalette);
    mapRect = { x: left, y: top, size: mapSize };
    const cell = mapSize / 10;
    ctx.strokeStyle = '#ee9d55';
    ctx.lineWidth = 2;
    map.forEach((id, i) => {
        const x = left + (i % 10) * cell,
            y = top + Math.floor(i / 10) * cell;
        if (id === selected) {
            ctx.strokeStyle = '#ee9d55';
            ctx.strokeRect(x + 1, y + 1, cell - 2, cell - 2);
        }
        ctx.fillStyle = '#edf1e9dd';
        ctx.fillRect(x + 2, y + cell - 12, 17, 10);
        text(String(id), x + 3, y + cell - 3, '#32544e', 9);
    });
    const sx = narrow ? (width - sourceSize) / 2 : left + mapSize + 70,
        sy = narrow ? top + mapSize + 48 : top + 22;
    text(`타일 ${selected} 원본 · 눌러서 편집`, sx, sy - 14, '#087c70');
    grid(tiles[selected]!, 8, sx, sy, sourceSize, tilePalette, true);
    editorRect = { x: sx, y: sy, size: sourceSize };
    const refs = map.filter((id) => id === selected).length;
    $('originals-out').textContent = String(tiles.length);
    $('result').textContent =
        `칸마다 복사 ${cost.copies} B / 공유 ${cost.pixels} + 번호 ${mapBytes.length} + 속성 ${attributes.length} + 팔레트 12 = ${cost.total} B`;
    $('detail').textContent =
        `선택 원본 ${selected} → ${refs}칸에 반영 · 저장 원본 ${tiles.length}개 · ${cost.copies - cost.total} B 절감 · 복원 6,400픽셀 불일치 ${pixels.filter((v, i) => v !== original[i]).length}`;
    $('byte-label').textContent =
        `타일 ${selected}의 2비트 원본 · ${tileBytes[selected]!.length} B (전체 지도 번호 ${mapBytes.length} B)`;
    $('byte-list').textContent = [...tileBytes[selected]!]
        .map((v) => v.toString(16).padStart(2, '0').toUpperCase())
        .join(' ');
}
function draw() {
    const width = canvas.clientWidth,
        height = canvas.clientHeight,
        ratio = Math.min(devicePixelRatio, 2);
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    ctx.scale(ratio, ratio);
    if (mode === 'palette') drawPalette(width);
    else drawTiles(width);
}
form.addEventListener('input', (e) => {
    const id = (e.target as HTMLElement).id;
    if (id === 'colors') initPalette();
    if (id === 'originals') initTiles();
    if (id === 'color-value') palette[num('color-index')] = inp('color-value').value;
    draw();
});
form.addEventListener('change', (e) => {
    if ((e.target as HTMLElement).id === 'color-index')
        inp('color-value').value = palette[num('color-index')]!;
    if ((e.target as HTMLElement).id === 'tile-id') inp('tile-id').value = String(selectedTileIndex());
    if (['tile-x', 'tile-y'].includes((e.target as HTMLElement).id)) selectedPixel();
    draw();
});
$('swap-color').addEventListener('click', () => {
    palette[num('color-index')] = '#f18b48';
    inp('color-value').value = '#f18b48';
    draw();
});
function editTile(pixel: number) {
    const selected = selectedTileIndex();
    tiles[selected]![pixel] = num('tile-color');
    draw();
}
function selectedPixel() {
    for (const id of ['tile-x', 'tile-y'])
        inp(id).value = String(Math.max(0, Math.min(7, Math.trunc(num(id)) || 0)));
    return num('tile-y') * 8 + num('tile-x');
}
$('edit-tile').addEventListener('click', () => editTile(selectedPixel()));
canvas.addEventListener('pointerdown', (e) => {
    if (mode !== 'tile') return;
    const bounds = canvas.getBoundingClientRect(),
        x = e.clientX - bounds.left,
        y = e.clientY - bounds.top;
    if (x >= mapRect.x && x < mapRect.x + mapRect.size && y >= mapRect.y && y < mapRect.y + mapRect.size) {
        const i =
            Math.floor(((y - mapRect.y) / mapRect.size) * 10) * 10 +
            Math.floor(((x - mapRect.x) / mapRect.size) * 10);
        inp('tile-id').value = String(map[i]);
        draw();
    } else if (
        x >= editorRect.x &&
        x < editorRect.x + editorRect.size &&
        y >= editorRect.y &&
        y < editorRect.y + editorRect.size
    ) {
        inp('tile-x').value = String(Math.floor(((x - editorRect.x) / editorRect.size) * 8));
        inp('tile-y').value = String(Math.floor(((y - editorRect.y) / editorRect.size) * 8));
        editTile(selectedPixel());
    }
});
form.addEventListener('reset', () =>
    requestAnimationFrame(() => {
        initPalette();
        initTiles();
        draw();
    }),
);
const observer = new ResizeObserver(draw);
observer.observe(canvas);
window.addEventListener('pageshow', () => {
    setMenu(!panel.hidden, false);
    draw();
});
initPalette();
initTiles();
draw();
