import { encodeParty, decodeParty, bitplanes, restorePixels, rle, unrle, tilePreset } from './model';
import type { Member } from './model';
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const input = (id: string) => $<HTMLInputElement>(id);
const value = (id: string) => $<HTMLSelectElement>(id).value;
const num = (id: string) => Number(input(id).value);
const hex = (values: number[]) => values.map((v) => v.toString(16).padStart(2, '0').toUpperCase()).join(' ');
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
let mode: 'party' | 'image' = 'party',
    pixels = tilePreset('stripe');
let members: Member[] = Array.from({ length: 6 }, (_, i) => ({ level: 20, species: 33 + i, move: null }));
const canvas = $<HTMLCanvasElement>('scene'),
    ctx = canvas.getContext('2d')!;
let sourceRect = { x: 0, y: 0, size: 1 };
function memberInputs() {
    const count = num('count');
    $('members').innerHTML = members
        .slice(0, count)
        .map(
            (m, i) =>
                `<div class="inline-fields"><label for="level-${i}">${i + 1}번 레벨<input id="level-${i}" data-slot="${i}" data-field="level" type="number" min="1" max="100" value="${m.level}" /></label><label for="species-${i}">종 번호<input id="species-${i}" data-slot="${i}" data-field="species" type="number" min="1" max="254" value="${m.species}" /></label></div>`,
        )
        .join('');
}
function switchMode(next: 'party' | 'image') {
    mode = next;
    for (const name of ['party', 'image']) {
        $(name + '-stage').hidden = name !== mode;
        $(name + '-controls').hidden = name !== mode;
        $(name + '-mode').setAttribute('aria-pressed', String(name === mode));
    }
    draw();
}
$('party-mode').addEventListener('click', () => switchMode('party'));
$('image-mode').addEventListener('click', () => switchMode('image'));
function drawParty() {
    const count = num('count');
    $('count-out').textContent = String(count);
    const party = members.slice(0, count).map((p) => ({ ...p, move: null as number | null }));
    const exception = input('exception').checked ? [Math.min(2, count), 99, 0] : [];
    if (exception.length) party[exception[0]! - 1]!.move = 99;
    const bytes = encodeParty(party, value('format') as 'auto' | 'pairs'),
        restored = decodeParty(bytes, exception.length ? exception : [0]);
    const cards = (rows: Member[]) =>
        rows
            .map(
                (p, i) =>
                    `<div class="member"><b>0x${p.species.toString(16).toUpperCase()}</b><div>${i + 1}번 · 레벨 ${p.level}<small>종 ${p.species} · 기술 ${p.move === null ? '기본값' : p.move + ' (예외)'}</small></div></div>`,
            )
            .join('');
    $('party-before').innerHTML = cards(party);
    $('party-after').innerHTML = cards(restored);
    $('party-format').textContent =
        `${bytes[0] === 255 ? 'FF 개별 레벨·종' : '공통 레벨 + 종 목록'} · 종료 00 포함 ${bytes.length} B`;
    $('party-bytes').textContent = hex(bytes);
    $('exception-label').textContent = `별도 기술 예외 · ${exception.length} B`;
    $('exception-bytes').textContent = exception.length ? hex(exception) : '없음 · 별도 표 저장 안 함';
    const errors = party.filter((p, i) => JSON.stringify(p) !== JSON.stringify(restored[i])).length;
    $('result').textContent =
        `저장 ${bytes.length} + 예외 ${exception.length} = ${bytes.length + exception.length} B · 개별 형식 기준 ${count * 2 + 2 + exception.length} B`;
    $('detail').textContent =
        `복원 ${count}명 · 다른 레코드 ${errors}개 · ${party.every((p) => p.level === party[0]!.level) ? '공통 레벨 사용 가능' : '서로 다른 레벨: 개별 형식 필요'}`;
}
const palette = ['#eff4df', '#afceaa', '#3f887b', '#234745'];
function grid(data: number[], x: number, y: number, size: number, colors: string[]) {
    const cell = size / 8;
    for (let i = 0; i < 64; i++) {
        ctx.fillStyle = colors[data[i]!]!;
        ctx.fillRect(x + (i % 8) * cell, y + Math.floor(i / 8) * cell, cell, cell);
    }
    ctx.strokeStyle = '#738c8144';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 8; i++) {
        ctx.beginPath();
        ctx.moveTo(x + i * cell, y);
        ctx.lineTo(x + i * cell, y + size);
        ctx.moveTo(x, y + i * cell);
        ctx.lineTo(x + size, y + i * cell);
        ctx.stroke();
    }
}
function label(s: string, x: number, y: number, color = '#32544e') {
    ctx.font = '600 12px -apple-system,sans-serif';
    ctx.fillStyle = color;
    ctx.fillText(s, x, y);
}
function drawImage() {
    const width = canvas.clientWidth,
        height = canvas.clientHeight;
    if (!width) return;
    const ratio = Math.min(devicePixelRatio, 2);
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    ctx.scale(ratio, ratio);
    const planar = value('layout') === 'planar',
        raw = bitplanes(pixels, planar),
        packed = rle(raw, planar),
        decoded = unrle(packed),
        restored = restorePixels(decoded.data, decoded.planar);
    const size = Math.min((width - 30) / 2, 190),
        gap = width < 600 ? 16 : 70,
        left = (width - 2 * size - gap) / 2,
        top = 34;
    label('입력 · 눌러서 편집', left, top - 12);
    label('RLE에서 복원', left + size + gap, top - 12, '#087c70');
    grid(pixels, left, top, size, palette);
    grid(restored, left + size + gap, top, size, palette);
    sourceRect = { x: left, y: top, size };
    const y2 = top + size + 52;
    label('하위 비트 · 0 또는 1', left, y2 - 12);
    label('상위 비트 · 0 또는 1', left + size + gap, y2 - 12);
    grid(
        pixels.map((v) => v & 1),
        left,
        y2,
        size,
        ['#e2eae6', '#348a7b'],
    );
    grid(
        pixels.map((v) => (v >> 1) & 1),
        left + size + gap,
        y2,
        size,
        ['#e2eae6', '#d8874e'],
    );
    $('raw-bytes').textContent = hex(raw);
    $('rle-bytes').textContent = hex(packed);
    const a = rle(bitplanes(pixels, false), false).length,
        b = rle(bitplanes(pixels, true), true).length,
        mismatch = pixels.filter((v, i) => v !== restored[i]).length;
    $('result').textContent =
        `원시 16 B → 선택 RLE ${packed.length} B · 반복 ${(packed.length - 1) / 2}개 · 행별 ${a} B / 평면별 ${b} B`;
    $('detail').textContent =
        `복원 버퍼 ${decoded.data.length} B · 64픽셀 중 불일치 ${mismatch}개 · 1 B 배치 헤더 포함`;
}
function draw() {
    if (mode === 'party') drawParty();
    else drawImage();
}
form.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    if (target.dataset.slot !== undefined) {
        const slot = Number(target.dataset.slot),
            field = target.dataset.field as 'level' | 'species';
        members[slot]![field] = Math.max(
            1,
            Math.min(field === 'level' ? 100 : 254, Math.trunc(Number(target.value)) || 1),
        );
    }
    if (target.id === 'count') memberInputs();
    draw();
});
form.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement;
    if (target.dataset.slot !== undefined) {
        const field = target.dataset.field as 'level' | 'species';
        target.value = String(members[Number(target.dataset.slot)]![field]);
    }
    if (target.id === 'preset') pixels = tilePreset(value('preset'));
    draw();
});
$('different').addEventListener('click', () => {
    input('count').value = '3';
    [20, 22, 25].forEach((level, i) => (members[i]!.level = level));
    memberInputs();
    draw();
});
function paint(x: number, y: number) {
    pixels[Math.max(0, Math.min(7, y)) * 8 + Math.max(0, Math.min(7, x))] = num('paint');
    draw();
}
$('paint-pixel').addEventListener('click', () =>
    paint(Math.round(num('pixel-x')), Math.round(num('pixel-y'))),
);
canvas.addEventListener('pointerdown', (e) => {
    const b = canvas.getBoundingClientRect(),
        x = e.clientX - b.left - sourceRect.x,
        y = e.clientY - b.top - sourceRect.y;
    if (x >= 0 && y >= 0 && x < sourceRect.size && y < sourceRect.size) {
        input('pixel-x').value = String(Math.floor((x / sourceRect.size) * 8));
        input('pixel-y').value = String(Math.floor((y / sourceRect.size) * 8));
        paint(num('pixel-x'), num('pixel-y'));
    }
});
form.addEventListener('reset', () =>
    requestAnimationFrame(() => {
        members = Array.from({ length: 6 }, (_, i) => ({ level: 20, species: 33 + i, move: null }));
        pixels = tilePreset('stripe');
        memberInputs();
        draw();
    }),
);
const observer = new ResizeObserver(() => {
    if (mode === 'image') draw();
});
observer.observe(canvas);
window.addEventListener('pageshow', () => {
    setMenu(!panel.hidden, false);
    draw();
});
memberInputs();
draw();
