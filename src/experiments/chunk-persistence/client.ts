import { createPlayback } from '../../components/experiment-playback';
import { SIZE, address, baseCell, effectiveCell, edit, selectionBounds, validSave } from './model';
import type { Save } from './model';
const get = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = get<HTMLCanvasElement>('scene'),
    ctx = canvas.getContext('2d')!;
const info = get<HTMLDialogElement>('info');
get('explain').addEventListener('click', () => info.showModal());
get('close-info').addEventListener('click', () => info.close());
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
const storageKey = 'game-lab-chunk-persistence-v1';
const fresh = (): Save => ({ seed: 7, version: 1, deltas: {} });
function readSave(): Save {
    try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
            const parsed: unknown = JSON.parse(raw);
            if (validSave(parsed)) return parsed;
        }
    } catch {}
    return fresh();
}
let world = readSave(),
    resident = new Map<number, number[]>(),
    dirty = new Set<number>(),
    message = '빈칸도 수정 기록으로 남겨 보세요.';
let panels: { x: number; y: number; size: number; chunk: number }[] = [];
const selectedX = get<HTMLInputElement>('cell-x'),
    selectedY = get<HTMLInputElement>('cell-y');
const version = get<HTMLSelectElement>('version'),
    compatibility = get<HTMLSelectElement>('compatibility'),
    mode = get<HTMLSelectElement>('mode');
const activeVersion = () => (compatibility.value === 'pin' ? world.version : Number(version.value));
function loadChunk(chunk: number) {
    if (!resident.has(chunk)) {
        const cells: number[] = [];
        for (let y = 0; y < SIZE; y++)
            for (let x = 0; x < SIZE; x++)
                cells.push(effectiveCell(chunk * SIZE + x, y, world, activeVersion()));
        resident.set(chunk, cells);
    }
}
function rebuild() {
    resident = new Map();
    const bounds = selectionBounds(Number(selectedX.value));
    selectedX.min = String(bounds.min);
    selectedX.max = String(bounds.max);
    const center = address(Number(selectedX.value)).chunk;
    for (let c = center - 1; c <= center + 1; c++) loadChunk(c);
}
function save() {
    try {
        world.version = activeVersion();
        localStorage.setItem(storageKey, JSON.stringify(world));
        dirty.clear();
        message = '수정 기록 저장 완료. 페이지를 다시 열어도 읽습니다.';
        return true;
    } catch {
        message = '브라우저 저장에 실패했습니다. dirty 청크를 해제하지 않습니다.';
        return false;
    }
}
function draw() {
    const { w, h } = surface(),
        mobile = w < 650,
        center = address(Number(selectedX.value)).chunk;
    panels = [];
    for (let i = 0; i < 3; i++) {
        const c = center + i - 1;
        loadChunk(c);
        const cell = Math.min(
            mobile ? (h / 3 - 68) / 8 : (w - 90) / 3 / 8,
            mobile ? (w - 90) / 8 : (h - 130) / 8,
            42,
        );
        const px = mobile ? (w - cell * 8) / 2 : (w / 3) * i + (w / 3 - cell * 8) / 2,
            py = mobile ? i * (h / 3) + 35 : (h - cell * 8) / 2;
        textAt(
            `청크 ${c} · x ${c * 8}…${c * 8 + 7}`,
            px + cell * 4,
            py - 17,
            c === center ? '#06746c' : '#5c6f76',
            14,
        );
        panels.push({ x: px, y: py, size: cell, chunk: c });
        const cells = resident.get(c)!;
        for (let y = 0; y < 8; y++)
            for (let x = 0; x < 8; x++) {
                const wx = c * 8 + x,
                    value = cells[x + 8 * y],
                    dx = px + x * cell,
                    dy = py + (7 - y) * cell,
                    key = `${wx},${y}`,
                    changed = Object.hasOwn(world.deltas, key);
                ctx.fillStyle = get<HTMLInputElement>('visible').checked
                    ? value === 0
                        ? '#f6faf9'
                        : changed
                          ? '#2b8c80'
                          : '#627b78'
                    : '#e1e8e9';
                ctx.fillRect(dx, dy, cell - 1, cell - 1);
                if (changed) {
                    ctx.strokeStyle = world.deltas[key] === 0 ? '#d98c48' : '#107f77';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(dx + 2, dy + 2, cell - 5, cell - 5);
                }
                if (wx === Number(selectedX.value) && y === Number(selectedY.value)) {
                    ctx.strokeStyle = '#f08331';
                    ctx.lineWidth = 3;
                    ctx.strokeRect(dx + 1, dy + 1, cell - 3, cell - 3);
                }
            }
        textAt(
            dirty.has(c) ? '상주 · dirty · 저장 필요' : '상주 · 저장과 일치',
            px + cell * 4,
            py + cell * 8 + 20,
            dirty.has(c) ? '#a75b23' : '#52716f',
            12,
        );
    }
    const a = address(Number(selectedX.value));
    range('cell-x');
    range('cell-y');
    get('metric-0').textContent = `${Object.keys(world.deltas).length}개`;
    get('metric-1').textContent = `${resident.size} / ${dirty.size}`;
    get('metric-2').textContent = `v${activeVersion()} / v${readSave().version}`;
    get('summary').textContent =
        `선택 (${selectedX.value}, ${selectedY.value}) → 청크 ${a.chunk}, 로컬 x ${a.local}. 기본=${baseCell(Number(selectedX.value), Number(selectedY.value), world.seed, activeVersion())}, 현재=${effectiveCell(Number(selectedX.value), Number(selectedY.value), world, activeVersion())}. ${message}`;
    get('playback-status').textContent =
        `셀 (${selectedX.value}, ${selectedY.value}) · 기본 ${baseCell(Number(selectedX.value), Number(selectedY.value), world.seed, activeVersion())} → 적용 ${effectiveCell(Number(selectedX.value), Number(selectedY.value), world, activeVersion())}`;
}
const playback = createPlayback({
    interval: 500,
    advance: () => {
        const { chunk, local } = address(Number(selectedX.value));
        selectedX.value = String(chunk * SIZE + ((local + 1) % SIZE));
        rebuild();
        draw();
    },
});
for (const id of ['remove', 'place', 'travel', 'save', 'reload'])
    get(id).addEventListener('click', playback.pause);
