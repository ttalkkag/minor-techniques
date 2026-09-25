import {
    interpolate,
    mesh,
    sample,
    uvError,
    weights,
    type Conditions,
    type Method,
    type Point,
    type Triangle,
    type UV,
} from './model';

const element = <T extends HTMLElement>(id: string) => document.getElementById(`texture-${id}`) as T;
const current = element<HTMLCanvasElement>('current');
const reference = element<HTMLCanvasElement>('reference');
const methodInput = element<HTMLSelectElement>('method');
const spaceInput = element<HTMLSelectElement>('space');
const divisionsInput = element<HTMLSelectElement>('divisions');
const tiltInput = element<HTMLInputElement>('tilt');
const yawInput = element<HTMLInputElement>('yaw');
const distanceInput = element<HTMLInputElement>('distance');
const resolutionInput = element<HTMLSelectElement>('resolution');
const wireInput = element<HTMLInputElement>('wire');
const settings = element<HTMLElement>('settings');
const dialog = element<HTMLDialogElement>('explanation');
const abort = new AbortController();
let probe: Point = { x: 0.04, y: 0.035 };
let frame = 0;

function texture(uv: UV, resolution: number): [number, number, number] {
    const u = (Math.floor(Math.max(0, Math.min(0.999999, uv.u)) * resolution) + 0.5) / resolution;
    const v = (Math.floor(Math.max(0, Math.min(0.999999, uv.v)) * resolution) + 0.5) / resolution;
    if (Math.abs(u - v) < 0.024 || Math.abs(u + v - 1) < 0.018) return [226, 145, 80];
    if (Math.abs(u - 0.5) < 0.012 || Math.abs(v - 0.5) < 0.012) return [111, 174, 163];
    return (Math.floor(u * 8) + Math.floor(v * 8)) % 2 ? [58, 106, 109] : [221, 234, 223];
}

function viewport(canvas: HTMLCanvasElement) {
    return {
        scale: Math.min(canvas.width * 0.69, canvas.height * 1.25),
        x: canvas.width * 0.5,
        y: canvas.height * 0.49,
    };
}

function draw(canvas: HTMLCanvasElement, triangles: Triangle[], method: Method, resolution: number) {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));
    const context = canvas.getContext('2d')!;
    const view = viewport(canvas);
    const image = context.createImageData(canvas.width, canvas.height);
    for (const triangle of triangles) {
        const projected = triangle.map((vertex) => ({
            ...vertex,
            x: vertex.x * view.scale + view.x,
            y: vertex.y * view.scale + view.y,
        })) as Triangle;
        const minX = Math.max(0, Math.floor(Math.min(...projected.map((vertex) => vertex.x))));
        const maxX = Math.min(canvas.width - 1, Math.ceil(Math.max(...projected.map((vertex) => vertex.x))));
        const minY = Math.max(0, Math.floor(Math.min(...projected.map((vertex) => vertex.y))));
        const maxY = Math.min(canvas.height - 1, Math.ceil(Math.max(...projected.map((vertex) => vertex.y))));
        for (let y = minY; y <= maxY; y += 1) {
            for (let x = minX; x <= maxX; x += 1) {
                const lambda = weights({ x: x + 0.5, y: y + 0.5 }, projected);
                if (lambda[0] < -1e-8 || lambda[1] < -1e-8 || lambda[2] < -1e-8) continue;
                const uv = interpolate(triangle, lambda, method);
                const color = texture(uv, resolution);
                const index = (y * canvas.width + x) * 4;
                image.data[index] = color[0];
                image.data[index + 1] = color[1];
                image.data[index + 2] = color[2];
                image.data[index + 3] = 255;
            }
        }
    }
    context.putImageData(image, 0, 0);
    if (wireInput.checked) {
        context.strokeStyle = '#203e5ca3';
        context.lineWidth = ratio * 0.65;
        for (const triangle of triangles) {
            context.beginPath();
            triangle.forEach((vertex, index) => {
                if (index === 0)
                    context.moveTo(vertex.x * view.scale + view.x, vertex.y * view.scale + view.y);
                else context.lineTo(vertex.x * view.scale + view.x, vertex.y * view.scale + view.y);
            });
            context.closePath();
            context.stroke();
        }
    }
    const x = probe.x * view.scale + view.x;
    const y = probe.y * view.scale + view.y;
    context.strokeStyle = '#fff';
    context.lineWidth = ratio * 4;
    const cross = () => {
        context.beginPath();
        context.moveTo(x - 8 * ratio, y);
        context.lineTo(x + 8 * ratio, y);
        context.moveTo(x, y - 8 * ratio);
        context.lineTo(x, y + 8 * ratio);
        context.stroke();
    };
    cross();
    context.strokeStyle = '#233f47';
    context.lineWidth = ratio * 1.6;
    cross();
}

