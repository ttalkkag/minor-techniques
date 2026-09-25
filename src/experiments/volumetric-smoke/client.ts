import { integrate, viewRay, billboard } from './model';
import type { DensityState, Method } from './model';
const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const field = (id: string) => el<HTMLInputElement | HTMLSelectElement>(id);
const value = (id: string) => Number(field(id).value);
const settings = el('settings'),
    dialog = el<HTMLDialogElement>('explanation');
const canvases = [el<HTMLCanvasElement>('view-a'), el<HTMLCanvasElement>('view-b')];
let hole = false,
    eventNumber = 0,
    queued = 0;
const offscreen = document.createElement('canvas');
offscreen.width = 180;
offscreen.height = 128;
const offctx = offscreen.getContext('2d')!;
function state(): DensityState {
    return {
        shape: field('shape').value as DensityState['shape'],
        beta: value('beta'),
        hole,
        holeRadius: value('hole-radius'),
        drift: value('drift'),
    };
}
function draw(canvas: HTMLCanvasElement, angle: number, current: DensityState, method: Method) {
    const width = offscreen.width,
        height = offscreen.height,
        pixels = offctx.createImageData(width, height),
        samples = value('samples');
    for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++) {
            const u = ((x + 0.5) / width - 0.5) * 2.9,
                v = (0.5 - (y + 0.5) / height) * 2.15;
            const ray = viewRay(u, v, angle);
            const t =
                method === 'billboard'
                    ? billboard(u, v, current)
                    : integrate(ray.origin, ray.direction, current, samples, method).transmission;
            const target =
                Math.hypot(u * 0.85, v - 0.15) < 0.27 || (Math.abs(u) < 0.23 && v < -0.13 && v > -0.57);
            const grid = Math.abs((u + 0.07) % 0.4) < 0.008 || Math.abs((v + 0.07) % 0.4) < 0.008;
            const bg = target ? [223, 131, 70] : grid ? [192, 209, 204] : [224, 234, 229];
            const color = [132, 157, 157],
                i = (y * width + x) * 4;
            for (let c = 0; c < 3; c++) pixels.data[i + c] = Math.round(color[c]! * (1 - t) + bg[c]! * t);
            pixels.data[i + 3] = 255;
        }
    offctx.putImageData(pixels, 0, 0);
    const rect = canvas.getBoundingClientRect(),
        dpr = Math.min(devicePixelRatio, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.drawImage(offscreen, 0, 0, rect.width, rect.height);
    const cx = rect.width / 2,
        cy = rect.height / 2;
    ctx.strokeStyle = '#ffffffc9';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy);
    ctx.lineTo(cx + 10, cy);
    ctx.moveTo(cx, cy - 10);
    ctx.lineTo(cx, cy + 10);
    ctx.stroke();
    ctx.fillStyle = '#24483dd9';
    ctx.font = '11px sans-serif';
    ctx.fillText(method === 'billboard' ? '2D 정면 평면' : '공유된 3D 밀도장', 12, 21);
}
function update() {
    queued = 0;
    const current = state(),
        method = field('method').value as Method,
        angle = value('angle');
    for (const id of ['beta', 'angle', 'drift', 'hole-radius', 'threshold'])
        el(`${id}-value`).textContent =
            id === 'beta'
                ? `${value(id).toFixed(1)} /m`
                : id === 'angle'
                  ? `${angle}°`
                  : id === 'threshold'
                    ? `${Math.round(value(id) * 100)}%`
                    : `${value(id).toFixed(2)} m`;
    field('samples').disabled = method === 'billboard';
    field('drift').disabled = current.shape === 'uniform';
    el('b-angle').textContent = `회전 · ${angle}°`;
    for (let i = 0; i < 2; i++) {
        const a = i === 0 ? 0 : angle,
            ray = viewRay(0, 0, a),
            prefix = i === 0 ? 'a' : 'b';
        const render =
            method === 'billboard'
                ? billboard(0, 0, current)
                : integrate(ray.origin, ray.direction, current, value('samples'), method).transmission;
        const rule = integrate(ray.origin, ray.direction, current, 256).transmission;
        el(`${prefix}-transmission`).textContent = `투과율 ${(render * 100).toFixed(1)}%`;
        el(`${prefix}-rule`).textContent =
            `중앙 광선 차폐 규칙: ${rule < value('threshold') ? '차단' : '통과'} · 기준 투과율 ${(rule * 100).toFixed(1)}% · 독립 256샘플`;
        draw(canvases[i]!, a, current, method);
    }
    el('hole').textContent = hole ? '공유 구멍 메우기' : '공유 구멍 만들기';
    el('hole').setAttribute('aria-pressed', String(hole));
    el('world-state').textContent = hole ? `구멍 있음 · 사건 #${eventNumber}` : '구멍 없는 밀도장';
    el('state-detail').textContent =
        `${current.shape === 'cloud' ? '절차적 밀도 함수' : '균일한 2 m 상자'} · ${hole ? `반경 ${current.holeRadius.toFixed(2)} m` : '두 시점이 같은 상태 참조'}`;
    el('render-state').textContent = {
        corrected: '간격에 맞춘 α',
        fixed: '고정 α · 품질에 종속',
        billboard: '회전하는 2D 평면',
    }[method];
    el('sample-cost').textContent =
        method === 'billboard'
            ? '각 180 × 128 픽셀 · 2D 분포 조회'
            : `각 180 × 128 픽셀 · 광선당 최대 ${value('samples')}회 밀도 조회`;
    el('reference').textContent = 'T = exp(−1) ≈ 36.8%';
    el('summary').textContent =
        method === 'fixed'
            ? `샘플 길이를 무시한 α를 반복합니다. 품질 옵션이 화면의 차폐량을 바꾸지만, 아래 판정은 동일한 월드와 독립된 256샘플을 사용합니다.`
            : method === 'billboard'
              ? `같은 2D 분포를 카메라 정면으로 돌려 그립니다. B를 돌려도 구멍과 농도가 그대로이지만, 3D 월드의 차폐 판정은 달라질 수 있습니다.`
              : hole
                ? `하나의 월드 구멍을 함께 적용했습니다. 같은 시점에서는 같은 영상이 나오며, 시점을 바꾸면 광선이 통과하는 구멍과 밀도의 길이가 달라질 수 있습니다.`
                : `샘플 길이에 맞춰 흡수량을 누적합니다. ‘균일 밀도 검증’에서 샘플을 바꿔 A의 투과율이 유지되는지 확인하세요.`;
}
function schedule() {
    if (!queued) queued = requestAnimationFrame(update);
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
    schedule();
    syncMenu();
    if (focus) (open ? el('close-menu') : el('menu')).focus();
}
function reset(uniform = false, withHole = false) {
    field('method').value = 'corrected';
    field('shape').value = uniform ? 'uniform' : 'cloud';
    field('beta').value = uniform ? '0.5' : '2.4';
    field('samples').value = uniform ? '10' : '20';
    field('angle').value = '70';
    field('drift').value = '0';
    field('hole-radius').value = '0.2';
    field('threshold').value = '0.5';
    hole = withHole;
    eventNumber = withHole ? 1 : 0;
    schedule();
}
for (const id of ['method', 'shape', 'beta', 'samples', 'angle', 'drift', 'hole-radius', 'threshold']) {
    field(id).addEventListener('input', schedule);
    field(id).addEventListener('change', schedule);
}
el('hole').addEventListener('click', () => {
    hole = !hole;
    eventNumber++;
    schedule();
});
el('reset').addEventListener('click', () => reset());
el('uniform-preset').addEventListener('click', () => reset(true));
el('cloud-preset').addEventListener('click', () => reset(false, true));
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
const observer = new ResizeObserver(schedule);
observer.observe(canvases[0]!);
window.addEventListener('pagehide', (event) => {
    cancelAnimationFrame(queued);
    queued = 0;
    if (!event.persisted) observer.disconnect();
});
window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        observer.observe(canvases[0]!);
        syncMenu();
        schedule();
    }
});
window.addEventListener('resize', syncMenu);
menu(window.innerWidth >= 1100, false);
