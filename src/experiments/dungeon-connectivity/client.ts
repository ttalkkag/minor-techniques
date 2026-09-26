import { createPlayback } from '../../components/experiment-playback';
import { search, edges, maze, names } from './model';
import type { Rules } from './model';
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
let progress = 0;
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
        const visited = result.rooms.slice(0, progress);
        if (result.found && progress >= result.rooms.length) {
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
            ctx.fillStyle = visited.includes(id) ? '#d0e9e2' : '#eef2f3';
            ctx.strokeStyle = id === visited.at(-1) ? '#df873a' : id === 4 ? '#dd9b48' : '#617e81';
            ctx.lineWidth = id === visited.at(-1) ? 4 : 2;
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
    links.slice(0, progress).forEach(([a, b]) => {
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
    get('metric-0').textContent =
        progress < left.rooms.length ? '방 방문 확인 중' : left.found ? '도달 가능' : '도달 불가';
    get('metric-1').textContent =
        progress < right.rooms.length ? '방 방문 확인 중' : right.found ? '도달 가능' : '도달 불가';
    get('metric-2').textContent = `${Math.min(progress, links.length)} / 25`;
    get('playback-status').textContent =
        `방 첫 방문 ${Math.min(progress, left.rooms.length)}/${left.rooms.length} · 상태 검사 ${Math.min(progress, right.rooms.length)}/${right.rooms.length} · 미로 통로 ${Math.min(progress, links.length)}/${links.length}`;
    get('summary').textContent =
        `선택 검사 ${left.expanded}개, 상태 검사 ${right.expanded}개 상태 확장. ${right.found ? '실제 경로: ' + right.path.map((s) => `${names[s.room].split(' ').at(-1)}[열쇠${s.keys}]`).join(' → ') : '규칙을 지키는 출구 경로가 없습니다.'} ${links.length === 24 ? 'DFS는 순환 없는 트리입니다.' : '추가 통로로 미로에 순환이 생겼습니다.'} 재생은 각 방의 첫 방문과 미로 통로의 생성 순서를 보여 줍니다.`;
}
const playback = createPlayback({
    interval: 450,
    advance: () => {
        const total = maze(
            Number(get<HTMLInputElement>('seed').value),
            get<HTMLInputElement>('extra').checked,
        ).length;
        progress = progress >= total ? 1 : progress + 1;
        draw();
        return progress < total;
    },
});
function restart() {
    playback.pause();
    progress = 0;
    draw();
}
document
    .querySelectorAll<HTMLInputElement | HTMLSelectElement>('#settings input,#settings select')
    .forEach((c) => {
        c.addEventListener('input', restart);
        c.addEventListener('change', restart);
    });
get('fix').addEventListener('click', () => {
    get<HTMLSelectElement>('key-room').value = '1';
    get<HTMLInputElement>('platform').checked = false;
    get<HTMLInputElement>('key-count').value = '2';
    restart();
});
get('reset').addEventListener('click', () => {
    get<HTMLSelectElement>('key-room').value = '2';
    get<HTMLSelectElement>('search').value = 'geometry';
    for (const id of ['consumable', 'second-door', 'platform', 'bypass', 'extra'])
        get<HTMLInputElement>(id).checked = false;
    get<HTMLInputElement>('key-count').value = '1';
    get<HTMLInputElement>('jump').value = '2';
    get<HTMLInputElement>('seed').value = '7';
    restart();
});
const observer = new ResizeObserver(draw);
observer.observe(canvas);
window.addEventListener('pagehide', () => observer.disconnect());
window.addEventListener('pageshow', () => {
    observer.observe(canvas);
    draw();
});
draw();