function render() {
    frame = 0;
    const conditions: Conditions = {
        tilt: Number(tiltInput.value),
        yaw: Number(yawInput.value),
        distance: Number(distanceInput.value),
    };
    const method = methodInput.value as Method;
    const divisions = method === 'perspective' ? 1 : Number(divisionsInput.value);
    const space = spaceInput.value as 'world' | 'screen';
    const triangles = mesh(conditions, divisions, space);
    const baseline = mesh(conditions, 1, 'world');
    const resolution = Number(resolutionInput.value);
    const error = uvError(conditions, triangles, method);
    element('tilt-value').textContent = `${conditions.tilt}°`;
    element('yaw-value').textContent = `${conditions.yaw}°`;
    element('distance-value').textContent = conditions.distance.toFixed(1);
    spaceInput.disabled = method === 'perspective';
    divisionsInput.disabled = method === 'perspective';
    element('division-note').textContent =
        method === 'perspective'
            ? '원근 보정은 원래 두 삼각형을 사용합니다.'
            : space === 'world'
              ? '새 3D 정점의 위치와 UV를 구하고 다시 투영합니다.'
              : '이미 투영된 화면 위치와 기존 아핀 UV를 나눕니다. 오차는 그대로입니다.';
    element('current-title').textContent =
        method === 'perspective'
            ? '원근 보정 보간'
            : divisions === 1
              ? '아핀 보간'
              : space === 'world'
                ? '아핀 + 3D 면 분할'
                : '아핀 + 화면 분할';
    element('current-subtitle').textContent =
        method === 'perspective'
            ? '오른쪽 기준과 같은 보간식입니다.'
            : divisions === 1
              ? '큰 삼각형 두 개에 UV를 곧게 펼칩니다.'
              : space === 'world'
                ? '작은 면마다 정점을 새로 투영합니다.'
                : '기존 아핀 UV를 유지한 채 면만 나눕니다.';
    element('triangles').textContent = `${triangles.length}개`;
    element('rms').textContent = error.toFixed(5);
    const depths = baseline.flat().map((vertex) => vertex.w);
    element('depth').textContent = `${(Math.max(...depths) / Math.min(...depths)).toFixed(2)}×`;
    const actual = sample(probe, triangles, method);
    const expected = sample(probe, baseline, 'perspective');
    element('probe-a').textContent = actual
        ? `A UV (${actual.u.toFixed(4)}, ${actual.v.toFixed(4)})`
        : 'A · 바닥 바깥';
    element('probe-b').textContent = expected
        ? `B UV (${expected.u.toFixed(4)}, ${expected.v.toFixed(4)})`
        : 'B · 바닥 바깥';
    element('probe-error').textContent =
        actual && expected
            ? `UV 거리 ${Math.hypot(actual.u - expected.u, actual.v - expected.v).toFixed(5)}`
            : '바닥 안을 클릭하세요';
    element('summary').textContent =
        `${element('current-title').textContent} · 삼각형 ${triangles.length}개 · UV RMS ${error.toFixed(5)}. 무늬를 누르거나 캔버스에서 화살표 키로 표본을 옮겨 UV를 비교하세요.`;
    draw(current, triangles, method, resolution);
    draw(reference, baseline, 'perspective', resolution);
}

