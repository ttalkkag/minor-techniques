import { coefficients, type Point } from './model';
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const value = (id: string) => Number($<HTMLInputElement>(id).value),
    checked = (id: string) => $<HTMLInputElement>(id).checked;
const canvas = $<HTMLCanvasElement>('scene'),
    ctx = canvas.getContext('2d')!,
    panel = $('settings'),
    dialog = $<HTMLDialogElement>('explanation');
let audio: AudioContext | null = null,
    master: GainNode | null = null,
    direct: GainNode | null = null,
    reflection: GainNode | null = null,
    filter: BiquadFilterNode | null = null,
    analyser: AnalyserNode | null = null;
let oscillators: OscillatorNode[] = [],
    teleportVelocity: number | null = null,
    timer = 0;
function state() {
    const source: Point = { x: value('source-x'), y: value('source-y') },
        listener: Point = { x: value('listener'), y: 0 };
    return {
        source,
        listener,
        ...coefficients(
            source,
            listener,
            value('edge'),
            value('rays'),
            checked('wall'),
            value('transmission'),
            checked('air'),
            teleportVelocity ?? value('speed'),
            checked('doppler'),
        ),
    };
}
function updateAudio() {
    if (!audio || !master || !direct || !reflection || !filter) return;
    const s = state(),
        now = audio.currentTime;
    master.gain.setTargetAtTime(value('volume') / 100, now, 0.03);
    direct.gain.setTargetAtTime(s.attenuation * s.occlusion, now, 0.03);
    reflection.gain.setTargetAtTime(checked('reflection') ? s.attenuation * 0.25 : 0, now, 0.03);
    filter.frequency.setTargetAtTime(s.cutoff, now, 0.03);
    oscillators.forEach((osc, i) => osc.frequency.setTargetAtTime(220 * 2 ** i * s.pitch, now, 0.03));
}
async function play() {
    if (audio) {
        stop();
        return;
    }
    let context: AudioContext | null = null;
    try {
        context = new AudioContext();
        audio = context;
        await context.resume();
        if (audio !== context) return;
        master = audio.createGain();
        master.gain.value = 0;
        analyser = audio.createAnalyser();
        analyser.fftSize = 1024;
        master.connect(analyser).connect(audio.destination);
        const bus = audio.createGain();
        direct = audio.createGain();
        filter = audio.createBiquadFilter();
        filter.type = 'lowpass';
        filter.Q.value = 20 * Math.log10(Math.SQRT1_2);
        bus.connect(filter).connect(direct).connect(master);
        const delay = audio.createDelay();
        delay.delayTime.value = 0.18;
        const reflectedFilter = audio.createBiquadFilter();
        reflectedFilter.type = 'lowpass';
        reflectedFilter.frequency.value = 1400;
        reflection = audio.createGain();
        bus.connect(delay).connect(reflectedFilter).connect(reflection).connect(master);
        oscillators = [0, 1, 2, 3].map((i) => {
            const osc = audio!.createOscillator(),
                gain = audio!.createGain();
            osc.type = 'sine';
            gain.gain.value = 0.22 / (i + 1);
            osc.connect(gain).connect(bus);
            osc.start();
            return osc;
        });
        $('play').textContent = '소리 끄기';
        canvas.dataset.audioState = 'running';
        updateAudio();
        timer = window.setInterval(paint, 100);
        paint();
    } catch {
        if (audio !== context) return;
        stop();
        $('audio-status').textContent = '오디오를 켜지 못했습니다. 경로와 계수는 계속 비교할 수 있습니다.';
    }
}
function stop() {
    clearInterval(timer);
    oscillators.forEach((osc) => osc.stop());
    oscillators = [];
    void audio?.close();
    audio = null;
    master = null;
    analyser = null;
    canvas.dataset.audioState = 'closed';
    $('play').textContent = '소리 켜기';
    paint();
}
function paint() {
    const s = state(),
        r = canvas.getBoundingClientRect(),
        dpr = Math.min(devicePixelRatio, 2);
    canvas.width = r.width * dpr;
    canvas.height = r.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = r.width,
        h = r.height,
        px = (x: number) => 24 + ((w - 48) * x) / 13,
        py = (y: number) => 143 - y * 22;
    ctx.clearRect(0, 0, w, h);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#5e7880';
    ctx.fillText('직접 경로 · 위에서 본 2D 공간', 20, 27);
    for (let x = 0; x <= 12; x += 2) {
        ctx.strokeStyle = '#dae4e5';
        ctx.beginPath();
        ctx.moveTo(px(x), 47);
        ctx.lineTo(px(x), 245);
        ctx.stroke();
        ctx.fillStyle = '#93a3a7';
        ctx.fillText(`${x}m`, px(x) - 7, 260);
    }
    s.rays.forEach((ray) => {
        ctx.strokeStyle = ray.blocked ? '#d7a881' : '#68aaa1';
        ctx.lineWidth = 1.3;
        ctx.setLineDash(ray.blocked ? [3, 3] : []);
        ctx.beginPath();
        ctx.moveTo(px(s.listener.x), py(s.listener.y));
        ctx.lineTo(px(ray.point.x), py(ray.point.y));
        ctx.stroke();
    });
    ctx.setLineDash([]);
    if (checked('wall')) {
        ctx.fillStyle = '#647782';
        ctx.fillRect(px(5) - 6, py(value('edge')), 12, py(-4) - py(value('edge')));
        ctx.fillStyle = '#516d77';
        ctx.fillText('벽', px(5) - 8, py(-4) + 15);
    }
    if (checked('reflection')) {
        ctx.strokeStyle = '#b49fc9';
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(px(s.source.x), py(s.source.y));
        ctx.lineTo(px(5), 55);
        ctx.lineTo(px(s.listener.x), py(0));
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#897199';
        ctx.fillText('+0.18초', px(5) + 8, 52);
    }
    for (const [point, color, label] of [
        [s.source, '#dc995e', '음원'],
        [s.listener, '#287f79', '청자'],
    ] as const) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(px(point.x), py(point.y), 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#3b5863';
        ctx.fillText(label, px(point.x) - 12, py(point.y) - 23);
    }
    const chartY = 290;
    ctx.fillStyle = '#667d85';
    ctx.fillText('배음별 직접음 크기 (모델)', 20, chartY);
    for (let i = 0; i < 4; i++) {
        const x = 30 + (i * (w - 50)) / 4,
            freq = 220 * 2 ** i * s.pitch,
            height = (50 * s.attenuation * s.occlusion) / (i + 1) / Math.sqrt(1 + (freq / s.cutoff) ** 4);
        ctx.fillStyle = '#d4dfdf';
        ctx.fillRect(x, chartY + 11, Math.max(20, (w - 100) / 4), 50);
        ctx.fillStyle = '#4a9a8e';
        ctx.fillRect(x, chartY + 61 - height, Math.max(20, (w - 100) / 4), height);
        ctx.fillStyle = '#627b83';
        ctx.font = '10px sans-serif';
        ctx.fillText(`${Math.round(freq)} Hz`, x, chartY + 78);
    }
    $('metric-0').textContent = `${(s.attenuation * s.occlusion).toFixed(3)} (${s.distance.toFixed(1)}m)`;
    $('metric-1').textContent = `${s.open} / ${value('rays')}`;
    $('metric-2').textContent = `${s.pitch.toFixed(2)}× · ${Math.round(s.cutoff)}Hz`;
    const summary = `거리 계수 ${s.attenuation.toFixed(3)} × 경로 계수 ${s.occlusion.toFixed(3)}. 반사 ${checked('reflection') ? '별도 지연 경로 켜짐' : '꺼짐'}. ${value('rays')}번의 선분-벽 검사. 관찰 그림은 청자 위치를 바꾸지 않습니다.`;
    if ($('summary').textContent !== summary) $('summary').textContent = summary;
    for (const key of ['source-x', 'source-y', 'listener', 'edge', 'transmission', 'speed', 'volume'])
        $(key + '-value').textContent = String(value(key));
    if (audio && analyser) {
        const wave = new Float32Array(analyser.fftSize);
        analyser.getFloatTimeDomainData(wave);
        const rms = Math.sqrt(wave.reduce((sum, v) => sum + v * v, 0) / wave.length);
        $('audio-status').textContent =
            `Web Audio 재생 중 · 실제 출력 RMS ${rms.toFixed(4)} · 음량 ${value('volume')}%`;
        canvas.dataset.outputRms = rms.toFixed(5);
    } else $('audio-status').textContent = '소리 꺼짐 · 모든 계수는 무음 상태에서도 비교할 수 있습니다.';
}
function menu(open: boolean) {
    const wasOpen = !panel.hidden;
    panel.hidden = !open;
    $('backdrop').hidden = !open;
    $('menu').setAttribute('aria-expanded', String(open));
    for (const sibling of panel.parentElement!.children) {
        if (sibling instanceof HTMLElement && sibling !== panel && sibling.id !== 'backdrop')
            sibling.inert = open;
    }
    if (open) {
        panel.scrollTop = 0;
        $('close-menu').focus();
    } else if (wasOpen) $('menu').focus();
}
$('menu').onclick = () => menu(true);
$('close-menu').onclick = () => menu(false);
$('backdrop').onclick = () => menu(false);
$('help').onclick = () => dialog.showModal();
$('close-help').onclick = () => dialog.close();
document.addEventListener('keydown', (e) => {
    if (panel.hidden || dialog.open) return;
    if (e.key === 'Escape') {
        e.preventDefault();
        menu(false);
    } else if (e.key === 'Tab') {
        const controls = [...panel.querySelectorAll<HTMLElement>('button,input,select,a[href],[tabindex]')].filter(
            (element) => !element.hasAttribute('disabled') && element.tabIndex >= 0 && element.getClientRects().length,
        );
        const first = controls[0],
            last = controls.at(-1)!;
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }
});
$('play').onclick = () => void play();
$('teleport').onclick = () => {
    const reset = checked('teleport-reset');
    teleportVelocity = reset ? 0 : 1800;
    $('teleport-result').textContent =
        `30m / (1/60초) = 1,800m/s. ${reset ? '이전 위치 재설정 → 적용 속도 0m/s' : '잘못된 차분 유지 → 청취 피치를 2배로 제한'}`;
    updateAudio();
    paint();
};
function reset() {
    stop();
    for (const [id, v] of Object.entries({
        'source-x': '9',
        'source-y': '0',
        listener: '1',
        edge: '0',
        rays: '8',
        transmission: '.2',
        speed: '0',
        volume: '12',
    }))
        $<HTMLInputElement>(id).value = v;
    for (const id of ['wall', 'air', 'doppler', 'teleport-reset']) $<HTMLInputElement>(id).checked = true;
    $<HTMLInputElement>('reflection').checked = false;
    teleportVelocity = null;
    $('teleport-result').textContent = '순간이동 표본: 아직 실행하지 않았습니다.';
    paint();
}
$('reset').onclick = reset;
for (const input of panel.querySelectorAll('input,select')) {
    const change = () => {
        if (input.id === 'speed' || input.id === 'teleport-reset') {
            teleportVelocity = null;
            $('teleport-result').textContent = '현재 속도 슬라이더를 사용합니다.';
        }
        updateAudio();
        paint();
    };
    input.addEventListener('input', change);
    input.addEventListener('change', change);
}
const resize = new ResizeObserver(paint);
resize.observe(canvas);
window.addEventListener('pagehide', () => {
    menu(false);
    stop();
    resize.disconnect();
});
window.addEventListener('pageshow', () => {
    resize.observe(canvas);
    paint();
});
paint();
