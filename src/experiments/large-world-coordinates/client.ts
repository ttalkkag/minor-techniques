import { initial, step, rebase, relative, ulp } from './model';
import { createPlayback } from '../../components/experiment-playback';
const input = (id: string) => document.getElementById(id) as HTMLInputElement;
const canvas = document.getElementById('scene') as HTMLCanvasElement,
    ctx = canvas.getContext('2d')!;
const settings = document.getElementById('settings')!,
    dialog = document.getElementById('explanation') as HTMLDialogElement;
let state = initial(20),
    lastRebase = '',
    history: { request: number; stored: number; screen: number }[] = [];
document.getElementById('explain')!.addEventListener('click', () => dialog.showModal());
document.getElementById('close-dialog')!.addEventListener('click', () => dialog.close());
const fmt = (v: number) =>
    Math.abs(v) > 1000 ? v.toLocaleString('en', { maximumFractionDigits: 3 }) : v.toFixed(5);
function record() {
    history.push({
        request: state.requested - state.start,
        stored: state.origin + state.local - state.start,
        screen: relative(state, input('render').value === 'early'),
    });
    if (history.length > 60) history.shift();
}
function render() {
    const w = canvas.clientWidth,
        h = canvas.clientHeight,
        dpr = Math.min(devicePixelRatio, 2);
    if (w < 1 || h < 300) return;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#f5f8f8';
    ctx.fillRect(0, 0, w, h);
    const actual = state.origin + state.local - state.start,
        requested = state.requested - state.start,
        rendered = relative(state, input('render').value === 'early');
    const extent = Math.max(0.7, requested * 1.2, Math.abs(actual) * 1.2),
        left = 30,
        right = w - 30,
        scale = (right - left) / extent;
    const tracks = [
        { label: '요청한 이동 · 고정밀도 기준', x: requested, color: '#708a97' },
        { label: '게임 상태에 저장한 위치', x: actual, color: '#d78045' },
        { label: '화면으로 넘긴 상대 위치', x: rendered, color: '#16877e' },
    ];
    for (let i = 0; i < tracks.length; i++) {
        const t = tracks[i]!,
            y = 63 + i * 83;
        ctx.fillStyle = '#314f5d';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText(t.label, left, y - 27);
        ctx.strokeStyle = '#becdd2';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(left, y);
        ctx.lineTo(right, y);
        ctx.stroke();
        for (let j = 0; j <= 10; j++) {
            const x = left + ((right - left) * j) / 10;
            ctx.beginPath();
            ctx.moveTo(x, y - 5);
            ctx.lineTo(x, y + 5);
            ctx.stroke();
        }
        const xx = Math.max(left, Math.min(right, left + t.x * scale));
        ctx.fillStyle = t.color;
        ctx.beginPath();
        ctx.arc(xx, y, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = '12px sans-serif';
        ctx.fillText(`${fmt(t.x)} m`, Math.min(xx + 14, w - 100), y + 23);
        if (i === 1) {
            const colliderX = left + (state.origin + state.obstacle - state.start) * scale;
            ctx.fillStyle = '#536d7b';
            if (colliderX <= right) ctx.fillRect(colliderX - 3, y - 17, 6, 34);
            else {
                ctx.font = '12px sans-serif';
                ctx.fillText('충돌체 → 화면 밖', right - 116, y - 13);
            }
        }
    }
    const gy = 295,
        gh = h - gy - 30;
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#45616d';
    ctx.fillText(`최근 ${history.length}개 표본 · 요청 / 상태 / 화면`, left, gy - 3);
    if (gh > 25 && history.length > 1)
        for (const [field, color] of [
            ['request', '#708a97'],
            ['stored', '#d78045'],
            ['screen', '#16877e'],
        ] as const) {
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            history.forEach((v, i) => {
                const x = left + (i / (history.length - 1)) * (right - left),
                    y = gy + gh - (v[field] / extent) * gh;
                if (i) ctx.lineTo(x, y);
                else ctx.moveTo(x, y);
            });
            ctx.stroke();
        }
    document.getElementById('exponent-value')!.textContent = `2^${input('exponent').value} m`;
    document.getElementById('delta-value')!.textContent = `${Number(input('delta').value).toFixed(3)} m`;
    document.getElementById('metric-0')!.textContent = `${fmt(requested)} / ${fmt(actual)} m`;
    document.getElementById('metric-1')!.textContent = `${fmt(rendered)} m`;
    document.getElementById('metric-2')!.textContent = `${fmt(state.obstacle - state.local)} m`;
    document.getElementById('summary')!.textContent =
        `${state.steps} 스텝. 원점 O=${fmt(state.origin)}, 로컬 L=${fmt(state.local)}. 로컬 위치의 binary32 위쪽 간격 ${ulp(state.local).toPrecision(3)}m. ${lastRebase || (Math.abs(requested - actual) > 0.001 ? '상태 저장에서 이미 작은 이동을 잃었습니다.' : Math.abs(actual - rendered) > 0.001 ? '상태는 이동했지만 화면 전달에서 차이를 잃었습니다.' : '상태와 화면에서 이동을 유지합니다.')}`;
}
function advance(count: number) {
    lastRebase = '';
    for (let i = 0; i < count; i++) {
        state = step(state, Number(input('delta').value), input('storage').value);
        record();
    }
    render();
}
function reset() {
    playback.pause();
    state = initial(Number(input('exponent').value));
    lastRebase = '';
    history = [];
    record();
    render();
}
function settingChanged(e: Event) {
    playback.pause();
    const id = (e.target as HTMLElement).id;
    if (id === 'omit') return;
    if (id === 'render') {
        record();
        render();
    } else reset();
}
const playback = createPlayback({ interval: 200, advance: () => advance(1) });
settings.addEventListener('input', settingChanged);
settings.addEventListener('change', settingChanged);
document.getElementById('steps')!.addEventListener('click', () => {
    playback.pause();
    advance(20);
});
document.getElementById('rebase')!.addEventListener('click', () => {
    playback.pause();
    const before = state.origin + state.local,
        distance = state.obstacle - state.local;
    state = rebase(state, input('omit').checked);
    lastRebase = `원점 이동: 전역 위치 변화 ${fmt(state.origin + state.local - before)}m, 충돌체 간격 변화 ${fmt(state.obstacle - state.local - distance)}m.`;
    record();
    render();
});
document.getElementById('reset')!.addEventListener('click', () => {
    input('exponent').value = '20';
    input('delta').value = '.03';
    input('storage').value = 'float';
    input('render').value = 'late';
    input('omit').checked = false;
    reset();
});
const resize = new ResizeObserver(render);
resize.observe(canvas.parentElement!);
window.addEventListener('pagehide', () => {
    resize.disconnect();
});
window.addEventListener('pageshow', () => {
    resize.observe(canvas.parentElement!);
    render();
});
reset();
