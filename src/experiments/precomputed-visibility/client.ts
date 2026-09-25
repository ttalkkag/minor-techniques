import {
    targets,
    walls,
    door,
    cameraAt,
    rail,
    relativeAngle,
    visible,
    precompute,
    lookup,
    compare,
    binAt,
} from './model';

const input = (id: string) => document.getElementById(`pv-${id}`) as HTMLInputElement;
const el = (id: string) => document.getElementById(`pv-${id}`)!;
const canvas = el('canvas') as HTMLCanvasElement;
const context = canvas.getContext('2d')!;
const settings = el('settings');
const menu = el('menu');
const dialog = el('dialog') as HTMLDialogElement;
const method = el('method') as HTMLSelectElement;
let bake = precompute(8, 5, false);
let bakeMs = 0;
let running = false;
let direction = 1;
let lastTime = 0;
let playbackProgress = 50;
let frame = 0;
let width = 0;
let height = 0;
const abort = new AbortController();
const listen = (target: EventTarget, event: string, callback: EventListener) =>
    target.addEventListener(event, callback, { signal: abort.signal });

const menuMedia = matchMedia('(max-width: 760px)');
const menuBackground = Array.from(document.querySelectorAll<HTMLElement>('.pv-scene, .pv-lab > nav > a, #pv-explain'));
function menuControls() {
    return Array.from(settings.querySelectorAll<HTMLElement>('button, input, select, a[href]'))
        .filter((control) => control.getClientRects().length && !control.hasAttribute('disabled'));
}
function syncMenu() {
    const modal = !settings.hidden && menuMedia.matches;
    for (const element of menuBackground) element.inert = modal;
    settings.setAttribute('role', modal ? 'dialog' : 'complementary');
    if (modal) settings.setAttribute('aria-modal', 'true');
    else settings.removeAttribute('aria-modal');
}
function trapMenu(event: KeyboardEvent) {
    if (dialog.open || settings.hidden || !menuMedia.matches || event.key !== 'Tab') return;
    const controls = menuControls(), first = controls[0], last = controls.at(-1);
    if (!first || !last) return;
    if (!settings.contains(document.activeElement) || (event.shiftKey ? document.activeElement === first : document.activeElement === last)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
    }
}
menuMedia.addEventListener('change', () => {
    syncMenu();
    if (!settings.hidden && menuMedia.matches && !dialog.open) menuControls()[0]?.focus();
});
function setMenu(open: boolean, focus = true) {
    settings.hidden = !open;
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? '설정 닫기' : '설정 열기');
    syncMenu();
    if (focus) (open ? menuControls()[0] : menu)?.focus();
}

function rebuild() {
    const start = performance.now();
    bake = precompute(Number(input('bins').value), Number(input('samples').value), input('states').checked);
    bakeMs = performance.now() - start;
}

function stop() {
    running = false;
    cancelAnimationFrame(frame);
    el('play').textContent = '레일 이동';
}

function label(text: string, x: number, y: number, color = '#607581', size = 11) {
    context.fillStyle = color;
    context.font = `500 ${size}px -apple-system, BlinkMacSystemFont, sans-serif`;
    context.fillText(text, x, y);
}

function circle(x: number, y: number, radius: number, fill: string, stroke?: string) {
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = fill;
    context.fill();
    if (stroke) {
        context.strokeStyle = stroke;
        context.lineWidth = 1.8;
        context.stroke();
    }
}

