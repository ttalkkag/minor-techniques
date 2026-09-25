import { search, edges, maze, names } from './model';
import type { Rules } from './model';
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
function rules(): Rules {
    return {
        keyRoom: Number(get<HTMLSelectElement>('key-room').value),
        keyCount: range('key-count'),
        consumable: get<HTMLInputElement>('consumable').checked,
        secondDoor: get<HTMLInputElement>('second-door').checked,
        jump: range('jump'),
        platform: get<HTMLInputElement>('platform').checked,
        bypass: get<HTMLInputElement>('bypass').checked,
    };
}
function draw() {
    const { w, h } = surface(),
        mobile = w < 650,
        r = rules(),
        mode = get<HTMLSelectElement>('search').value as 'geometry' | 'room' | 'state',
        left = search(r, mode),
        right = search(r, 'state');
    const panelHeight = mobile ? h * 0.33 : h * 0.59,
        diagramWidth = mobile ? w : w / 2;
    [left, right].forEach((result, index) => {
        const ox = mobile ? 0 : (index * w) / 2,
            oy = mobile ? index * panelHeight : 0;
        textAt(
            index === 0 ? '선택한 검사' : '열쇠·문 상태 검사',
            ox + diagramWidth / 2,
            oy + 23,
            index ? '#0b776f' : '#a45b28',
            15,
        );
        const positions = [
            [0.09, 0.6],
            [0.35, 0.6],
            [0.64, 0.6],
            [0.91, 0.6],
            [r.keyRoom === 2 ? 0.64 : 0.35, 0.2],
            [0.48, 0.94],
        ];
        const point = (id: number) => ({
            x: ox + positions[id][0] * diagramWidth,
            y: oy + 47 + positions[id][1] * (panelHeight - 75),
        });
        for (const edge of edges(r).filter((e) => e.from < e.to)) {
            const a = point(edge.from),
                b = point(edge.to);
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.lineWidth = 4;
            ctx.strokeStyle = edge.door !== undefined ? '#cf874b' : '#bccdcf';
            ctx.setLineDash(edge.jump ? [5, 5] : []);
            ctx.stroke();
            ctx.setLineDash([]);
            if (edge.door !== undefined) textAt('🔒', (a.x + b.x) / 2, (a.y + b.y) / 2 - 8, '#a9662d', 15);
            if (edge.jump) textAt('↑3', (a.x + b.x) / 2, (a.y + b.y) / 2 - 6, '#8b632b', 12);
        }
        if (result.found) {
            ctx.beginPath();
            result.path.forEach((s, i) => {
                const p = point(s.room);
                if (i === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            });
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#09877c';
            ctx.stroke();
        }
        positions.forEach((_, id) => {
            const p = point(id);
            ctx.fillStyle = result.rooms.includes(id) ? '#d0e9e2' : '#eef2f3';
            ctx.strokeStyle = id === 4 ? '#dd9b48' : '#617e81';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(p.x, p.y, mobile ? 14 : 20, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            textAt(['S', 'A', 'B', 'E', 'K', 'U'][id], p.x, p.y + 5, '#234852', 14);
        });
    });
    const links = maze(range('seed'), get<HTMLInputElement>('extra').checked),
        my = mobile ? h * 0.72 : h * 0.66,
        size = Math.min((h - my - 20) / 5, (w * 0.45) / 5, 42),
        mx = w / 2 - size * 2.5;
    textAt('방 내부 DFS 미로 · 상위 진행과 별도', w / 2, my - 18, '#526e73', 13);
    ctx.strokeStyle = '#2f847e';
    ctx.lineWidth = Math.max(5, size * 0.34);
    links.forEach(([a, b]) => {
        ctx.beginPath();
        ctx.moveTo(mx + ((a % 5) + 0.5) * size, my + (Math.floor(a / 5) + 0.5) * size);
        ctx.lineTo(mx + ((b % 5) + 0.5) * size, my + (Math.floor(b / 5) + 0.5) * size);
        ctx.stroke();
    });
    for (let i = 0; i < 25; i++) {
        ctx.fillStyle = '#14847b';
        ctx.beginPath();
        ctx.arc(
            mx + ((i % 5) + 0.5) * size,
            my + (Math.floor(i / 5) + 0.5) * size,
            size * 0.19,
            0,
            Math.PI * 2,
        );
        ctx.fill();
    }
    get('metric-0').textContent = left.found ? '도달 가능' : '도달 불가';
    get('metric-1').textContent = right.found ? '도달 가능' : '도달 불가';
    get('metric-2').textContent = `${links.length} / 25`;
    get('summary').textContent =
        `선택 검사 ${left.expanded}개, 상태 검사 ${right.expanded}개 상태 확장. ${right.found ? '실제 경로: ' + right.path.map((s) => `${names[s.room].split(' ').at(-1)}[열쇠${s.keys}]`).join(' → ') : '규칙을 지키는 출구 경로가 없습니다.'} ${links.length === 24 ? 'DFS는 순환 없는 트리입니다.' : '추가 통로로 미로에 순환이 생겼습니다.'}`;
}
document
    .querySelectorAll<HTMLInputElement | HTMLSelectElement>('#settings input,#settings select')
    .forEach((c) => {
        c.addEventListener('input', draw);
        c.addEventListener('change', draw);
    });
get('fix').addEventListener('click', () => {
    get<HTMLSelectElement>('key-room').value = '1';
    get<HTMLInputElement>('platform').checked = false;
    get<HTMLInputElement>('key-count').value = '2';
    draw();
});
get('reset').addEventListener('click', () => {
    get<HTMLSelectElement>('key-room').value = '2';
    get<HTMLSelectElement>('search').value = 'geometry';
    for (const id of ['consumable', 'second-door', 'platform', 'bypass', 'extra'])
        get<HTMLInputElement>(id).checked = false;
    get<HTMLInputElement>('key-count').value = '1';
    get<HTMLInputElement>('jump').value = '2';
    get<HTMLInputElement>('seed').value = '7';
    draw();
});
const observer = new ResizeObserver(draw);
observer.observe(canvas);
window.addEventListener('pagehide', () => observer.disconnect());
window.addEventListener('pageshow', () => {
    observer.observe(canvas);
    draw();
});
draw();
