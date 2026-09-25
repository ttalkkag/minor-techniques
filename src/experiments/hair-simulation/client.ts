const get = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const input = (id: string) => get<HTMLInputElement>(id);
const number = (id: string) => Number(input(id).value);
const text = (id: string, value: string) => {
    const element = get(id);
    if (element.textContent !== value) element.textContent = value;
};
const settings = get('settings');
const menu = get<HTMLButtonElement>('menu');
const dialog = get<HTMLDialogElement>('explanation');
const background = [
    ...Array.from(settings.parentElement!.children).filter(
        (element) => element !== settings && element !== menu.parentElement && element !== dialog,
    ),
    ...Array.from(menu.parentElement!.children).filter((element) => element !== menu),
] as HTMLElement[];
function closeMenu(returnFocus = true) {
    if (settings.hidden) return;
    settings.hidden = true;
    menu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-label', '설정 메뉴 열기');
    background.forEach((element) => (element.inert = false));
    document.body.style.overflow = '';
    if (returnFocus) menu.focus();
}
menu.addEventListener('click', () => {
    if (!settings.hidden) return closeMenu();
    settings.hidden = false;
    settings.scrollTop = 0;
    menu.setAttribute('aria-expanded', 'true');
    menu.setAttribute('aria-label', '설정 메뉴 닫기');
    background.forEach((element) => (element.inert = true));
    document.body.style.overflow = 'hidden';
    get('close-menu').focus();
});
get('close-menu').addEventListener('click', () => closeMenu());
get('explain').addEventListener('click', () => dialog.showModal());
get('close-explain').addEventListener('click', () => dialog.close());
window.addEventListener('keydown', (event) => {
    if (settings.hidden || dialog.open) return;
    if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu();
    } else if (event.key === 'Tab') {
        const controls = Array.from(
            settings.querySelectorAll<HTMLElement>('button, input, select, a[href]'),
        ).filter((element) => !element.hasAttribute('disabled') && element.getClientRects().length);
        const first = controls[0],
            last = controls[controls.length - 1];
        if (event.shiftKey && (document.activeElement === first || !settings.contains(document.activeElement))) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !settings.contains(document.activeElement))) {
            event.preventDefault();
            first.focus();
        }
    }
});
import { makeChain, stepChain, interpolate, type Particle, type Circle } from './model';
const canvas = get<HTMLCanvasElement>('scene'),
    context = canvas.getContext('2d')!;
let guides: Particle[][] = [],
    offset = 0,
    shake = 0,
    time = 0,
    running = true,
    frame = 0,
    last = performance.now(),
    accumulator = 0;