function draw() {
    if (!width || !height) return;
    const s = Number(input('progress').value) / 100;
    const deviation = Number(input('deviation').value);
    const fov = Number(input('fov').value);
    const open = input('door').checked;
    const camera = cameraAt(s, deviation, fov);
    const required = visible(camera, open);
    const submitted =
        method.value === 'all'
            ? new Set(targets.map((p) => p.id))
            : method.value === 'live'
              ? required
              : lookup(bake, s, open, input('neighbors').checked);
    const { missing, excess } = compare(required, submitted);
    const bin = binAt(s, bake.bins);
    el('required').textContent = String(required.size);
    el('submitted').textContent = `${submitted.size} / ${targets.length}`;
    el('missing').textContent = String(missing.size);
    el('progress-value').textContent = `${(s * 100).toFixed(1)}%`;
    el('deviation-value').textContent = `${deviation > 0 ? '+' : ''}${deviation}`;
    el('fov-value').textContent = `${fov}°`;
    el('bins-value').textContent = String(bake.bins);
    el('samples-value').textContent = String(bake.samples);
    el('bin-label').textContent = `구간 ${bin + 1} / ${bake.bins}`;
    el('bake-info').textContent =
        `${bake.evaluations}개 시점 · ${bake.evaluations * targets.length}회 대상 검사 · 비트셋 환산 ${bake.bytes}B · 생성 ${bakeMs.toFixed(2)}ms`;
    el('status').textContent =
        `현재 불필요한 제출 ${excess.size}개 · 선택 방식의 대상 검사 ${method.value === 'live' ? targets.length : 0}회 (비교용 ${targets.length}회 별도). ${missing.size ? `필요한 ${missing.size}개가 목록 밖에 있습니다.` : '현재 시점에 누락이 없습니다.'}`;

    context.clearRect(0, 0, width, height);
    const mobile = width < 540;
    const previewHeight = mobile ? 172 : 104;
    const mapHeight = height - previewHeight - 24;
    const scale = Math.min((width - 30) / 100, (mapHeight - 22) / 105);
    const ox = (width - scale * 100) / 2;
    const oy = 24;
    const px = (x: number) => ox + x * scale;
    const py = (y: number) => oy + y * scale;
    label('관찰도 · 전체 월드와 현재 카메라', 10, 17);

    context.save();
    context.beginPath();
    context.rect(ox, oy, 100 * scale, 105 * scale);
    context.clip();
    context.strokeStyle = '#dfe7e9';
    context.lineWidth = 1;
    for (let n = 0; n <= 100; n += 10) {
        context.beginPath();
        context.moveTo(px(n), py(0));
        context.lineTo(px(n), py(105));
        context.stroke();
        context.beginPath();
        context.moveTo(px(0), py(n));
        context.lineTo(px(100), py(n));
        context.stroke();
    }
    const half = (camera.fov * Math.PI) / 360;
    context.beginPath();
    context.moveTo(px(camera.x), py(camera.y));
    context.arc(px(camera.x), py(camera.y), 95 * scale, camera.angle - half, camera.angle + half);
    context.closePath();
    context.fillStyle = '#178c7e12';
    context.fill();
    context.strokeStyle = '#178c7e42';
    context.lineWidth = 1;
    context.stroke();
    for (const p of targets.filter((p) => required.has(p.id))) {
        context.beginPath();
        context.moveTo(px(camera.x), py(camera.y));
        context.lineTo(px(p.x), py(p.y));
        context.strokeStyle = missing.has(p.id) ? '#d4703a42' : '#13887d23';
        context.stroke();
    }
    context.setLineDash([4, 5]);
    context.lineWidth = 2;
    context.strokeStyle = '#9bafb8';
    context.beginPath();
    for (let n = 0; n <= 100; n++) {
        const p = rail(n / 100);
        if (n === 0) context.moveTo(px(p.x), py(p.y));
        else context.lineTo(px(p.x), py(p.y));
    }
    context.stroke();
    context.setLineDash([]);
    context.lineWidth = 5;
    context.strokeStyle = '#1c8b8170';
    context.beginPath();
    for (let n = 0; n <= 20; n++) {
        const p = rail((bin + n / 20) / bake.bins);
        if (!n) context.moveTo(px(p.x), py(p.y));
        else context.lineTo(px(p.x), py(p.y));
    }
    context.stroke();
    for (let n = 0; n < bake.samples; n++) {
        const p = rail((bin + n / (bake.samples - 1)) / bake.bins);
        circle(px(p.x), py(p.y), 2.3, '#fff', '#218a80');
    }
    context.lineWidth = Math.max(5, scale * 1.8);
    context.strokeStyle = '#586d79';
    context.lineCap = 'round';
    for (const wall of walls) {
        context.beginPath();
        context.moveTo(px(wall.a.x), py(wall.a.y));
        context.lineTo(px(wall.b.x), py(wall.b.y));
        context.stroke();
    }
    context.strokeStyle = open ? '#d18b5f' : '#b7784b';
    context.lineWidth = open ? 2 : Math.max(5, scale * 1.8);
    context.setLineDash(open ? [4, 4] : []);
    context.beginPath();
    context.moveTo(px(door.a.x), py(door.a.y));
    context.lineTo(px(door.b.x), py(door.b.y));
    context.stroke();
    context.setLineDash([]);
    for (const p of targets) {
        const r = Math.max(3.5, Math.min(7, scale * 1.7));
        if (missing.has(p.id)) {
            circle(px(p.x), py(p.y), r + 2, '#fff0e5', '#d4743e');
            context.strokeStyle = '#ce6936';
            context.lineWidth = 1.7;
            context.beginPath();
            context.moveTo(px(p.x) - r / 2, py(p.y) - r / 2);
            context.lineTo(px(p.x) + r / 2, py(p.y) + r / 2);
            context.moveTo(px(p.x) + r / 2, py(p.y) - r / 2);
            context.lineTo(px(p.x) - r / 2, py(p.y) + r / 2);
            context.stroke();
        } else
            circle(
                px(p.x),
                py(p.y),
                r,
                required.has(p.id) ? '#15887c' : submitted.has(p.id) ? '#f8fafb' : '#c8d3d8',
                submitted.has(p.id) && !required.has(p.id) ? '#668b90' : undefined,
            );
    }
    if (deviation) {
        const base = rail(s);
        context.setLineDash([3, 3]);
        context.strokeStyle = '#394f61';
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(px(base.x), py(base.y));
        context.lineTo(px(camera.x), py(camera.y));
        context.stroke();
        context.setLineDash([]);
    }
    circle(px(camera.x), py(camera.y), 9, '#263c4d');
    context.fillStyle = '#fff';
    context.beginPath();
    context.moveTo(px(camera.x), py(camera.y) - 6);
    context.lineTo(px(camera.x) - 4, py(camera.y) + 3);
    context.lineTo(px(camera.x) + 4, py(camera.y) + 3);
    context.fill();
    context.restore();
    label(open ? '문 열림' : '문 닫힘', px(57), py(43) + 17, '#966038', 10);
    label('기준 레일', px(8), py(91), '#69858e', 10);

    const previewY = height - previewHeight;
    const gap = 10;
    const panelWidth = mobile ? width - 20 : (width - 30) / 2;
    const panelHeight = mobile ? 77 : 93;
    for (let panel = 0; panel < 2; panel++) {
        const x = mobile ? 10 : 10 + panel * (panelWidth + gap);
        const y = previewY + (mobile ? panel * (panelHeight + 8) : 0);
        context.fillStyle = '#ffffff';
        context.fillRect(x, y, panelWidth, panelHeight);
        label(
            panel ? '선택 방식의 화면 · ×는 누락 위치' : '현재 시점의 기준 화면',
            x + 10,
            y + 17,
            '#48656e',
            10,
        );
        context.strokeStyle = '#e2e9eb';
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(x + 8, y + panelHeight - 12);
        context.lineTo(x + panelWidth - 8, y + panelHeight - 12);
        context.stroke();
        for (const p of targets.filter((p) => required.has(p.id))) {
            const screenX = x + panelWidth / 2 + (relativeAngle(camera, p) / half) * (panelWidth / 2 - 14);
            const distance = Math.hypot(p.x - camera.x, p.y - camera.y);
            const screenY = y + 31 + Math.min(1, distance / 85) * (panelHeight - 48);
            if (panel && missing.has(p.id)) {
                label('×', screenX - 5, screenY + 5, '#cc6b3b', 16);
            } else circle(screenX, screenY, Math.max(3, 7 - distance / 18), '#148a7b');
        }
    }
}

