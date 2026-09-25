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
import { easing, motion, type Method } from './model';
const scene = document.getElementById('scene') as unknown as SVGSVGElement;
let progress = 0.25,
    direction = 1,
    playing = false,
    last = 0,
    frame = 0;
function draw() {
    const method = input('method').value as Method,
        duration = number('duration'),
        distance = number('distance'),
        x1 = number('css-x1'),
        x2 = number('css-x2');
    const result = motion(progress, method, duration, distance, x1, x2);
    text('duration-out', `${duration.toFixed(1)}초`);
    text('distance-out', `${distance} m`);
    text('x1-out', x1.toFixed(2));
    text('x2-out', x2.toFixed(2));
    text(
        'motion-readout',
        `${result.position.toFixed(3)} m / ${result.velocity === null ? '속도 미분 불능' : `${(result.velocity * direction).toFixed(3)} m/s`}`,
    );
    text('accel-readout', result.acceleration === null ? '미분 불능 · 수직 접선' : `${result.acceleration.toFixed(3)} m/s²`);
    text(
        'css-readout',
        `${easing(progress, 'css', x1, x2).toFixed(5)} / ${easing(progress, 'naive').toFixed(5)}`,
    );
    text(
        'summary',
        `진행 ${(progress * 100).toFixed(1)}% · ${direction === 1 ? '정방향' : '역방향'} · 주황: linear / 청록: ${get<HTMLSelectElement>('method').selectedOptions[0]?.textContent || method} · ${result.velocity === null ? 't=0.5 수직 접선: 유한한 속도·가속도가 없습니다.' : '그래프 양 끝은 정지 구간'}`,
    );
    input('progress').value = String(progress * 1000);
    let markup = `<rect x="20" y="8" width="960" height="465" rx="25" fill="#e5edef"/>`;
    for (const [i, m] of ['linear', method].entries()) {
        const y = 49 + i * 47,
            x = 160 + easing(progress, m as Method, x1, x2) * 650;
        markup += `<path d="M160 ${y}H810" stroke="#becdd0" stroke-width="4"/><circle cx="${x}" cy="${y}" r="13" fill="${i ? '#117d7d' : '#d28149'}"/><text x="55" y="${y + 5}" font-size="16">${i ? '선택 곡선' : 'linear'}</text>`;
    }
    const keys = ['position', 'velocity', 'acceleration'] as const;
    const names = ['위치 (m)', '속도 (m/s)', '가속도 (m/s²)'];
    keys.forEach((key, row) => {
        const top = 145 + row * 103;
        const times = Array.from({ length: 161 }, (_, i) => -0.15 + (1.3 * i) / 160);
        const values = (m: Method) => times.map((t) => {
            const value = motion(t, m, duration, distance, x1, x2)[key];
            return value === null ? null : value * (key === 'velocity' ? direction : 1);
        });
        const selected = values(method),
            linear = values('linear');
        const current = result[key];
        const finite = [...selected, ...linear, current].filter((value): value is number => value !== null);
        const max = Math.max(0.1, ...finite.map(Math.abs));
        const y = (value: number) => top + 55 - (value / max) * 37;
        const x = (t: number) => 175 + ((t + 0.15) / 1.3) * 700;
        markup += `<text x="48" y="${top + 27}" font-size="14">${names[row]}</text><text x="48" y="${top + 48}" font-size="12">범위 ±${max.toFixed(1)}</text><path d="M175 ${y(0)}H875" stroke="#bdced0"/><path d="M${x(0)} ${top + 8}V${top + 92}M${x(1)} ${top + 8}V${top + 92}" stroke="#bccbd0" stroke-dasharray="4 4"/>`;
        [linear, selected].forEach((data, i) => {
            let connected = false;
            const path = data.map((value, j) => {
                if (value === null) {
                    connected = false;
                    return '';
                }
                const command = `${connected ? 'L' : 'M'}${x(times[j])} ${y(value)}`;
                connected = true;
                return command;
            }).join(' ');
            markup += `<path d="${path}" fill="none" stroke="${i ? '#117d7d' : '#d28149'}" stroke-width="${i ? 3 : 2}"/>`;
        });
        markup += `<path d="M${x(progress)} ${top + 8}V${top + 92}" stroke="#526b70" stroke-width="1"/>`;
        if (current !== null)
            markup += `<circle cx="${x(progress)}" cy="${y(current * (key === 'velocity' ? direction : 1))}" r="5" fill="#117d7d"/>`;
        if (selected.some((value) => value === null))
            markup += `<path d="M${x(0.5)} ${top + 8}V${top + 92}" stroke="#9b492e" stroke-dasharray="4 4"/><text x="${x(0.5) + 10}" y="${top + 18}" font-size="13" fill="#7d3b29">t=0.5 미분 불능</text>`;
    });
    scene.innerHTML = markup;
}
function animate(now: number) {
    if (!playing) return;
    progress += (direction * Math.min(0.06, (now - last) / 1000)) / number('duration');
    last = now;
    if (progress <= 0 || progress >= 1) {
        progress = Math.max(0, Math.min(1, progress));
        playing = false;
        text('play', '다시 재생');
    }
    draw();
    if (playing) frame = requestAnimationFrame(animate);
}
get('play').addEventListener('click', () => {
    playing = !playing;
    if (playing && (progress >= 1 || progress <= 0)) progress = direction === 1 ? 0 : 1;
    text('play', playing ? '일시정지' : '재생');
    if (playing) {
        last = performance.now();
        frame = requestAnimationFrame(animate);
    } else cancelAnimationFrame(frame);
});
get('reverse').addEventListener('click', () => {
    direction *= -1;
    draw();
});
get('method').addEventListener('change', draw);
for (const id of ['duration', 'distance', 'css-x1', 'css-x2']) get(id).addEventListener('input', draw);
input('progress').addEventListener('input', () => {
    progress = number('progress') / 1000;
    draw();
});
get('reset').addEventListener('click', () => {
    playing = false;
    cancelAnimationFrame(frame);
    direction = 1;
    progress = 0.25;
    input('method').value = 'smoother';
    input('duration').value = '2';
    input('distance').value = '5';
    input('css-x1').value = '0';
    input('css-x2').value = '1';
    text('play', '재생');
    draw();
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
draw();