function anchors() {
    return Array.from({ length: number('guides') }, (_, i) => {
        const angle = Math.PI * (1.08 + (0.84 * i) / (number('guides') - 1));
        return { x: 500 + offset + Math.cos(angle) * 68, y: 143 + Math.sin(angle) * 68 };
    });
}
function circles(): Circle[] {
    return [
        { x: 500 + offset, y: 143, r: 58 },
        { x: 449 + offset + shake, y: 278, r: 57 },
        { x: 551 + offset + shake, y: 278, r: 57 },
    ];
}
function rebuild() {
    const roots = anchors();
    guides = roots.map((a, i) => makeChain(a.x, a.y, number('segments'), i < number('guides') / 2 ? -1 : 1));
    for (let pass = 0; pass < 180; pass++)
        guides.forEach((chain, i) =>
            stepChain(
                chain,
                roots[i],
                220,
                number('wind'),
                circles(),
                number('radius'),
                input('collision').checked,
                1 / 120,
            ),
        );
    for (const chain of guides)
        for (const point of chain) {
            point.px = point.x;
            point.py = point.y;
        }
}
function draw() {
    const rect = canvas.getBoundingClientRect(),
        dpr = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.round(rect.width * dpr),
        height = Math.round(rect.height * dpr);
    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
    }
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = '#e5edef';
    context.fillRect(0, 0, width, height);
    const mobile = rect.width < 600;
    const bounds = [
        330 + offset + shake,
        670 + offset + shake,
        ...guides.flat().map((point) => point.x),
        ...circles().flatMap((circle) => [circle.x - circle.r - number('radius'), circle.x + circle.r + number('radius')]),
    ];
    const left = Math.min(...bounds),
        right = Math.max(...bounds),
        viewWidth = mobile ? Math.max(440, right - left + 32) : 1000,
        center = mobile ? (left + right) / 2 : 500,
        zoom = Math.min(width / viewWidth, height / 450);
    context.setTransform(zoom, 0, 0, zoom, width / 2 - center * zoom, (height - 450 * zoom) / 2);
    context.strokeStyle = '#cad8da';
    context.lineWidth = 1;
    for (let x = 0; x < 1000; x += 50) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, 450);
        context.stroke();
    }
    context.fillStyle = '#b5c9cd';
    context.beginPath();
    context.moveTo(397 + offset + shake, 450);
    context.lineTo(415 + offset + shake, 285);
    context.quadraticCurveTo(500 + offset + shake, 220, 585 + offset + shake, 285);
    context.lineTo(603 + offset + shake, 450);
    context.fill();
    for (const c of circles()) {
        context.fillStyle = '#c8d7d9';
        context.beginPath();
        context.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        context.fill();
        if (input('show-guides').checked) {
            context.setLineDash([5, 5]);
            context.strokeStyle = '#d39b69';
            context.lineWidth = 2;
            context.beginPath();
            context.arc(c.x, c.y, c.r + number('radius'), 0, Math.PI * 2);
            context.stroke();
            context.setLineDash([]);
        }
    }
    const line = (points: { x: number; y: number }[], color: string, lineWidth: number) => {
        context.beginPath();
        points.forEach((p, i) => (i ? context.lineTo(p.x, p.y) : context.moveTo(p.x, p.y)));
        context.strokeStyle = color;
        context.lineWidth = lineWidth;
        context.lineCap = 'round';
        context.stroke();
    };
    const representation = input('representation').value;
    const count = representation === 'strands' ? number('strands') : representation === 'cards' ? 22 : 10;
    for (let i = 0; i < count; i++) {
        const split = Math.ceil(guides.length / 2),
            halfway = Math.ceil(count / 2);
        const start = i < halfway ? 0 : split,
            size = i < halfway ? split : guides.length - split;
        const index =
            start +
            (i < halfway ? i / Math.max(1, halfway - 1) : (i - halfway) / Math.max(1, count - halfway - 1)) *
                (size - 1);
        const a = Math.floor(index),
            b = Math.min(start + size - 1, a + 1);
        const points = interpolate(guides[a], guides[b], index - a);
        line(
            points,
            representation === 'strands'
                ? `rgba(36,75,80,${0.35 + (i % 4) * 0.11})`
                : representation === 'cards'
                  ? i % 2
                      ? '#45676b'
                      : '#769498'
                  : '#456b70',
            representation === 'strands' ? 1.3 : representation === 'cards' ? 9 : 21,
        );
    }
    if (input('show-guides').checked)
        for (const chain of guides) {
            line(chain, '#e59950', 1.4);
            for (const p of chain) {
                context.fillStyle = '#df954e';
                context.beginPath();
                context.arc(p.x, p.y, 2.6, 0, Math.PI * 2);
                context.fill();
            }
        }
    let contacts = 0,
        error = 0;
    for (const chain of guides)
        for (let i = 1; i < chain.length; i++) {
            const p = chain[i];
            if (circles().some((c) => Math.hypot(p.x - c.x, p.y - c.y) < c.r - 0.5)) contacts++;
            error = Math.max(
                error,
                Math.abs(Math.hypot(p.x - chain[i - 1].x, p.y - chain[i - 1].y) - 220 / number('segments')),
            );
        }
    for (const id of ['guides', 'segments', 'strands', 'wind', 'radius'])
        text(`${id}-out`, `${number(id)}${id === 'radius' ? ' px' : ''}`);
    text(
        'count-readout',
        `${guides.length * (number('segments') + 1)}입자 / ${count}${representation === 'strands' ? '가닥' : '띠'}`,
    );
    text('contact-readout', `${contacts}개 · 충돌 ${input('collision').checked ? '켜짐' : '꺼짐'}`);
    text('error-readout', `${error.toFixed(2)} px`);
    text(
        'summary',
        `${running ? '재생 중' : '일시정지'} · 가이드 ${guides.length}개 × ${number('segments')}세그먼트 → 이웃 보간 → ${representation === 'strands' ? '선 가닥' : representation === 'cards' ? '카드 띠' : '원거리 실루엣'} 표시`,
    );
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.font = `${mobile ? 12 : 16}px sans-serif`;
    context.fillStyle = '#41696e';
    const labelX = mobile ? 16 : 38;
    context.fillText('주황 · 물리 가이드', labelX, 27);
    context.fillText('청록 · 가이드 사이 보간', labelX, 49);
    context.textAlign = 'right';
    context.fillText(
        `바람 ${number('wind') > 0 ? '→' : number('wind') < 0 ? '←' : '없음'}`,
        rect.width - (mobile ? 16 : 38),
        27,
    );
    context.textAlign = 'left';
}
function simulate() {
    time += 1 / 120;
    shake *= 0.996;
    const a = anchors(),
        body = circles();
    guides.forEach((chain, i) =>
        stepChain(
            chain,
            a[i],
            220,
            number('wind') * (1 + 0.2 * Math.sin(time * 2 + i)),
            body,
            number('radius'),
            input('collision').checked,
            1 / 120,
        ),
    );
}
function animate(now: number) {
    if (!running) return;
    accumulator += Math.min(0.04, (now - last) / 1000);
    last = now;
    while (accumulator >= 1 / 120) {
        simulate();
        accumulator -= 1 / 120;
    }
    draw();
    frame = requestAnimationFrame(animate);
}
get('play').addEventListener('click', () => {
    running = !running;
    text('play', running ? '일시정지' : '재생');
    if (running) {
        last = performance.now();
        frame = requestAnimationFrame(animate);
    } else {
        cancelAnimationFrame(frame);
        draw();
    }
});
get('impulse').addEventListener('click', () => {
    shake = shake <= 0 ? 45 : -45;
    for (const chain of guides) for (let i = 1; i < chain.length; i++) chain[i].px -= 2.5;
    draw();
});
get('teleport').addEventListener('click', () => {
    offset = offset === 0 ? 150 : 0;
    if (input('teleport-mode').value === 'reset') rebuild();
    draw();
});
for (const id of ['guides', 'segments'])
    get(id).addEventListener('input', () => {
        rebuild();
        draw();
    });
for (const id of ['representation', 'teleport-mode']) get(id).addEventListener('change', draw);
for (const id of ['strands', 'wind', 'radius', 'collision', 'show-guides'])
    get(id).addEventListener('input', draw);
get('reset').addEventListener('click', () => {
    offset = 0;
    shake = 0;
    time = 0;
    accumulator = 0;
    for (const [id, value] of Object.entries({
        guides: '8',
        segments: '12',
        strands: '120',
        wind: '60',
        radius: '5',
        representation: 'strands',
        'teleport-mode': 'reset',
    }))
        input(id).value = value;
    input('collision').checked = true;
    input('show-guides').checked = true;
    rebuild();
    draw();
});
const observer = new ResizeObserver(draw);
observer.observe(canvas);
window.addEventListener('pagehide', (event) => {
    running = false;
    cancelAnimationFrame(frame);
    accumulator = 0;
    text('play', '재생');
    closeMenu(false);
    draw();
    if (!event.persisted) observer.disconnect();
});
window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        observer.observe(canvas);
        draw();
    }
});
rebuild();
draw();
frame = requestAnimationFrame(animate);
