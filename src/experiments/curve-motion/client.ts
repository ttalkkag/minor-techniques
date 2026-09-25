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
import { cubic, mix, table, lookup, type Curve, type Point } from './model';
const scene = document.getElementById('scene') as unknown as SVGSVGElement;
let progress = 0.25,
    playing = false,
    last = 0,
    frame = 0;
let points: Curve, rows: ReturnType<typeof table>, reference: ReturnType<typeof table>;
const map = (p: Point) => ({ x: 500 + (p.x - 5) * 46 * number('scale'), y: 210 + p.y });
const line = (a: Point, b: Point, color: string, width = 1) =>
    `<path d="M${a.x},${a.y}L${b.x},${b.y}" stroke="${color}" stroke-width="${width}" fill="none"/>`;
const dot = (p: Point, r: number, color: string) =>
    `<circle cx="${p.x}" cy="${p.y}" r="${r}" fill="${color}"/>`;
function rebuild() {
    const bend = number('bend');
    points =
        input('shape').value === 'point'
            ? [
                  { x: 5, y: 0 },
                  { x: 5, y: 0 },
                  { x: 5, y: 0 },
                  { x: 5, y: 0 },
              ]
            : input('shape').value === 'cubic'
              ? [
                    { x: 0, y: 0 },
                    { x: 0, y: 0 },
                    { x: 0, y: 0 },
                    { x: 10, y: 0 },
                ]
              : [
                    { x: 0, y: 70 },
                    { x: 0.6, y: -bend },
                    { x: 9, y: bend },
                    { x: 10, y: -70 },
                ];
    const world: Curve = points.map((p) => ({ x: p.x * 46, y: p.y })) as Curve;
    rows = table(world, number('samples'), input('metric').value === 'world' ? number('scale') : 1);
    reference = table(world, 4096, number('scale'));
    draw();
}
function draw() {
    text('bend-out', `${number('bend')} px`);
    text('samples-out', `${number('samples')}개`);
    text('scale-out', `${number('scale').toFixed(1)}×`);
    const u = lookup(rows, progress),
        a = map(cubic(points, progress)),
        b = map(cubic(points, u));
    const duration = 5,
        h = 0.0001;
    const speed = (at: number, distanceMode: boolean) => {
        const q0 = map(cubic(points, distanceMode ? lookup(rows, Math.max(0, at - h)) : Math.max(0, at - h)));
        const q1 = map(cubic(points, distanceMode ? lookup(rows, Math.min(1, at + h)) : Math.min(1, at + h)));
        return (
            Math.hypot(q1.x - q0.x, q1.y - q0.y) / ((Math.min(1, at + h) - Math.max(0, at - h)) * duration)
        );
    };
    const total = reference[reference.length - 1].s;
    const measured = table(
        points.map((p) => ({ x: p.x * 46, y: p.y })) as Curve,
        number('samples'),
        number('scale'),
    );
    const approximate = measured[measured.length - 1].s;
    text('a-readout', `u ${progress.toFixed(3)} · ${speed(progress, false).toFixed(1)} px/s`);
    text('b-readout', `u ${u.toFixed(3)} · ${speed(progress, true).toFixed(1)} px/s`);
    text(
        'error-readout',
        `${total.toFixed(1)} px · ${total ? (((total - approximate) / total) * 100).toFixed(3) : '0.000'}%`,
    );
    text(
        'summary',
        total === 0
            ? '총길이 0 · 두 방식 모두 같은 점에 머뭅니다.'
            : `진행 ${(progress * 100).toFixed(0)}% · 주황: 균일 u / 청록: ${input('metric').value === 'world' ? '화면' : '로컬'} 거리 기준 · 한 번 이동 5초`,
    );
    input('progress').value = String(progress * 1000);
    const p = points.map(map);
    let markup = `<rect x="20" y="10" width="960" height="405" rx="25" fill="#e5edef"/><path d="M${p[0].x} ${p[0].y}C${p[1].x} ${p[1].y} ${p[2].x} ${p[2].y} ${p[3].x} ${p[3].y}" fill="none" stroke="#809b9e" stroke-width="4"/>`;
    if (input('construction').checked) {
        for (let i = 0; i < 3; i++) markup += line(p[i], p[i + 1], '#b1c4c7', 2);
        for (const row of rows) markup += dot(map(cubic(points, row.u)), 2.3, '#829da1');
        const first = [mix(p[0], p[1], progress), mix(p[1], p[2], progress), mix(p[2], p[3], progress)];
        const second = [mix(first[0], first[1], progress), mix(first[1], first[2], progress)];
        markup +=
            line(first[0], first[1], '#e1a475', 2) +
            line(first[1], first[2], '#e1a475', 2) +
            line(second[0], second[1], '#d47d44', 2);
        for (const pt of first) markup += dot(pt, 4, '#e1a475');
        for (const pt of second) markup += dot(pt, 5, '#d47d44');
    }
    p.forEach((pt, i) => {
        markup +=
            dot(pt, 6, '#6c8a91') + `<text x="${pt.x + 10}" y="${pt.y - 12}" font-size="15">P${i}</text>`;
    });
    markup += `<circle cx="${a.x}" cy="${a.y}" r="15" fill="#d57f43" stroke="white" stroke-width="3"/><circle cx="${b.x}" cy="${b.y}" r="8" fill="#0a7e7c" stroke="white" stroke-width="2"/><text x="48" y="385" font-size="16">● 주황: 균일 u　● 청록: 거리 역조회</text>`;
    scene.innerHTML = markup;
}
function animate(now: number) {
    if (!playing) return;
    progress += Math.min(0.06, (now - last) / 1000) / 5;
    last = now;
    if (progress >= 1) {
        progress = 1;
        playing = false;
        text('play', '다시 재생');
    }
    draw();
    if (playing) frame = requestAnimationFrame(animate);
}
get('play').addEventListener('click', () => {
    playing = !playing;
    if (playing && progress >= 1) progress = 0;
    text('play', playing ? '일시정지' : '재생');
    if (playing) {
        last = performance.now();
        frame = requestAnimationFrame(animate);
    } else cancelAnimationFrame(frame);
});
for (const id of ['bend', 'samples', 'scale', 'construction']) get(id).addEventListener('input', rebuild);
for (const id of ['shape', 'metric']) get(id).addEventListener('change', rebuild);
input('progress').addEventListener('input', () => {
    progress = number('progress') / 1000;
    draw();
});
get('reset').addEventListener('click', () => {
    playing = false;
    cancelAnimationFrame(frame);
    progress = 0.25;
    input('shape').value = 'curve';
    input('bend').value = '150';
    input('samples').value = '64';
    input('scale').value = '1';
    input('metric').value = 'world';
    input('construction').checked = true;
    text('play', '재생');
    rebuild();
});
window.addEventListener('pagehide', () => {
    playing = false;
    cancelAnimationFrame(frame);
    text('play', '재생');
    closeMenu(false);
});
window.addEventListener('pageshow', (event) => {
    if (event.persisted) draw();
});
rebuild();