function schedule() {
    if (!frame) frame = requestAnimationFrame(render);
}
function menu(open: boolean) {
    settings.hidden = !open;
    element('backdrop').hidden = !open;
    element('menu').setAttribute('aria-expanded', String(open));
    for (const child of settings.parentElement!.children)
        if (child instanceof HTMLElement && child !== settings && child !== element('backdrop'))
            child.inert = open;
    if (open) element('close-menu').focus();
    else element('menu').focus();
}
function reset() {
    methodInput.value = 'affine';
    spaceInput.value = 'world';
    divisionsInput.value = '1';
    tiltInput.value = '62';
    yawInput.value = '12';
    distanceInput.value = '4.5';
    resolutionInput.value = '64';
    wireInput.checked = false;
    probe = { x: 0.04, y: 0.035 };
    schedule();
}
const on = (target: EventTarget, name: string, callback: EventListener) =>
    target.addEventListener(name, callback, { signal: abort.signal });
on(element('menu'), 'click', () => menu(true));
on(element('close-menu'), 'click', () => menu(false));
on(element('backdrop'), 'click', () => menu(false));
on(element('help'), 'click', () => dialog.showModal());
on(element('close-help'), 'click', () => dialog.close());
on(element('reset'), 'click', reset);
on(element('flat'), 'click', () => {
    tiltInput.value = '0';
    yawInput.value = '0';
    schedule();
});
on(element('probe-center'), 'click', () => {
    probe = { x: 0, y: 0 };
    schedule();
});
on(document, 'keydown', (event) => {
    if (dialog.open || settings.hidden) return;
    const key = event as KeyboardEvent;
    if (key.key === 'Escape') {
        key.preventDefault();
        menu(false);
    } else if (key.key === 'Tab') {
        const controls = Array.from(settings.querySelectorAll<HTMLElement>('button, input, select'))
            .filter((control) => !control.hasAttribute('disabled') && control.getClientRects().length);
        const first = controls[0]!, last = controls[controls.length - 1]!;
        if (key.shiftKey && document.activeElement === first) {
            key.preventDefault();
            last.focus();
        } else if (!key.shiftKey && document.activeElement === last) {
            key.preventDefault();
            first.focus();
        }
    }
});
for (const input of [
    methodInput,
    spaceInput,
    divisionsInput,
    tiltInput,
    yawInput,
    distanceInput,
    resolutionInput,
    wireInput,
]) {
    on(input, 'input', schedule);
    on(input, 'change', schedule);
}
for (const canvas of [current, reference]) {
    on(canvas, 'keydown', (event) => {
        const key = (event as KeyboardEvent).key;
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key)) return;
        event.preventDefault();
        probe.x += key === 'ArrowLeft' ? -0.01 : key === 'ArrowRight' ? 0.01 : 0;
        probe.y += key === 'ArrowUp' ? -0.01 : key === 'ArrowDown' ? 0.01 : 0;
        schedule();
    });
    on(canvas, 'click', (event) => {
        const mouse = event as MouseEvent;
        const rect = canvas.getBoundingClientRect();
        const view = viewport(canvas);
        probe = {
            x: (((mouse.clientX - rect.left) * canvas.width) / rect.width - view.x) / view.scale,
            y: (((mouse.clientY - rect.top) * canvas.height) / rect.height - view.y) / view.scale,
        };
        schedule();
    });
}
const resize = new ResizeObserver(schedule);
resize.observe(current.parentElement!);
resize.observe(reference.parentElement!);
window.addEventListener('pagehide', (event) => {
    if (!event.persisted) abort.abort();
    resize.disconnect();
    cancelAnimationFrame(frame);
    frame = 0;
});
window.addEventListener('pageshow', () => {
    resize.observe(current.parentElement!);
    resize.observe(reference.parentElement!);
    schedule();
});
schedule();