function resize() {
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
}

function animate(time: number) {
    if (!running) return;
    const dt = Math.min(0.1, (time - lastTime) / 1000);
    lastTime = time;
    let next = playbackProgress + direction * dt * 10;
    if (next >= 100) {
        next = 100;
        direction = -1;
    }
    if (next <= 0) {
        next = 0;
        direction = 1;
    }
    playbackProgress = next;
    input('progress').value = next.toFixed(2);
    draw();
    frame = requestAnimationFrame(animate);
}

function reset() {
    stop();
    direction = 1;
    for (const [id, value] of Object.entries({
        progress: '50',
        deviation: '0',
        fov: '60',
        bins: '8',
        samples: '5',
    }))
        input(id).value = value;
    for (const id of ['door', 'states', 'neighbors']) input(id).checked = false;
    method.value = 'baked';
    rebuild();
    draw();
}

listen(menu, 'click', () => setMenu(Boolean(settings.hidden)));
listen(el('close-menu'), 'click', () => {
    setMenu(false);
    menu.focus();
});
listen(el('explain'), 'click', () => {
    stop();
    dialog.showModal();
});
listen(el('close-dialog'), 'click', () => dialog.close());
listen(document, 'keydown', (event) => {
    if (dialog.open) return;
    if ((event as KeyboardEvent).key === 'Escape' && !settings.hidden) {
        event.preventDefault();
        setMenu(false);
    }
    trapMenu(event as KeyboardEvent);
});
listen(el('reset'), 'click', reset);
listen(el('door-preset'), 'click', () => {
    reset();
    input('door').checked = true;
    draw();
});
listen(el('sparse-preset'), 'click', () => {
    reset();
    input('bins').value = '2';
    input('samples').value = '2';
    input('progress').value = '25';
    rebuild();
    draw();
});
for (const id of ['progress', 'deviation', 'fov', 'door', 'neighbors'])
    listen(input(id), 'input', () => {
        stop();
        draw();
    });
for (const id of ['bins', 'samples', 'states'])
    listen(input(id), 'input', () => {
        stop();
        rebuild();
        draw();
    });
listen(method, 'change', () => {
    stop();
    draw();
});
for (const [id, increment] of [
    ['back', -1],
    ['next', 1],
] as const)
    listen(el(id), 'click', () => {
        stop();
        input('progress').value = String(
            Math.max(0, Math.min(100, Number(input('progress').value) + (increment * 100) / bake.bins)),
        );
        draw();
    });
listen(el('play'), 'click', () => {
    if (running) stop();
    else {
        running = true;
        playbackProgress = Number(input('progress').value);
        lastTime = performance.now();
        el('play').textContent = '일시 정지';
        frame = requestAnimationFrame(animate);
    }
});
setMenu(!menuMedia.matches, false);
rebuild();
let resizeFrame = 0;
const observer = new ResizeObserver(() => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(resize);
});
observer.observe(canvas);
window.addEventListener('pagehide', (event) => {
    stop();
    cancelAnimationFrame(resizeFrame);
    observer.disconnect();
    if (!event.persisted) abort.abort();
});
window.addEventListener('pageshow', () => {
    observer.observe(canvas);
    syncMenu();
    resize();
});
