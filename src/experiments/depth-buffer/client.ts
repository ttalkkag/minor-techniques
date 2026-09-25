import { comparePlates, depth } from './model';
const input = (id: string) => document.getElementById(id) as HTMLInputElement;
const canvas = document.getElementById('scene') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const settings = document.getElementById('settings')!;
const menu = document.getElementById('menu')!;
const dialog = document.getElementById('explanation') as HTMLDialogElement;
let rearFirst = true;
const lab = document.getElementById('lab')!;
const overlayMenu = matchMedia('(max-width: 1099px)');
function syncMenu() {
    const modal = !settings.hidden && overlayMenu.matches;
    for (const child of lab.children)
        if (child instanceof HTMLElement && child !== settings) child.inert = modal;
    if (modal) {
        settings.setAttribute('role', 'dialog');
        settings.setAttribute('aria-modal', 'true');
        if (!settings.contains(document.activeElement) && !dialog.open)
            document.getElementById('close-menu')!.focus();
    } else {
        settings.setAttribute('role', 'complementary');
        settings.removeAttribute('aria-modal');
    }
}
function setMenu(open: boolean) {
    settings.hidden = !open;
    menu.setAttribute('aria-expanded', String(open));
    lab.classList.toggle('menu-open', open);
    syncMenu();
    if (open) document.getElementById('close-menu')!.focus();
    else menu.focus();
}
overlayMenu.addEventListener('change', syncMenu);
menu.addEventListener('click', () => setMenu(Boolean(settings.hidden)));
document.getElementById('close-menu')!.addEventListener('click', () => setMenu(false));
document.getElementById('explain')!.addEventListener('click', () => dialog.showModal());
document.getElementById('close-dialog')!.addEventListener('click', () => dialog.close());
const key = (e: KeyboardEvent) => {
    if (dialog.open || settings.hidden) return;
    if (e.key === 'Escape') {
        e.preventDefault();
        setMenu(false);
    } else if (e.key === 'Tab' && overlayMenu.matches) {
        const controls = Array.from(settings.querySelectorAll<HTMLElement>('button, input, select, a[href]'))
            .filter((control) => !control.hasAttribute('disabled') && control.getClientRects().length);
        const first = controls[0]!, last = controls[controls.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }
};
document.addEventListener('keydown', key);
function render() {
    const w = canvas.clientWidth,
        h = canvas.clientHeight,
        dpr = Math.min(devicePixelRatio, 2);
    if (w < 1 || h < 300) return;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.scale(dpr, dpr);
    const z = 10 ** Number(input('distance').value),
        gap = input('coincident').checked ? 0 : 10 ** Number(input('gap').value),
        near = 10 ** Number(input('near').value),
        format = input('format').value;
    for (const [name, val] of [
        ['distance', z],
        ['gap', gap],
        ['near', near],
    ] as const)
        document.getElementById(`${name}-value`)!.textContent =
            `${val < 1 ? val.toPrecision(3) : val.toLocaleString('en', { maximumFractionDigits: 1 })} m`;
    ctx.fillStyle = '#f5f8f8';
    ctx.fillRect(0, 0, w, h);
    const narrow = w < 650,
        panelW = narrow ? w : w / 2,
        panelH = narrow ? (h - 85) / 2 : h - 105;
    const count: number[] = [], clearRejected: number[] = [];
    for (let p = 0; p < 2; p++) {
        const ox = narrow ? 0 : p * panelW,
            oy = narrow ? p * panelH : 0;
        ctx.fillStyle = '#2c4e5a';
        ctx.font = 'bold 15px sans-serif';
        ctx.fillText(p ? 'B  반전 깊이 · GREATER' : 'A  일반 깊이 · LESS', ox + 18, oy + 26);
        const cols = 20,
            rows = 6,
            left = ox + panelW * 0.12,
            top = oy + 45,
            pw = panelW * 0.73,
            ph = panelH - 78;
        let ties = 0, empty = 0, rejected = 0;
        for (let x = 0; x < cols; x++)
            for (let y = 0; y < rows; y++) {
                const sampleZ = z * (0.8 + (x / (cols - 1)) * 0.4);
                const result = comparePlates(sampleZ, gap, near, 100000, format, p === 1, rearFirst);
                if (result.tied) ties++;
                if (result.visible === null) empty++;
                if (result.clearRejected) rejected++;
                const point = (u: number, v: number) => [
                    left + pw * u + (1 - v) * 24,
                    top + ph * v + (1 - u) * 12,
                ];
                const a = point(x / cols, y / rows),
                    b = point((x + 1) / cols, y / rows),
                    c = point((x + 1) / cols, (y + 1) / rows),
                    d = point(x / cols, (y + 1) / rows);
                ctx.beginPath();
                ctx.moveTo(a[0]!, a[1]!);
                ctx.lineTo(b[0]!, b[1]!);
                ctx.lineTo(c[0]!, c[1]!);
                ctx.lineTo(d[0]!, d[1]!);
                ctx.closePath();
                ctx.fillStyle = result.visible === null ? '#d4dee1'
                    : result.visible === 'back' ? '#d78045' : '#16877e';
                ctx.fill();
                ctx.strokeStyle = '#f6f8f870';
                ctx.lineWidth = 0.6;
                ctx.stroke();
            }
        count.push(ties);
        clearRejected.push(rejected);
        ctx.fillStyle = '#3d5963';
        ctx.font = '12px sans-serif';
        ctx.fillText(`${ties}/120 동률 · ${empty}/120 미표시`, ox + 18, oy + panelH - 4);
    }
    const bottom = narrow ? panelH * 2 + 17 : panelH + 24;
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#16877e';
    ctx.fillText('● 앞 판', 18, bottom);
    ctx.fillStyle = '#b86327';
    ctx.fillText('● 뒤 판', 93, bottom);
    ctx.fillStyle = '#526b77';
    ctx.fillText('● 미표시', 168, bottom);
    ctx.fillStyle = '#405e6a';
    ctx.fillText(rearFirst ? '뒤 판 → 앞 판 순서' : '앞 판 → 뒤 판 순서', 18, bottom + 23);
    if (!narrow) {
        ctx.fillText('실수 깊이: near', w * 0.49, bottom);
        ctx.fillText('far', w - 34, bottom);
        const start = w * 0.66,
            end = w - 47;
        ctx.strokeStyle = '#9badb3';
        ctx.beginPath();
        ctx.moveTo(start, bottom - 4);
        ctx.lineTo(end, bottom - 4);
        ctx.stroke();
        for (let i = 0; i < 25; i++) {
            const zz = near * (100000 / near) ** (i / 24),
                d = depth(zz, near, 100000, false);
            ctx.strokeStyle = '#177f77';
            ctx.beginPath();
            ctx.moveTo(start + d * (end - start), bottom - 11);
            ctx.lineTo(start + d * (end - start), bottom + 4);
            ctx.stroke();
        }
        ctx.fillText('등비 거리 표본을 일반 깊이에 배치', w * 0.49, bottom + 23);
    }
    document.getElementById('metric-0')!.textContent = `${count[0]} / 120`;
    document.getElementById('metric-1')!.textContent = `${count[1]} / 120`;
    const a = comparePlates(z, gap, near, 100000, format, false, rearFirst),
        b = comparePlates(z, gap, near, 100000, format, true, rearFirst);
    const clipped =
        Array.from({ length: 20 }, (_, i) => z * (0.8 + (i / 19) * 0.4) < near).filter(Boolean).length * 6;
    document.getElementById('metric-2')!.textContent =
        z < near
            ? '중앙 앞 판 잘림'
            : `${Math.abs(a.front - a.back).toExponential(2)} / ${Math.abs(b.front - b.back).toExponential(2)}`;
    document.getElementById('summary')!.textContent =
        `일반 ${count[0]}개 · 반전 ${count[1]}개 표본이 같은 값으로 합쳐졌습니다. ${clipped ? `Near 앞의 ${clipped}개 앞 판 표본은 잘립니다.` : `중앙 저장값 A=${a.front.toPrecision(9)}, B=${b.front.toPrecision(9)}.`} ${clearRejected.some(Boolean) ? `초기 깊이와 같아 엄격 비교를 통과하지 못한 표본은 일반 ${clearRejected[0]}개 · 반전 ${clearRejected[1]}개이며 회색으로 표시합니다. ` : ''}${gap === 0 ? '완전히 겹친 면은 두 방식 모두 순서를 구분할 수 없습니다.' : format === 'float' ? '반전은 먼 거리의 작은 부동소수점 간격을 활용합니다.' : '균등 정수 포맷은 반전해도 같은 눈금 간격을 사용합니다.'}`;
}
settings.addEventListener('input', render);
settings.addEventListener('change', render);
document.getElementById('order')!.addEventListener('click', () => {
    rearFirst = !rearFirst;
    render();
});
document.getElementById('reset')!.addEventListener('click', () => {
    input('distance').value = '3.7';
    input('gap').value = '-2';
    input('near').value = '-1';
    input('format').value = 'float';
    input('coincident').checked = false;
    rearFirst = true;
    render();
});
const resize = new ResizeObserver(render);
resize.observe(canvas.parentElement!);
window.addEventListener('pagehide', () => {
    resize.disconnect();
});
window.addEventListener('pageshow', () => {
    resize.observe(canvas.parentElement!);
    syncMenu();
    render();
});
render();
