import { project, quantize, type Point } from './model';
const input = (id: string) => document.getElementById(id) as HTMLInputElement;
const canvas = document.getElementById('scene') as HTMLCanvasElement,
    ctx = canvas.getContext('2d')!;
const settings = document.getElementById('settings')!,
    menu = document.getElementById('menu')!,
    dialog = document.getElementById('explanation') as HTMLDialogElement;
let playing = false,
    raf = 0,
    last = 0;
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
function polygon(points: Point[]) {
    ctx.beginPath();
    points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
}
function render() {
    const w = canvas.clientWidth,
        h = canvas.clientHeight,
        dpr = Math.min(devicePixelRatio, 2);
    if (w < 1 || h < 300) return;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.scale(dpr, dpr);
    const pan = Number(input('pan').value),
        z = Number(input('depth').value),
        grid = Number(input('grid').value),
        snap = input('snap').checked;
    const original = [
            project(-1.17, -0.71, z, pan),
            project(1.12, -0.59, z, pan),
            project(0.13, 1.1, z, pan),
        ],
        rounded = original.map((p) => (snap ? quantize(p, grid) : p));
    ctx.fillStyle = '#f5f8f8';
    ctx.fillRect(0, 0, w, h);
    const narrow = w < 650,
        areaH = h - 120,
        panelW = narrow ? w : w / 2,
        panelH = narrow ? areaH / 2 : areaH;
    for (let i = 0; i < 2; i++) {
        const ox = narrow ? 0 : i * panelW,
            oy = narrow ? i * panelH : 0;
        ctx.font = 'bold 14px sans-serif';
        ctx.fillStyle = '#35525e';
        ctx.fillText(i ? 'B  정점 격자 적용' : 'A  연속 정점', ox + 17, oy + 23);
        const scale = Math.min((panelW - 30) / 160, (panelH - 33) / 100),
            x = ox + (panelW - 160 * scale) / 2,
            y = oy + 30;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        ctx.strokeStyle = '#dce4e5';
        ctx.lineWidth = 1 / scale;
        for (let gx = 0; gx <= 160; gx += 10) {
            ctx.beginPath();
            ctx.moveTo(gx, 0);
            ctx.lineTo(gx, 100);
            ctx.stroke();
        }
        for (let gy = 0; gy <= 100; gy += 10) {
            ctx.beginPath();
            ctx.moveTo(0, gy);
            ctx.lineTo(160, gy);
            ctx.stroke();
        }
        const points = i ? rounded : original;
        polygon(points);
        ctx.fillStyle = i ? '#e5b389' : '#77bdb4';
        ctx.fill();
        if (input('pattern').checked) {
            ctx.save();
            ctx.clip();
            ctx.strokeStyle = i ? '#b56832' : '#157970';
            ctx.lineWidth = 1;
            for (let gx = 15; gx < 160; gx += 6) {
                ctx.beginPath();
                ctx.moveTo(gx, 0);
                ctx.lineTo(gx - 20, 100);
                ctx.stroke();
            }
            ctx.restore();
        }
        polygon(points);
        ctx.lineWidth = 1.8 / scale;
        ctx.strokeStyle = i ? '#a75c25' : '#096f69';
        ctx.stroke();
        if (i) {
            polygon(original);
            ctx.setLineDash([3 / scale, 3 / scale]);
            ctx.strokeStyle = '#147b73';
            ctx.stroke();
            ctx.setLineDash([]);
        }
        points.forEach((p) => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 2 / scale, 0, Math.PI * 2);
            ctx.fillStyle = '#274b59';
            ctx.fill();
        });
        ctx.restore();
    }
    const a = original[0]!,
        b = rounded[0]!,
        plotLeft = Math.max(144, w * 0.36),
        plotRight = w - 18,
        zoom = Math.min(25, 76 / grid, (plotRight - plotLeft - 16) / grid),
        centerX = (plotLeft + plotRight) / 2,
        centerY = h - 58,
        baseX = (a.x + b.x) / 2,
        baseY = (a.y + b.y) / 2;
    ctx.save();
    ctx.beginPath();
    ctx.rect(plotLeft, h - 110, plotRight - plotLeft, 100);
    ctx.clip();
    ctx.strokeStyle = '#c6d4d7';
    ctx.lineWidth = 1;
    for (let x = -5; x < 6; x++) {
        const xx = centerX + (Math.floor(a.x / grid) * grid + x * grid - baseX) * zoom;
        ctx.beginPath();
        ctx.moveTo(xx, h - 104);
        ctx.lineTo(xx, h - 12);
        ctx.stroke();
    }
    for (let y = -5; y < 6; y++) {
        const yy = centerY + (Math.floor(a.y / grid) * grid + y * grid - baseY) * zoom;
        if (yy < h - 103 || yy > h - 12) continue;
        ctx.beginPath();
        ctx.moveTo(plotLeft, yy);
        ctx.lineTo(plotRight, yy);
        ctx.stroke();
    }
    const ax = centerX + (a.x - baseX) * zoom,
        ay = centerY + (a.y - baseY) * zoom,
        bx = centerX + (b.x - baseX) * zoom,
        by = centerY + (b.y - baseY) * zoom;
    ctx.strokeStyle = '#526b77';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
    for (const [x, y, color] of [
        [ax, ay, '#148378'],
        [bx, by, '#c87535'],
    ] as const) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = '#35535e';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('첫 정점 확대', 17, h - 89);
    ctx.font = '12px sans-serif';
    ctx.fillText(`1 논리 px = ${zoom.toFixed(1)}px`, 17, h - 67);
    ctx.fillStyle = '#148378';
    ctx.fillText('● 연속 위치', 17, h - 43);
    ctx.fillStyle = '#a75c25';
    ctx.fillText('● 격자 위치', 17, h - 22);
    document.getElementById('pan-value')!.textContent = `${pan.toFixed(3)} m`;
    document.getElementById('depth-value')!.textContent = `${z.toFixed(1)} m`;
    document.getElementById('metric-0')!.textContent = `(${a.x.toFixed(3)}, ${a.y.toFixed(3)})`;
    document.getElementById('metric-1')!.textContent = `(${b.x.toFixed(3)}, ${b.y.toFixed(3)})`;
    document.getElementById('metric-2')!.textContent =
        `${Math.hypot(a.x - b.x, a.y - b.y).toFixed(4)} 논리 px`;
    document.getElementById('summary')!.textContent =
        `${snap ? `정점을 ${grid} 논리 픽셀 격자에 내림했습니다.` : '정점의 소수 부분을 유지합니다.'} 카메라 +0.005m마다 첫 정점의 연속 x는 ${((70 * 0.005) / z).toFixed(4)}px 이동합니다. 줄무늬 표시 여부는 정점 위치를 바꾸지 않습니다.`;
}
function advance() {
    const next = Number(input('pan').value) + 0.005;
    input('pan').value = (next > 0.5 ? -0.5 : next).toFixed(3);
    render();
}
function stop() {
    playing = false;
    cancelAnimationFrame(raf);
    document.getElementById('play')!.textContent = '느리게 재생';
}
function tick(time: number) {
    if (!playing) return;
    if (time - last > 100) {
        last = time;
        advance();
    }
    raf = requestAnimationFrame(tick);
}
settings.addEventListener('input', render);
settings.addEventListener('change', render);
document.getElementById('step')!.addEventListener('click', () => {
    stop();
    advance();
});
document.getElementById('play')!.addEventListener('click', () => {
    if (playing) stop();
    else {
        playing = true;
        last = performance.now();
        document.getElementById('play')!.textContent = '일시 정지';
        raf = requestAnimationFrame(tick);
    }
});
document.getElementById('reset')!.addEventListener('click', () => {
    stop();
    input('pan').value = '0';
    input('depth').value = '4';
    input('grid').value = '1';
    input('snap').checked = true;
    input('pattern').checked = false;
    render();
});
const resize = new ResizeObserver(render);
resize.observe(canvas.parentElement!);
window.addEventListener('pagehide', () => {
    stop();
    resize.disconnect();
});
window.addEventListener('pageshow', () => {
    resize.observe(canvas.parentElement!);
    syncMenu();
    render();
});
render();
