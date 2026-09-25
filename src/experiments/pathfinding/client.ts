import { astar, reverseField, gridGraph, counterexample } from './model';
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
let goal = 94,
    units = [81, 17, 145],
    targetMessage = '',
    gridBounds = { x: 0, y: 0, cell: 1 };
function draw() {
    const { w, h } = surface();
    if (w <= 24 || h <= 120) return;
    const graphScene = get<HTMLSelectElement>('scene-mode').value === 'graph',
        heuristic = range('heuristic'),
        weight = range('weight');
    range('goal-x');
    range('goal-y');
    if (graphScene) {
        const selected = astar(
                counterexample,
                0,
                3,
                (n) => (n === 2 ? heuristic : 0),
                get<HTMLInputElement>('reopen').checked,
                get<HTMLInputElement>('early').checked,
            ),
            reference = astar(counterexample, 0, 3, () => 0),
            mobile = w < 650,
            pw = mobile ? w : w / 2,
            ph = mobile ? h / 2 : h;
        [selected, reference].forEach((result, index) => {
            const ox = mobile ? 0 : index * pw,
                oy = mobile ? index * ph : 0;
            const locations = [
                    [0.12, 0.5],
                    [0.48, 0.24],
                    [0.48, 0.77],
                    [0.88, 0.5],
                ],
                point = (id: number) => ({
                    x: ox + locations[id][0] * pw,
                    y: oy + 50 + locations[id][1] * (ph - 100),
                });
            textAt(
                index === 0 ? '선택한 A* 구현' : 'Dijkstra 기준 비용',
                ox + pw / 2,
                oy + 26,
                index ? '#0b756b' : '#a7622b',
                16,
            );
            counterexample.forEach((es, u) =>
                es.forEach((e) => {
                    const a = point(u),
                        b = point(e.to),
                        dx = b.x - a.x,
                        dy = b.y - a.y,
                        len = Math.hypot(dx, dy),
                        bx = b.x - (dx / len) * 24,
                        by = b.y - (dy / len) * 24;
                    ctx.strokeStyle = '#a9bfc2';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(bx, by);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(bx, by);
                    ctx.lineTo(bx - (dx / len) * 9 + (dy / len) * 5, by - (dy / len) * 9 - (dx / len) * 5);
                    ctx.lineTo(bx - (dx / len) * 9 - (dy / len) * 5, by - (dy / len) * 9 + (dx / len) * 5);
                    ctx.closePath();
                    ctx.fillStyle = '#a9bfc2';
                    ctx.fill();
                    textAt(String(e.cost), (a.x + b.x) / 2 + 10, (a.y + b.y) / 2 - 8, '#83652e', 14);
                }),
            );
            ctx.beginPath();
            result.path.forEach((id, i) => {
                const p = point(id);
                if (i === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            });
            ctx.strokeStyle = index ? '#078579' : '#d78c43';
            ctx.lineWidth = 5;
            ctx.stroke();
            locations.forEach((_, i) => {
                const p = point(i);
                ctx.beginPath();
                ctx.arc(p.x, p.y, 21, 0, Math.PI * 2);
                ctx.fillStyle = '#f8fcfc';
                ctx.fill();
                ctx.strokeStyle = '#5f7d83';
                ctx.lineWidth = 2;
                ctx.stroke();
                textAt(['S', 'A', 'B', 'G'][i], p.x, p.y + 5, '#244957', 16);
                textAt(
                    `h=${index === 0 && i === 2 ? heuristic : 0}`,
                    p.x - (mobile && i === 1 ? 28 : 0),
                    p.y + 41,
                    '#59757a',
                    12,
                );
            });
        });
        get('metric-0').textContent = String(selected.cost);
        get('metric-1').textContent = String(reference.cost);
        get('metric-2').textContent = `${selected.expansions} / ${selected.reopens}`;
        get('summary').textContent =
            `선택 경로 ${selected.path.map((i) => ['S', 'A', 'B', 'G'][i]).join(' → ')}. ${heuristic > 1 ? 'h(B) > cost(B,A)+h(A)로 일관성이 깨집니다.' : '이 설정은 모든 간선에서 일관성을 만족합니다.'} ${selected.cost === reference.cost ? '기준 최단 비용과 같습니다.' : '기준보다 비용 ' + (selected.cost - reference.cost) + '만큼 깁니다.'}`;
    } else {
        const data = gridGraph(
                weight,
                get<HTMLInputElement>('door').checked,
                get<HTMLInputElement>('zero').checked,
            ),
            { graph, width, height, blocked } = data;
        if (blocked.has(goal)) {
            goal = 94;
            get<HTMLInputElement>('goal-x').value = '14';
            get<HTMLInputElement>('goal-y').value = '5';
            range('goal-x');
            range('goal-y');
            targetMessage = '목표의 문이 닫혀 기본 목표로 옮겼습니다.';
        }
        const algorithm = get<HTMLSelectElement>('algorithm').value,
            chosenGraph = algorithm === 'bfs' ? graph.map((es) => es.map((e) => ({ ...e, cost: 1 }))) : graph;
        const manhattan = (n: number) =>
            Math.abs((n % width) - (goal % width)) +
            Math.abs(Math.floor(n / width) - Math.floor(goal / width));
        const result = astar(chosenGraph, units[0], goal, (n) =>
                algorithm === 'astar' && !get<HTMLInputElement>('zero').checked ? manhattan(n) : 0,
            ),
            reference = astar(graph, units[0], goal, () => 0),
            field = reverseField(graph, goal);
        const cost = result.path.length
            ? result.path
                  .slice(1)
                  .reduce((sum, v, i) => sum + (graph[result.path[i]].find((e) => e.to === v)?.cost ?? 0), 0)
            : Infinity;
        const cell = Math.min((w - 24) / width, (h - 120) / height, 49),
            x = (w - cell * width) / 2,
            y = Math.max(42, (h - cell * height) / 2 - 10);
        gridBounds = { x, y, cell };
        textAt('문이 바뀌면 비용장도 다시 계산 · 지도 클릭으로 목표 변경', w / 2, 24, '#486970', 12);
        const maxDistance = Math.max(...field.distance.filter(Number.isFinite), 1);
        for (let i = 0; i < width * height; i++) {
            const px = x + (i % width) * cell,
                py = y + Math.floor(i / width) * cell;
            ctx.fillStyle = blocked.has(i)
                ? '#4c6570'
                : data.terrain(i) > 1
                  ? '#ead4ac'
                  : !Number.isFinite(field.distance[i])
                    ? '#dee4e7'
                    : `hsl(175 30% ${91 - (field.distance[i] / maxDistance) * 29}%)`;
            ctx.fillRect(px, py, cell - 1, cell - 1);
            if (get<HTMLInputElement>('arrows').checked && field.next[i] >= 0) {
                const next = field.next[i],
                    dx = (next % width) - (i % width),
                    dy = Math.floor(next / width) - Math.floor(i / width),
                    cx = px + cell / 2,
                    cy = py + cell / 2;
                ctx.strokeStyle = '#2c7c7270';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(cx - dx * cell * 0.2, cy - dy * cell * 0.2);
                ctx.lineTo(cx + dx * cell * 0.2, cy + dy * cell * 0.2);
                ctx.lineTo(cx + (dx * 0.05 + dy * 0.11) * cell, cy + (dy * 0.05 - dx * 0.11) * cell);
                ctx.moveTo(cx + dx * cell * 0.2, cy + dy * cell * 0.2);
                ctx.lineTo(cx + (dx * 0.05 - dy * 0.11) * cell, cy + (dy * 0.05 + dx * 0.11) * cell);
                ctx.stroke();
            }
        }
        ctx.beginPath();
        result.path.forEach((i, j) => {
            const px = x + ((i % width) + 0.5) * cell,
                py = y + (Math.floor(i / width) + 0.5) * cell;
            if (j === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        });
        ctx.strokeStyle = '#e7923c';
        ctx.lineWidth = 4;
        ctx.stroke();
        units.forEach((i, index) => {
            const px = x + ((i % width) + 0.5) * cell,
                py = y + (Math.floor(i / width) + 0.5) * cell;
            ctx.beginPath();
            ctx.arc(px, py, cell * 0.26, 0, Math.PI * 2);
            ctx.fillStyle = ['#d1762a', '#276ca3', '#944d87'][index];
            ctx.fill();
        });
        textAt(
            'G',
            x + ((goal % width) + 0.5) * cell,
            y + (Math.floor(goal / width) + 0.69) * cell,
            '#093e42',
            Math.min(21, cell * 0.7),
        );
        textAt(
            '주황: 선택 경로 · 갈색: 진흙 · 화살표: 역탐색 다음 셀',
            w / 2,
            y + height * cell + 30,
            '#577079',
            12,
        );
        get('metric-0').textContent = Number.isFinite(cost) ? String(cost) : '도달 불가';
        get('metric-1').textContent = Number.isFinite(reference.cost) ? String(reference.cost) : '∞';
        get('metric-2').textContent = `${result.expansions} / ${result.reopens}`;
        get('summary').textContent =
            `공유 필드는 ${field.expansions}개 셀을 확정했습니다. ${get<HTMLInputElement>('zero').checked ? '비용 0 셀도 동점으로 덮어쓰지 않아 목표 트리를 유지합니다.' : ''} 세 유닛은 필드를 공유하며 겹침 ${3 - new Set(units).size}개입니다. ${algorithm === 'bfs' ? 'BFS가 고른 경로의 실제 가중 비용을 표시합니다.' : ''} 목표 (${goal % 16},${Math.floor(goal / 16)}). ${targetMessage}`;
    }
}
get('step').addEventListener('click', () => {
    get<HTMLSelectElement>('scene-mode').value = 'grid';
    const { graph } = gridGraph(
            Number(get<HTMLInputElement>('weight').value),
            get<HTMLInputElement>('door').checked,
            get<HTMLInputElement>('zero').checked,
        ),
        field = reverseField(graph, goal);
    units = units.map((u) => (field.next[u] >= 0 ? field.next[u] : u));
    draw();
});
function selectGoal(x: number, y: number) {
    get<HTMLSelectElement>('scene-mode').value = 'grid';
    get<HTMLInputElement>('goal-x').value = String(x);
    get<HTMLInputElement>('goal-y').value = String(y);
    const { blocked } = gridGraph(
        Number(get<HTMLInputElement>('weight').value),
        get<HTMLInputElement>('door').checked,
        get<HTMLInputElement>('zero').checked,
    );
    if (blocked.has(y * 16 + x)) targetMessage = '벽은 목표로 선택할 수 없습니다. 기존 목표를 유지합니다.';
    else {
        goal = y * 16 + x;
        targetMessage = '';
    }
    draw();
}
get('set-goal').addEventListener('click', () =>
    selectGoal(Number(get<HTMLInputElement>('goal-x').value), Number(get<HTMLInputElement>('goal-y').value)),
);
canvas.addEventListener('click', (e) => {
    if (get<HTMLSelectElement>('scene-mode').value !== 'grid') return;
    const r = canvas.getBoundingClientRect(),
        x = Math.floor((e.clientX - r.left - gridBounds.x) / gridBounds.cell),
        y = Math.floor((e.clientY - r.top - gridBounds.y) / gridBounds.cell);
    if (x >= 0 && x < 16 && y >= 0 && y < 10) {
        selectGoal(x, y);
    }
});
document
    .querySelectorAll<HTMLInputElement | HTMLSelectElement>('#settings input,#settings select')
    .forEach((c) => {
        c.addEventListener('input', draw);
        c.addEventListener('change', draw);
    });
get('reset').addEventListener('click', () => {
    goal = 94;
    targetMessage = '';
    get<HTMLInputElement>('goal-x').value = '14';
    get<HTMLInputElement>('goal-y').value = '5';
    units = [81, 17, 145];
    get<HTMLSelectElement>('scene-mode').value = 'graph';
    get<HTMLSelectElement>('algorithm').value = 'astar';
    get<HTMLInputElement>('heuristic').value = '3';
    get<HTMLInputElement>('weight').value = '5';
    for (const id of ['reopen', 'early', 'zero']) get<HTMLInputElement>(id).checked = false;
    for (const id of ['door', 'arrows']) get<HTMLInputElement>(id).checked = true;
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
