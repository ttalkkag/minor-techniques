import { shoot, defaults } from './model';
import type { Options, Point } from './model';
import { createPlayback } from '../../components/experiment-playback';
const el = (id: string) => document.getElementById(id)!;
const input = (id: string) => el(id) as HTMLInputElement;
const select = (id: string) => el(id) as HTMLSelectElement;
const canvas = el('scene') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const abort = new AbortController();
const on = (id: string, type: string, fn: EventListener) =>
    el(id).addEventListener(type, fn, { signal: abort.signal });
let w = 0,
    h = 0;
const text = (value: string, x: number, y: number, color = '#3c5b65', size = 13, maxWidth?: number) => {
    ctx.fillStyle = color;
    ctx.font = `600 ${size}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillText(value, x, y, maxWidth);
};
const rect = (x: number, y: number, width: number, height: number, color: string, radius = 10) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, Math.max(0, width), Math.max(0, height), radius);
    ctx.fill();
};
const line = (x1: number, y1: number, x2: number, y2: number, color: string, dashed = false, size = 2) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.setLineDash(dashed ? [5, 5] : []);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.setLineDash([]);
};
const dot = (x: number, y: number, radius: number, color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
};
function boot(draw: () => void) {
    on('help', 'click', () => (el('explanation') as HTMLDialogElement).showModal());
    on('explain-close', 'click', () => (el('explanation') as HTMLDialogElement).close());
    const resize = () => {
        const bounds = canvas.getBoundingClientRect();
        w = bounds.width;
        h = bounds.height;
        const dpr = Math.min(devicePixelRatio || 1, 2);
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        draw();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    window.addEventListener('pagehide', (event) => {
        observer.disconnect();
        if (!event.persisted) abort.abort();
    });
    window.addEventListener('pageshow', (event) => {
        if (event.persisted) {
            observer.observe(canvas);
            resize();
        }
    });
    resize();
}
let shots = 0;
let lastShot = '';
let phase = 0;
const phases = ['장면 준비', '카메라 광선 검사', '조준점 선택', '총구 경로 검사', '첫 충돌 확정'];
function options(): Options {
    return {
        cameraY: +input('cameraY').value,
        muzzleY: +input('muzzleY').value,
        muzzleX: +input('muzzleX').value,
        cover: +input('cover').value,
        targetX: +input('targetX').value,
        search: +input('search').value,
        range: +input('range').value,
        ignoreSelf: input('ignoreSelf').checked,
        decoration: input('decoration').checked,
    };
}
function draw() {
    const o = options(),
        shot = shoot(o),
        method = select('method').value;
    canvas.dataset.phase = String(phase);
    for (const key of ['cameraY', 'muzzleY', 'muzzleX', 'cover', 'targetX', 'search', 'range'] as const)
        el(`${key}-value`).textContent = `${o[key].toFixed(key === 'muzzleX' ? 2 : 1)}m`;
    shot.results.forEach((value, i) => {
        el(`metric-${i}`).textContent = value;
    });
    const outcome = shot.results[method === 'camera' ? 0 : method === 'parallel' ? 1 : 2]!;
    const phaseLabel = method === 'two'
        ? phases[phase]
        : phase === 3
          ? method === 'camera' ? '카메라 경로 채택' : '총구에서 평행 경로 검사'
          : phases[phase];
    el('summary').textContent = `${phase}/4 · ${phaseLabel}. ${lastShot || `미리 보기: ${outcome}. 청록 점선은 카메라가 고른 목표입니다.`}`;
    ctx.clearRect(0, 0, w, h);
    const maxX = Math.max(12, o.targetX + 2),
        ground = h * 0.73;
    const sx = (x: number) => 24 + (x / maxX) * (w - 48),
        sy = (y: number) => ground - (y / 3) * (h * 0.56);
    rect(12, 12, w - 24, h - 24, '#f5f9fa', 15);
    text('세로 단면 · 높이를 확대해 표시', 25, 36, '#456671', w < 500 ? 11 : 13);
    text(`${phase}/4 · ${phaseLabel}`, 25, 55, '#117f72', 11, w - 50);
    for (let y = 0; y <= 3; y++) {
        line(24, sy(y), w - 24, sy(y), '#dce6e8', true, 1);
        if (y) text(`${y}m`, 26, sy(y) - 6, '#8ba1a8', 10);
    }
    rect(24, ground, w - 48, 16, '#ccdadd', 0);
    for (let x = 0; x < maxX; x += 2) text(`${x}`, sx(x), ground + 31, '#7b929a', 10);
    for (const box of shot.boxes) {
        const excluded = (box.id === '장식' && !o.decoration) || (box.id === '자기 몸' && o.ignoreSelf);
        const color = box.id === '엄폐물' ? '#7e959f' : box.id === '표적' ? '#268d80' : '#b9c8cd';
        ctx.globalAlpha = excluded ? 0.25 : 1;
        rect(
            sx(box.x),
            sy(box.y + box.h),
            Math.max(3, (box.w / maxX) * (w - 48)),
            (box.h / 3) * h * 0.56,
            color,
            2,
        );
        ctx.globalAlpha = 1;
        if (box.id !== '자기 몸')
            text(
                box.id + (excluded ? ' (제외)' : ''),
                Math.min(sx(box.x) - 8, w - 60),
                sy(box.y + box.h) - 10,
                color,
                10,
            );
    }
    const path = (a: Point, b: Point, color: string, dashed = false, size = 2) =>
        line(sx(a.x), sy(a.y), sx(b.x), sy(b.y), color, dashed, size);
    ctx.save();
    ctx.beginPath();
    ctx.rect(24, 45, w - 48, ground - 45);
    ctx.clip();
    if (phase >= 1)
        path(shot.camera, phase === 1 ? shot.searchEnd : shot.aim, '#209b8b', true);
    const start = method === 'camera' ? shot.camera : shot.muzzle;
    const end =
        method === 'camera'
            ? shot.aim
            : method === 'parallel'
              ? (shot.parallelHit?.point ?? shot.parallelEnd)
              : shot.end;
    if (phase >= 3) path(start, end, outcome === '표적' ? '#117f72' : '#d28449', false, 3);
    if (phase >= 4) dot(sx(end.x), sy(end.y), 5, outcome === '표적' ? '#117f72' : '#d28449');
    ctx.restore();
    dot(sx(shot.camera.x), sy(shot.camera.y), 6, '#198d80');
    dot(sx(shot.muzzle.x), sy(shot.muzzle.y), 5, '#d28449');
    text('C', sx(shot.camera.x) - 16, sy(shot.camera.y) - 12, '#137e73', 13);
    text('M', sx(shot.muzzle.x) + 8, sy(shot.muzzle.y) + 17, '#ac6938', 13);
    const aimX = Math.min(w - 28, sx(shot.aim.x));
    if (phase >= 2) {
        line(aimX - 7, sy(shot.aim.y), aimX + 7, sy(shot.aim.y), '#1e746b');
        line(aimX, sy(shot.aim.y) - 7, aimX, sy(shot.aim.y) + 7, '#1e746b');
    }
    text('C 카메라 → 목표 P', 26, h - 49, '#18897a', 12);
    text(
        method === 'two'
            ? 'M 총구 → 첫 충돌점'
            : method === 'camera'
              ? '카메라 판정을 피해에 사용'
              : '총구에서 조준 방향과 평행',
        26,
        h - 27,
        '#b77946',
        12,
    );
}
function reset() {
    playback.pause();
    for (const [key, value] of Object.entries(defaults)) {
        if (typeof value === 'boolean') input(key).checked = value;
        else input(key).value = String(value);
    }
    select('method').value = 'two';
    shots = 0;
    lastShot = '';
    phase = 0;
    draw();
}
for (const id of Object.keys(defaults))
    on(id, 'input', () => {
        playback.pause();
        phase = 0;
        lastShot = '';
        draw();
    });
on('method', 'change', () => {
    playback.pause();
    phase = 0;
    lastShot = '';
    draw();
});
on('fire', 'click', () => {
    playback.pause();
    phase = 4;
    const shot = shoot(options()),
        method = select('method').value,
        index = method === 'camera' ? 0 : method === 'parallel' ? 1 : 2;
    const point =
        index === 0 ? shot.aim : index === 1 ? (shot.parallelHit?.point ?? shot.parallelEnd) : shot.end;
    lastShot = `${++shots}번째 발사: ${shot.results[index]} · 판정과 탄착의 동일 끝점 (${point.x.toFixed(2)}, ${point.y.toFixed(2)})m. 발사 순간 총구 (${shot.muzzle.x.toFixed(2)}, ${shot.muzzle.y.toFixed(2)})m.`;
    draw();
});
on('clear', 'click', () => {
    reset();
    input('cover').value = '0.8';
    draw();
});
on('inside', 'click', () => {
    reset();
    input('muzzleX').value = '2.3';
    draw();
});
on('reset', 'click', reset);
const playback = createPlayback({
    interval: 650,
    advance: () => {
        if (phase === 4) {
            phase = 0;
            lastShot = '';
        }
        phase++;
        draw();
        return phase < 4;
    },
});
boot(draw);
