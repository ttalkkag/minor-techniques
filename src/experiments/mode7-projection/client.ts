import { rowPoint, rayPoint, affinePoint, mapBoundary, mapColor } from './model';
const input = (id: string) => document.getElementById(id) as HTMLInputElement;
const canvas = document.getElementById('scene') as HTMLCanvasElement,
    ctx = canvas.getContext('2d')!;
const settings = document.getElementById('settings')!,
    menu = document.getElementById('menu')!,
    dialog = document.getElementById('explanation') as HTMLDialogElement;
const buffers = [document.createElement('canvas'), document.createElement('canvas')];
buffers.forEach((c) => {
    c.width = 280;
    c.height = 180;
});
const map = document.createElement('canvas');
map.width = map.height = 144;
const mapCtx = map.getContext('2d')!,
    mapImg = mapCtx.createImageData(144, 144);
for (let y = 0; y < 144; y++)
    for (let x = 0; x < 144; x++) {
        const color = mapColor(x / 6 - 12, 12 - y / 6),
            i = (y * 144 + x) * 4;
        mapImg.data.set([...color, 255], i);
    }
mapCtx.putImageData(mapImg, 0, 0);
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
    const height = Number(input('height').value),
        yaw = (Number(input('yaw').value) * Math.PI) / 180,
        cameraZ = -8 + Number(input('forward').value),
        row = Number(input('row').value),
        sampleY = row + 0.5,
        boundary = input('boundary').value,
        ray = input('mode').value === 'ray';
    ctx.fillStyle = '#f5f8f8';
    ctx.fillRect(0, 0, w, h);
    const narrow = w < 650,
        mapHeight = 162,
        areaH = h - mapHeight,
        panelW = narrow ? w : w / 2,
        panelH = narrow ? areaH / 2 : areaH;
    for (let p = 0; p < 2; p++) {
        const off = buffers[p]!,
            offCtx = off.getContext('2d')!,
            img = offCtx.createImageData(280, 180);
        for (let y = 0; y < 180; y++)
            for (let x = 0; x < 280; x++) {
                let color = [211, 227, 231];
                if (y > 36) {
                    const point = p
                        ? ray
                            ? rayPoint(x + 0.5, y + 0.5, height, yaw, cameraZ)
                            : rowPoint(x + 0.5, y + 0.5, height, yaw, cameraZ)
                        : affinePoint(x + 0.5, y + 0.5, yaw, cameraZ);
                    const coord = point && point.t <= 100 ? mapBoundary(point.x, point.z, boundary) : null;
                    color = coord ? mapColor(coord[0], coord[1]) : [232, 235, 222];
                }
                const index = (y * 280 + x) * 4;
                img.data[index] = color[0]!;
                img.data[index + 1] = color[1]!;
                img.data[index + 2] = color[2]!;
                img.data[index + 3] = 255;
            }
        offCtx.putImageData(img, 0, 0);
        if (input('obstacle').checked) {
            if (p) {
                const forward = Math.cos(yaw) * (1 - cameraZ),
                    side = -Math.sin(yaw) * (1 - cameraZ);
                if (forward > 0.1) {
                    const px = 140 + (150 * side) / forward,
                        by = 36 + (150 * height) / forward,
                        ty = 36 + (150 * (height - 2)) / forward,
                        width = (150 * 0.5) / forward;
                    offCtx.fillStyle = '#d58448';
                    offCtx.fillRect(px - width / 2, ty, width, by - ty);
                    offCtx.strokeStyle = '#794427';
                    offCtx.strokeRect(px - width / 2, ty, width, by - ty);
                }
            } else {
                const forward = Math.cos(yaw) * (1 - cameraZ),
                    side = -Math.sin(yaw) * (1 - cameraZ);
                offCtx.fillStyle = '#d58448';
                offCtx.fillRect(140 + side / 0.055 - 4, 180 - (forward - 1) / 0.075 - 4, 8, 8);
            }
        }
        const ox = narrow ? 0 : p * panelW,
            oy = narrow ? p * panelH : 0,
            scale = Math.min((panelW - 24) / 280, (panelH - 36) / 180),
            iw = scale * 280,
            ih = scale * 180,
            ix = ox + (panelW - iw) / 2,
            iy = oy + 31;
        ctx.fillStyle = '#35545f';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText(
            p ? (ray ? 'B  3D 광선–바닥 교차' : 'B  행마다 다른 맵 간격') : 'A  전역 아핀 · 일정한 간격',
            ox + 14,
            oy + 22,
        );
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(off, ix, iy, iw, ih);
        ctx.strokeStyle = '#ef9a39';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ix, iy + sampleY * scale);
        ctx.lineTo(ix + iw, iy + sampleY * scale);
        ctx.stroke();
    }
    const mapSize = 135,
        mx = narrow ? 12 : 28,
        my = h - mapHeight + 12;
    ctx.drawImage(map, mx, my, mapSize, mapSize);
    ctx.save();
    ctx.beginPath();
    ctx.rect(mx, my, mapSize, mapSize);
    ctx.clip();
    const convert = (x: number, z: number) => [
        mx + ((x + 12) / 24) * mapSize,
        my + ((12 - z) / 24) * mapSize,
    ];
    for (let p = 0; p < 2; p++) {
        const start = p ? rowPoint(0.5, sampleY, height, yaw, cameraZ)! : affinePoint(0.5, sampleY, yaw, cameraZ),
            end = p ? rowPoint(279.5, sampleY, height, yaw, cameraZ)! : affinePoint(279.5, sampleY, yaw, cameraZ),
            a = convert(start.x, start.z),
            b = convert(end.x, end.z);
        ctx.strokeStyle = p ? '#fbb046' : '#a5eef1';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(a[0]!, a[1]!);
        ctx.lineTo(b[0]!, b[1]!);
        ctx.stroke();
    }
    const cp = convert(0, cameraZ);
    ctx.fillStyle = '#203f50';
    ctx.beginPath();
    ctx.arc(cp[0]!, cp[1]!, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    const selected = rowPoint(140.5, sampleY, height, yaw, cameraZ)!,
        sampled = mapBoundary(selected.x, selected.z, boundary),
        raySelected = rayPoint(140.5, sampleY, height, yaw, cameraZ)!;
    const textX = mx + mapSize + 14,
        textWidth = w - textX - 8;
    ctx.fillStyle = '#35545f';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('원본 지도 · 24 × 24m', textX, my + 16, textWidth);
    ctx.font = '12px sans-serif';
    ctx.fillText('청록: 아핀 표본 선', textX, my + 40, textWidth);
    ctx.fillText('주황: 선택 행 표본 선', textX, my + 60, textWidth);
    ctx.fillText(`3D 대응 오차`, textX, my + 85, textWidth);
    ctx.fillText(
        `${Math.hypot(selected.x - raySelected.x, selected.z - raySelected.z).toExponential(2)} m`,
        textX,
        my + 105,
        textWidth,
    );
    for (const id of ['height', 'yaw', 'forward', 'row'])
        document.getElementById(`${id}-value`)!.textContent =
            `${input(id).value}${id === 'yaw' ? '°' : id === 'row' ? ' px' : ' m'}`;
    document.getElementById('metric-0')!.textContent = `${selected.t.toFixed(3)} m`;
    document.getElementById('metric-1')!.textContent = `${(selected.t / 150).toFixed(4)} m/px`;
    document.getElementById('metric-2')!.textContent = `(${selected.x.toFixed(2)}, ${selected.z.toFixed(2)})`;
    document.getElementById('summary')!.textContent =
        `${row}행의 픽셀 중심 y=${sampleY}는 앞쪽 ${selected.t.toFixed(2)}m를 읽습니다. 전역 아핀의 가로 간격은 0.055m/px로 일정합니다. ${selected.t > 100 ? '선택 행은 최대 거리 100m 밖이므로 바닥 샘플을 그리지 않습니다.' : sampled ? `경계 처리 후 중앙 맵 좌표 (${sampled[0].toFixed(2)}, ${sampled[1].toFixed(2)}).` : '선택 픽셀은 지도 밖이므로 비워집니다.'} ${input('obstacle').checked ? '오른쪽 기둥은 높이 2m를 별도 원근 투영합니다.' : ''}`;
}
settings.addEventListener('input', render);
settings.addEventListener('change', render);
document.getElementById('reset')!.addEventListener('click', () => {
    input('mode').value = 'rows';
    input('height').value = '2';
    input('yaw').value = '0';
    input('forward').value = '0';
    input('row').value = '96';
    input('boundary').value = 'repeat';
    input('obstacle').checked = false;
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
