import { field, perlin, worley, gradient, density as remapDensity } from './model';
const get = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = get<HTMLCanvasElement>('scene'),
    ctx = canvas.getContext('2d')!;
const menu = get<HTMLButtonElement>('menu'),
    settings = get<HTMLElement>('settings'),
    info = get<HTMLDialogElement>('info');
const background = [
    ...document.querySelectorAll<HTMLElement>(
        'main > :not(nav):not(#settings):not(dialog), nav > :not(#menu)',
    ),
];
function menuOpen(open: boolean) {
    settings.hidden = !open;
    settings.setAttribute('role', 'dialog');
    settings.setAttribute('aria-modal', String(open));
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? '설정 메뉴 닫기' : '설정 메뉴 열기');
    menu.tabIndex = open ? -1 : 0;
    background.forEach((element) => {
        element.inert = open;
    });
    if (open) {
        settings.scrollTop = 0;
        get('close-menu').focus();
    } else menu.focus();
}
menu.addEventListener('click', () => menuOpen(Boolean(settings.hidden)));
get('close-menu').addEventListener('click', () => menuOpen(false));
get('explain').addEventListener('click', () => info.showModal());
get('close-info').addEventListener('click', () => info.close());
document.addEventListener('keydown', (e) => {
    if (settings.hidden || info.open) return;
    if (e.key === 'Escape') {
        e.preventDefault();
        menuOpen(false);
    } else if (e.key === 'Tab') {
        const controls = [...settings.querySelectorAll<HTMLElement>('button, input, select, a[href]')].filter(
            (element) => !element.hasAttribute('disabled') && element.getClientRects().length,
        );
        const first = controls[0],
            last = controls[controls.length - 1];
        if (e.shiftKey && (document.activeElement === first || !settings.contains(document.activeElement))) {
            e.preventDefault();
            last.focus();
        } else if (
            !e.shiftKey &&
            (document.activeElement === last || !settings.contains(document.activeElement))
        ) {
            e.preventDefault();
            first.focus();
        }
    }
});
function surface() {
    const r = canvas.getBoundingClientRect(),
        dpr = Math.min(devicePixelRatio, 2);
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w: r.width, h: r.height };
}
function textAt(text: string, x: number, y: number, color = '#334d58', size = 13) {
    ctx.fillStyle = color;
    ctx.font = `${size}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(text, x, y);
}
function range(id: string) {
    const control = get<HTMLInputElement>(id);
    get(`${id}-value`).textContent = control.value;
    return Number(control.value);
}
let uniform = false,
    cached = '',
    images: HTMLCanvasElement[] = [];
function draw() {
    const { w, h } = surface(),
        kind = get<HTMLSelectElement>('kind').value,
        seed = range('seed'),
        frequency = range('frequency'),
        octaves = range('octaves'),
        gain = range('gain'),
        warp = range('warp'),
        threshold = range('threshold'),
        sx = range('sample-x'),
        sy = range('sample-y'),
        density = get<HTMLSelectElement>('remap').value === 'density';
    const key = JSON.stringify([kind, seed, frequency, octaves, gain, warp, threshold, density]);
    if (key !== cached) {
        images = [0, 1].map((index) => {
            const tile = document.createElement('canvas');
            tile.width = 144;
            tile.height = 144;
            const c = tile.getContext('2d')!,
                data = c.createImageData(144, 144);
            for (let y = 0; y < 144; y++)
                for (let x = 0; x < 144; x++) {
                    const n = field(
                            ((x / 144) * 6 - 3) * frequency,
                            ((y / 144) * 6 - 3) * frequency,
                            seed,
                            kind,
                            index ? octaves : 1,
                            gain,
                            index ? warp : 0,
                        ),
                        value =
                            index && density
                                ? remapDensity(n, threshold)
                                : Math.max(0, Math.min(1, n * 0.5 + 0.5));
                    const p = (y * 144 + x) * 4;
                    data.data[p] = Math.round(32 + value * 194);
                    data.data[p + 1] = Math.round(78 + value * 166);
                    data.data[p + 2] = Math.round(88 + value * 150);
                    data.data[p + 3] = 255;
                }
            c.putImageData(data, 0, 0);
            return tile;
        });
        cached = key;
    }
    const mobile = w < 650,
        mapSize = Math.min(mobile ? w * 0.57 : w * 0.36, mobile ? h * 0.31 : h * 0.55),
        top = 40;
    images.forEach((image, index) => {
        const x = mobile ? (w - mapSize) / 2 : w * (index ? 0.72 : 0.28) - mapSize / 2,
            y = mobile ? top + index * (mapSize + 37) : top;
        ctx.drawImage(image, x, y, mapSize, mapSize);
        textAt(
            index ? (density ? '옥타브 → 밀도' : '옥타브 → 높이') : '기본 함수 · 한 옥타브',
            x + mapSize / 2,
            y - 14,
            index ? '#0a786e' : '#596f75',
            13,
        );
        const px = x + (sx / 6 + 0.5) * mapSize,
            py = y + (sy / 6 + 0.5) * mapSize;
        ctx.strokeStyle = '#f29a47';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px - 6, py);
        ctx.lineTo(px + 6, py);
        ctx.moveTo(px, py - 6);
        ctx.lineTo(px, py + 6);
        ctx.stroke();
    });
    const detailY = mobile ? top + 2 * (mapSize + 37) : mapSize + 90,
        size = Math.min(110, h - detailY - 35),
        cx = w / 2,
        cy = detailY + size / 2,
        ix = Math.floor(sx),
        iy = Math.floor(sy),
        u = sx - ix,
        v = sy - iy;
    ctx.strokeStyle = '#bacbce';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - size / 2, cy - size / 2, size, size);
    const selected = {
        x: cx - size / 2 + u * size,
        y: cy - size / 2 + v * size,
    };
    ctx.fillStyle = '#e99541';
    ctx.beginPath();
    ctx.arc(selected.x, selected.y, 5, 0, Math.PI * 2);
    ctx.fill();
    const gradientResult = perlin(sx, sy, seed, uniform),
        worleyResult = worley(sx, sy, seed, get<HTMLInputElement>('own-only').checked);
    if (kind === 'gradient' || kind === 'random')
        for (let i = 0; i < 4; i++) {
            const x = cx - size / 2 + (i % 2) * size,
                y = cy - size / 2 + Math.floor(i / 2) * size,
                g = uniform ? [1, 0] : gradient(ix + (i % 2), iy + Math.floor(i / 2), seed);
            ctx.strokeStyle = '#127a74';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + g[0] * 22, y + g[1] * 22);
            ctx.stroke();
            textAt(gradientResult.dots[i].toFixed(2), x + (i % 2 ? 20 : -20), y + 15, '#526c72', 11);
        }
    else
        worleyResult.candidates.slice(0, 6).forEach((p, i) => {
            const x = cx - size / 2 + (p.x - ix) * size,
                y = cy - size / 2 + (p.y - iy) * size;
            if (x < 15 || x > w - 15 || y < detailY - 15 || y > h - 15) return;
            ctx.fillStyle = i === 0 ? '#e9973c' : '#2d8d80';
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
            if (i < 2) {
                ctx.strokeStyle = i === 0 ? '#d88833' : '#51958c';
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(selected.x, selected.y);
                ctx.stroke();
            }
        });
    const final = field(sx * frequency, sy * frequency, seed, kind, octaves, gain, warp),
        mapped = density ? remapDensity(final, threshold) : final;
    get('metric-0').textContent = (
        kind === 'gradient'
            ? gradientResult.value
            : kind === 'f1'
              ? worleyResult.f1
              : kind === 'f2'
                ? worleyResult.f2 - worleyResult.f1
                : field(sx, sy, seed, kind, 1, gain, 0)
    ).toFixed(4);
    get('metric-1').textContent = `${worleyResult.f1.toFixed(2)} / ${worleyResult.f2.toFixed(2)}`;
    get('metric-2').textContent = mapped.toFixed(4);
    get('summary').textContent =
        `선택 셀 (${ix},${iy}), 내부 (${u.toFixed(2)},${v.toFixed(2)}). ${kind === 'gradient' ? `내적 합 ${gradientResult.dots.reduce((s, v) => s + v, 0).toFixed(4)}, fade 보간 ${gradientResult.value.toFixed(6)}.${uniform ? ' 네 gradient=(1,0)인 계산 예제입니다. 지도는 일반 gradient를 유지합니다.' : ''}` : `Worley 검색 ${worleyResult.candidates.length}점, ${worleyResult.ring}개 이웃 고리.${get<HTMLInputElement>('own-only').checked ? ' 현재 셀만 보므로 F2도 잘못될 수 있습니다.' : ''}`} 지도의 십자는 주파수를 적용하기 전 좌표이며 아래 도식은 기본 셀을 보여 줍니다.`;
}
document
    .querySelectorAll<HTMLInputElement | HTMLSelectElement>('#settings input,#settings select')
    .forEach((c) => {
        c.addEventListener('input', draw);
        c.addEventListener('change', draw);
    });
get('example').addEventListener('click', () => {
    uniform = true;
    get<HTMLSelectElement>('kind').value = 'gradient';
    get<HTMLInputElement>('sample-x').value = '.25';
    get<HTMLInputElement>('sample-y').value = '.5';
    draw();
});
get('reset').addEventListener('click', () => {
    uniform = false;
    get<HTMLSelectElement>('kind').value = 'gradient';
    get<HTMLSelectElement>('remap').value = 'height';
    for (const [id, value] of Object.entries({
        seed: '7',
        frequency: '1',
        octaves: '3',
        gain: '.5',
        warp: '0',
        threshold: '0',
        'sample-x': '.25',
        'sample-y': '.5',
    }))
        get<HTMLInputElement>(id).value = value;
    get<HTMLInputElement>('own-only').checked = false;
    cached = '';
    draw();
});
const observer = new ResizeObserver(draw);
observer.observe(canvas);
window.addEventListener('pagehide', () => observer.disconnect());
window.addEventListener('pageshow', () => {
    observer.observe(canvas);
    draw();
});
draw();
