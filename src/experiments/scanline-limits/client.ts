import { makeSprites, selectLine } from './model';
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>('canvas');
const ctx = canvas.getContext('2d')!;
const ranges = ['count', 'limit', 'offset', 'line'] as const;
const pixels = [
    '00111100',
    '01111110',
    '11011011',
    '11111111',
    '00100100',
    '01011010',
    '10100101',
    '01000010',
];
let frame = 0;
let observed = 0;
let counts: number[] = [];
let playing = false;
let timer = 0;
const value = (id: string) => Number($<HTMLInputElement>(id).value);
const mode = () => $<HTMLSelectElement>('mode').value;
const sprites = () => makeSprites(value('count'), value('pieces'), value('offset'));
const lineResult = (y: number) =>
    selectLine(sprites(), y, value('limit'), frame, mode(), $<HTMLInputElement>('protect').checked);
function draw() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const ratio = Math.min(devicePixelRatio, 2);
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const items = sprites();
    const worldWidth = Math.max(180, value('count') * 18 + 24);
    const scale = (width - 28) / worldWidth;
    const sy = (height - 55) / 96;
    const X = (x: number) => 14 + x * scale;
    const Y = (y: number) => 16 + y * sy;
    ctx.clearRect(0, 0, width, height);
    for (const s of items) {
        ctx.strokeStyle = '#93aaa8';
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(X(s.x), Y(s.y), s.size * scale, s.size * sy);
    }
    ctx.setLineDash([]);
    for (let y = 0; y < 96; y++) {
        for (const s of lineResult(y).selected) {
            if ($<HTMLInputElement>('transparent').checked && s.owner === value('count') - 1) continue;
            ctx.fillStyle = s.owner === 0 ? '#b96f43' : '#2c8d81';
            for (let x = 0; x < 8; x++) {
                if (pixels[y - s.y]![x] === '1') ctx.fillRect(X(s.x + x), Y(y), scale + 0.2, sy + 0.2);
            }
        }
    }
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#425f69';
    for (let i = 0; i < value('count'); i++) ctx.fillText(String(i + 1), X(12 + i * 18), height - 12);
    ctx.strokeStyle = '#ba6736';
    ctx.beginPath();
    ctx.moveTo(14, Y(value('line')));
    ctx.lineTo(width - 14, Y(value('line')));
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.fillText(`y = ${value('line')}`, 14, 14);
    const result = lineResult(value('line'));
    const names = (list: typeof items) =>
        list
            .map((s) => `${s.owner + 1}${value('pieces') > 1 ? `-${(s.id % value('pieces')) + 1}` : ''}`)
            .join(', ') || '없음';
    $('candidates').textContent =
        `${items.length}개 조각 중 ${result.candidates.length}개\n순서: ${names(result.candidates)}`;
    $('selected').textContent = `선택 ${result.selected.length}개: ${names(result.selected)}`;
    $('missing').textContent = `누락 ${result.missing.length}개: ${names(result.missing)}`;
    $('history').textContent = observed
        ? `${observed}프레임 관찰\n${items.map((s) => `${s.id + 1}번 ${counts[s.id] || 0}/${observed}`).join(' · ')}`
        : '다음 프레임을 눌러 표시 횟수를 기록하세요.';
    $('frame').textContent = `${frame} FRAME`;
    for (const id of ranges) $(`${id}-value`).textContent = String(value(id));
}
function stop() {
    playing = false;
    clearInterval(timer);
    $('play').textContent = '관찰 재생';
}
function reset() {
    stop();
    frame = 0;
    observed = 0;
    counts = [];
    draw();
}
function step() {
    for (const s of lineResult(value('line')).selected) counts[s.id] = (counts[s.id] || 0) + 1;
    observed++;
    frame++;
    draw();
}
for (const id of [...ranges, 'protect', 'transparent']) $(id).addEventListener('input', reset);
for (const id of ['pieces', 'mode']) $(id).addEventListener('change', reset);
$('reset').addEventListener('click', () => {
    for (const [id, initial] of Object.entries({ count: '9', limit: '8', offset: '0', line: '43' }))
        $<HTMLInputElement>(id).value = initial;
    $<HTMLSelectElement>('pieces').value = '1';
    $<HTMLSelectElement>('mode').value = 'fixed';
    $<HTMLInputElement>('protect').checked = false;
    $<HTMLInputElement>('transparent').checked = false;
    reset();
});
$('step').addEventListener('click', () => {
    stop();
    step();
});
$('play').addEventListener('click', () => {
    if (playing) stop();
    else {
        playing = true;
        $('play').textContent = '일시 정지';
        timer = window.setInterval(step, 220);
    }
});
$('spread').addEventListener('click', () => {
    $<HTMLInputElement>('offset').value = String(value('pieces') === 4 ? 16 : 8);
    reset();
});
const media = matchMedia('(max-width: 800px)');
const panel = $('settings'), menuButton = $('menu');
const dialog = $<HTMLDialogElement>('explanation');
function menu(open: boolean, moveFocus = true) {
    panel.hidden = !open;
    $('scanline-lab').classList.toggle('open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? '설정 메뉴 접기' : '설정 메뉴 열기');
    const modal = open && media.matches;
    $('backdrop').hidden = !modal;
    panel.setAttribute('role', modal ? 'dialog' : 'complementary');
    if (modal) panel.setAttribute('aria-modal', 'true');
    else panel.removeAttribute('aria-modal');
    for (const child of Array.from(panel.parentElement!.children))
        if (child instanceof HTMLElement && child !== panel && child.id !== 'backdrop' && child.tagName !== 'NAV')
            child.inert = modal;
    for (const child of Array.from(menuButton.parentElement!.children))
        if (child instanceof HTMLElement && child !== menuButton) child.inert = modal;
    if (moveFocus) (open ? $('close-menu') : menuButton).focus();
}
menuButton.addEventListener('click', () => menu(Boolean(panel.hidden)));
$('close-menu').addEventListener('click', () => menu(false));
$('backdrop').addEventListener('click', () => menu(false));
media.addEventListener('change', () => menu(!media.matches, media.matches));
$('explain').addEventListener('click', () => {
    stop();
    dialog.showModal();
});
$('close-explanation').addEventListener('click', () => dialog.close());
document.addEventListener('keydown', (event) => {
    if (dialog.open || panel.hidden) return;
    if (event.key === 'Escape') {
        event.preventDefault();
        menu(false);
    } else if (event.key === 'Tab' && media.matches) {
        const controls = Array.from(panel.querySelectorAll<HTMLElement>('button, input, select'));
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
document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
});
window.addEventListener('pagehide', stop);
window.addEventListener('pageshow', () => {
    menu(!panel.hidden, false);
    draw();
});
new ResizeObserver(draw).observe(canvas);
menu(!media.matches, false);
draw();
