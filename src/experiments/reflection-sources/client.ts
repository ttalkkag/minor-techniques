import { FOV, PROBE, mirrorRay, trace, visible, targetVisibility, boxDirection } from './model';
import type { Point, World } from './model';
const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const fields = ['object-x', 'object-z', 'camera-x', 'yaw', 'samples'] as const;
const input = (id: string) => el<HTMLInputElement>(id);
const value = (id: string) => Number(input(id).value);
const canvases = ['map', 'planar', 'cube', 'ssr'].map((id) => el<HTMLCanvasElement>(id));
const dialog = el<HTMLDialogElement>('explanation');
const settings = el('settings');
let captured: World = { target: { x: 3, z: 4 }, blocker: null };
let captureCount = 1;
function world(): World {
    const target = { x: value('object-x'), z: value('object-z') };
    return {
        target,
        blocker: input('blocker').checked
            ? { x: (target.x + value('camera-x')) / 2, z: (target.z + 5) / 2 }
            : null,
    };
}
function prepare(canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect(),
        dpr = Math.min(devicePixelRatio, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    return { ctx, w: rect.width, h: rect.height };
}
function drawMap(camera: Point, yaw: number, state: World) {
    const { ctx, w, h } = prepare(canvases[0]!);
    const scale = Math.min((w - 40) / 12, (h - 42) / 12);
    const centerX = w / 2,
        zeroZ = 21 + 7 * scale;
    const xy = (p: Point) => [centerX + p.x * scale, zeroZ - p.z * scale] as const;
    const line = (a: Point, b: Point, color: string, dashed = false, width = 1.5) => {
        ctx.beginPath();
        ctx.moveTo(...xy(a));
        ctx.lineTo(...xy(b));
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.setLineDash(dashed ? [5, 4] : []);
        ctx.stroke();
        ctx.setLineDash([]);
    };
    const dot = (p: Point, r: number, color: string, label: string, left = false) => {
        const [x, y] = xy(p);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.fillStyle = '#3b515b';
        ctx.font = '11px sans-serif';
        ctx.textAlign = left ? 'right' : 'left';
        ctx.fillText(label, x + (left ? -10 : 10), y - 8);
        ctx.textAlign = 'left';
    };
    ctx.fillStyle = '#f8fafb';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#e7efec';
    const a = xy({ x: -5, z: 7 }),
        b = xy({ x: 5, z: 0 });
    ctx.fillRect(a[0], a[1], b[0] - a[0], b[1] - a[1]);
    for (let x = -5; x <= 5; x++) line({ x, z: 0 }, { x, z: 7 }, '#d6e1df', false, 0.6);
    for (let z = 0; z <= 7; z++) line({ x: -5, z }, { x: 5, z }, '#d6e1df', false, 0.6);
    const edge = (angle: number) => ({
        x: camera.x + Math.sin(angle) * 6.5,
        z: camera.z - Math.cos(angle) * 6.5,
    });
    ctx.beginPath();
    ctx.moveTo(...xy(camera));
    ctx.lineTo(...xy(edge(yaw - FOV / 2)));
    ctx.lineTo(...xy(edge(yaw + FOV / 2)));
    ctx.closePath();
    ctx.fillStyle = '#198b8020';
    ctx.fill();
    line(camera, edge(yaw - FOV / 2), '#27897d');
    line(camera, edge(yaw + FOV / 2), '#27897d');
    line({ x: -5, z: 0 }, { x: 5, z: 0 }, '#117b77', false, 5);
    const mirror = {
        x: (state.target.x * camera.z + camera.x * state.target.z) / (camera.z + state.target.z),
        z: 0,
    };
    line(camera, mirror, '#d77e40', true, 2);
    line(mirror, state.target, '#d77e40', true, 2);
    line(mirror, { x: camera.x, z: -5 }, '#8aa6ae', true);
    dot({ x: camera.x, z: -5 }, 5, '#9eb5bb', '가상 카메라 z=−5');
    dot(PROBE, 5, '#826ea5', '캡처점');
    const ghost = xy(captured.target);
    ctx.strokeStyle = '#d77e40';
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.arc(...ghost, scale * 0.4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    dot(state.target, Math.max(6, scale * 0.4), '#e99151', '물체', state.target.x > 2);
    if (state.blocker) dot(state.blocker, Math.max(5, scale * 0.3), '#47545f', '가림막');
    dot(camera, 6, '#147e76', '기준 카메라', camera.x > 2);
    ctx.fillStyle = '#117b77';
    ctx.font = '11px sans-serif';
    ctx.fillText('거울 z=0', xy({ x: -5, z: 0 })[0], zeroZ + 19);
}
function drawReflection(
    index: number,
    mode: 'planar' | 'cube' | 'ssr',
    camera: Point,
    yaw: number,
    state: World,
) {
    const { ctx, w, h } = prepare(canvases[index]!);
    const samples = value('samples');
    let missing = 0,
        targetPixels = 0;
    for (let i = 0; i < samples; i++) {
        const ray = mirrorRay(camera, yaw, ((i + 0.5) / samples) * 2 - 1);
        const x = (i * w) / samples,
            sw = w / samples + 1;
        ctx.fillStyle = '#d8e1e2';
        ctx.fillRect(x, 0, sw, h);
        if (!ray.valid) continue;
        let hit = trace(ray.point, ray.direction, state),
            absent = false;
        const sampleCube = () =>
            trace(
                PROBE,
                input('box').checked ? boxDirection(ray.point, ray.direction) : ray.direction,
                captured,
            );
        if (mode === 'cube') hit = sampleCube();
        if (
            mode === 'ssr' &&
            !(hit.kind === 'target'
                ? targetVisibility(camera, yaw, state) === 'visible'
                : visible(camera, yaw, hit.point, state))
        ) {
            missing++;
            absent = true;
            if (input('fallback').checked) {
                hit = sampleCube();
                absent = false;
            }
        }
        if (absent) {
            ctx.fillStyle = '#b9c8cc';
            ctx.fillRect(x, 0, sw, h);
            ctx.strokeStyle = '#95a9af';
            ctx.beginPath();
            ctx.moveTo(x, h);
            ctx.lineTo(x + 22, 0);
            ctx.stroke();
            continue;
        }
        if (hit.kind === 'target') targetPixels++;
        const wallStripe = (Math.floor(hit.point.x * 1.3) + Math.floor(hit.point.z * 1.3)) % 2 === 0;
        ctx.fillStyle =
            hit.kind === 'target'
                ? '#e99151'
                : hit.kind === 'blocker'
                  ? '#47545f'
                  : wallStripe
                    ? '#a5bdba'
                    : '#c6d8d2';
        ctx.fillRect(x, 12, sw, h - 24);
        ctx.fillStyle = 'rgba(255,255,255,.16)';
        ctx.fillRect(x, 12, sw, (h - 24) * 0.38);
    }
    return { missing, targetPixels };
}
function update() {
    const camera = { x: value('camera-x'), z: 5 },
        yaw = (value('yaw') * Math.PI) / 180,
        state = world();
    for (const id of fields)
        el(`${id}-value`).textContent =
            id === 'yaw'
                ? `${value(id)}°`
                : id === 'samples'
                  ? `${value(id)}개`
                  : `${value(id).toFixed(1)} m`;
    drawMap(camera, yaw, state);
    const planar = drawReflection(1, 'planar', camera, yaw, state);
    const cube = drawReflection(2, 'cube', camera, yaw, state);
    const ssr = drawReflection(3, 'ssr', camera, yaw, state);
    const status = targetVisibility(camera, yaw, state),
        labels = {
            visible: '화면 안',
            outside: '화면 밖',
            occluded: '가림막 뒤',
        };
    el('planar-info').textContent =
        `현재 월드 · 물체 샘플 ${planar.targetPixels}개 · 가상 카메라 (${camera.x.toFixed(1)}, −5)`;
    el('cube-info').textContent =
        `캡처 #${captureCount} · 물체 (${captured.target.x.toFixed(1)}, ${captured.target.z.toFixed(1)}) · ${input('box').checked ? '상자 보정' : '방향만 조회'} · 물체 샘플 ${cube.targetPixels}개`;
    el('ssr-info').textContent =
        `현재 화면 정보 없는 광선 ${ssr.missing}/${value('samples')}개${input('fallback').checked ? ' · 큐브맵으로 채움' : ''}`;
    el('summary').textContent =
        `물체는 기준 카메라의 ${labels[status]}에 있습니다. ${status === 'visible' ? '이 정보 모형에서는 화면 안 물체의 색을 SSR에 사용할 수 있습니다.' : 'SSR 샘플을 늘려도 이 물체의 보이지 않는 표면은 복원되지 않습니다.'}`;
}
const menuBackground = document.querySelectorAll<HTMLElement>(
    'main > :not(nav):not(#settings):not(dialog), nav > :not(#menu)',
);
function syncMenu() {
    const modal = !settings.hidden && window.innerWidth < 1100;
    menuBackground.forEach((element) => {
        element.inert = modal;
    });
    if (modal) {
        settings.setAttribute('role', 'dialog');
        settings.setAttribute('aria-modal', 'true');
        if (!dialog.open && !settings.contains(document.activeElement)) el('close-menu').focus();
    } else {
        settings.setAttribute('role', 'complementary');
        settings.removeAttribute('aria-modal');
    }
}
function menu(open: boolean, focus = true) {
    settings.hidden = !open;
    el('menu').setAttribute('aria-expanded', String(open));
    el('menu').setAttribute('aria-label', open ? '설정 메뉴 닫기' : '설정 메뉴 열기');
    document.querySelector('.lab')!.classList.toggle('menu-open', open);
    update();
    syncMenu();
    if (focus) (open ? el('close-menu') : el('menu')).focus();
}
function reset(x = 3, z = 4) {
    input('object-x').value = String(x);
    input('object-z').value = String(z);
    input('camera-x').value = '0';
    input('yaw').value = '0';
    input('samples').value = '128';
    for (const id of ['blocker', 'box', 'fallback']) input(id).checked = false;
    captured = { target: { x, z }, blocker: null };
    captureCount = 1;
    update();
}
for (const id of [...fields, 'blocker', 'box', 'fallback']) input(id).addEventListener('input', update);
el('capture').addEventListener('click', () => {
    captured = structuredClone(world());
    captureCount++;
    update();
});
el('reset').addEventListener('click', () => reset());
el('outside').addEventListener('click', () => reset());
el('inside').addEventListener('click', () => reset(0, 3));
el('menu').addEventListener('click', () => menu(Boolean(settings.hidden)));
el('close-menu').addEventListener('click', () => {
    menu(false);
    el('menu').focus();
});
el('help').addEventListener('click', () => dialog.showModal());
el('close-help').addEventListener('click', () => dialog.close());
document.addEventListener('keydown', (event) => {
    if (dialog.open || settings.hidden) return;
    if (event.key === 'Escape') {
        event.preventDefault();
        menu(false);
    } else if (event.key === 'Tab' && window.innerWidth < 1100) {
        const controls = Array.from(
            settings.querySelectorAll<HTMLElement>('button, input, select, a[href], [tabindex]'),
        ).filter(
            (control) =>
                !control.matches(':disabled') && control.tabIndex >= 0 && control.getClientRects().length,
        );
        const first = controls[0]!,
            last = controls[controls.length - 1]!;
        if (
            event.shiftKey &&
            (document.activeElement === first || !settings.contains(document.activeElement))
        ) {
            event.preventDefault();
            last.focus();
        } else if (
            !event.shiftKey &&
            (document.activeElement === last || !settings.contains(document.activeElement))
        ) {
            event.preventDefault();
            first.focus();
        }
    }
});
const observer = new ResizeObserver(update);
observer.observe(el('map'));
window.addEventListener('pagehide', (event) => {
    if (!event.persisted) observer.disconnect();
});
window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        observer.observe(el('map'));
        syncMenu();
        update();
    }
});
window.addEventListener('resize', syncMenu);
menu(window.innerWidth >= 1100, false);