function change(value: number) {
    const x = Number(selectedX.value),
        y = Number(selectedY.value);
    world = edit(world, x, y, value);
    dirty.add(address(x).chunk);
    const boundary = address(x).local === 0 || address(x).local === 7;
    message = `${value === 0 ? '빈칸 0' : '블록 1'} 수정 기록을 추가했습니다.${boundary ? ' 경계 편집: 이웃 메시도 갱신 대상입니다.' : ''}`;
    rebuild();
    draw();
}
get('remove').addEventListener('click', () => change(0));
get('place').addEventListener('click', () => change(1));
get('travel').addEventListener('click', () => {
    if (mode.value === 'delta' && !save()) {
        draw();
        return;
    }
    const lost = dirty.size;
    world = readSave();
    dirty.clear();
    resident.clear();
    loadChunk(100);
    resident.clear();
    rebuild();
    message =
        mode.value === 'delta'
            ? '먼 청크 100 방문 후 저장된 수정으로 복원했습니다.'
            : `먼 곳을 다녀왔습니다. 저장하지 않은 dirty 청크 ${lost}개의 변경은 사라졌습니다.`;
    draw();
});
get('save').addEventListener('click', () => {
    save();
    draw();
});
get('reload').addEventListener('click', () => {
    world = readSave();
    dirty.clear();
    rebuild();
    message = '메모리를 버리고 브라우저 저장 기록에서 읽었습니다.';
    draw();
});
[selectedX, selectedY].forEach((c) =>
    c.addEventListener('input', () => {
        playback.pause();
        rebuild();
        draw();
    }),
);
[version, compatibility].forEach((c) =>
    c.addEventListener('change', () => {
        playback.pause();
        rebuild();
        message = '버전 정책에 따라 기본 지형을 다시 평가했습니다.';
        draw();
    }),
);
get('mode').addEventListener('change', playback.pause);
get('visible').addEventListener('change', () => {
    playback.pause();
    draw();
});
canvas.addEventListener('click', (e) => {
    const r = canvas.getBoundingClientRect(),
        x = e.clientX - r.left,
        y = e.clientY - r.top;
    const p = panels.find((p) => x >= p.x && x < p.x + p.size * 8 && y >= p.y && y < p.y + p.size * 8);
    if (p) {
        playback.pause();
        selectedX.value = String(p.chunk * 8 + Math.floor((x - p.x) / p.size));
        selectedY.value = String(7 - Math.floor((y - p.y) / p.size));
        rebuild();
        draw();
    }
});
get('reset').addEventListener('click', () => {
    try {
        localStorage.removeItem(storageKey);
    } catch {}
    world = fresh();
    dirty.clear();
    selectedX.value = '-1';
    selectedY.value = '1';
    version.value = '1';
    compatibility.value = 'pin';
    mode.value = 'delta';
    get<HTMLInputElement>('visible').checked = true;
    message = '새 월드로 초기화했습니다.';
    rebuild();
    draw();
});
const observer = new ResizeObserver(draw);
observer.observe(canvas);
window.addEventListener('pagehide', () => observer.disconnect());
window.addEventListener('pageshow', () => {
    observer.observe(canvas);
    draw();
});
rebuild();
draw();
