import { requestEffect, ownerAt, pcmBytes, pitchSample, type Owner } from './model';
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const value = (id: string) => Number($<HTMLInputElement>(id).value),
    checked = (id: string) => $<HTMLInputElement>(id).checked;
const canvas = $<HTMLCanvasElement>('scene'),
    ctx = canvas.getContext('2d')!,
    panel = $('settings'),
    dialog = $<HTMLDialogElement>('explanation');
const names = ['Pulse 1 · 선율', 'Pulse 2 · 화음', 'Wave · 베이스', 'Noise · 리듬'];
let owners: Owner[] = Array.from({ length: 4 }, () => ({
    kind: 'music',
    priority: 1,
    until: Infinity,
    id: 0,
}));
let time = 0,
    origin = 0,
    running = false,
    id = 0,
    timer = 0,
    audio: AudioContext | null = null,
    master: GainNode | null = null;
let generators: (OscillatorNode | AudioBufferSourceNode)[] = [],
    gains: GainNode[] = [],
    samples: AudioBufferSourceNode[] = [],
    lastBeat = -1,
    status = '요청 없음';
let audioReady: Promise<AudioContext | null> | null = null,
    starting = false,
    playRequest = 0;
function ensureAudio() {
    if (audioReady) return audioReady;
    const context = new AudioContext();
    audio = context;
    audioReady = prepareAudio(context);
    return audioReady;
}
async function prepareAudio(context: AudioContext) {
    await context.resume();
    if (audio !== context) return null;
    master = audio.createGain();
    master.gain.value = value('volume') / 100;
    master.connect(audio.destination);
    const noise = audio.createBuffer(1, audio.sampleRate, audio.sampleRate);
    const data = noise.getChannelData(0);
    let seed = 1234;
    for (let i = 0; i < data.length; i++) {
        seed = (1664525 * seed + 1013904223) >>> 0;
        data[i] = ((seed / 4294967296) * 2 - 1) * 0.5;
    }
    for (let i = 0; i < 4; i++) {
        const gain = audio.createGain();
        gain.gain.value = 0;
        gain.connect(master);
        gains.push(gain);
        if (i === 3) {
            const node = audio.createBufferSource();
            node.buffer = noise;
            node.loop = true;
            node.connect(gain);
            node.start();
            generators.push(node);
        } else {
            const node = audio.createOscillator();
            node.type = i === 2 ? 'triangle' : 'square';
            node.connect(gain);
            node.start();
            generators.push(node);
        }
    }
    canvas.dataset.audioState = 'running';
    return context;
}
function update() {
    if (running && audio) time = audio.currentTime - origin;
    owners = owners.map((owner) => ownerAt(owner, time));
    if (audio && master) {
        master.gain.setTargetAtTime(value('volume') / 100, audio.currentTime, 0.025);
        const beat = Math.floor(time * 2),
            half = Math.floor(time * 4);
        for (let i = 0; i < 4; i++) {
            const owner = owners[i],
                effect = owner.kind === 'effect';
            let level =
                i >= value('budget') || !running
                    ? 0
                    : effect
                      ? 0.14
                      : i === 3
                        ? half % 2
                            ? 0.01
                            : 0.045
                        : 0.045;
            if (i === 0 && !effect && half % 8 === 7) level = 0;
            gains[i].gain.setTargetAtTime(level, audio.currentTime, 0.012);
            if (i < 3) {
                const node = generators[i] as OscillatorNode;
                const note = [0, 4, 7, 9, 7, 4, 2, 7][beat % 8];
                node.frequency.setTargetAtTime(
                    effect
                        ? 440 + Math.sin(time * 25) * 180
                        : (i === 2 ? 110 : i === 1 ? 164.81 : 261.63) *
                              2 ** ((i === 0 ? note : i === 2 && beat % 4 === 3 ? 5 : 0) / 12),
                    audio.currentTime,
                    0.015,
                );
            }
        }
        if (beat !== lastBeat) {
            lastBeat = beat;
            paint();
        }
    }
}
async function play() {
    if (running || starting) {
        stop();
        return;
    }
    const request = ++playRequest;
    starting = true;
    try {
        const context = await ensureAudio();
        if (!context || audio !== context || request !== playRequest) return;
        starting = false;
        origin = context.currentTime - time;
        running = true;
        $('play').textContent = '소리 정지';
        $<HTMLButtonElement>('step').disabled = true;
        timer = window.setInterval(() => {
            update();
            paint();
        }, 40);
        update();
        paint();
    } catch {
        if (request !== playRequest) return;
        stop();
        $('channel-result').textContent = '오디오를 시작하지 못했습니다. 무음 진행은 사용할 수 있습니다.';
    }
}
function stop() {
    ++playRequest;
    starting = false;
    audioReady = null;
    running = false;
    clearInterval(timer);
    for (const source of [...generators, ...samples]) source.stop();
    generators = [];
    samples = [];
    gains = [];
    void audio?.close();
    audio = null;
    master = null;
    time = 0;
    owners = Array.from({ length: 4 }, () => ({ kind: 'music', priority: 1, until: Infinity, id: 0 }));
    $('play').textContent = '소리 켜고 재생';
    $<HTMLButtonElement>('step').disabled = false;
    canvas.dataset.audioState = 'closed';
    paint();
}
function effect() {
    update();
    const channel = value('effect-channel');
    if (channel >= value('budget')) {
        status = '예산 밖 → 거부';
        $('channel-result').textContent = '이 음원 채널은 현재 동시 예산에 포함되지 않습니다.';
    } else {
        const previous = owners[channel],
            result = requestEffect(
                previous,
                value('priority'),
                time,
                value('duration'),
                checked('replace'),
                ++id,
            );
        owners[channel] = result.owner;
        status = result.accepted ? `요청 #${id} 선점` : `요청 #${id} 거부`;
        $('channel-result').textContent = result.accepted
            ? `${names[channel]}: ${previous.kind === 'effect' ? '이전 효과음 중단' : '음악 일시 선점'} → #${id}, ${result.owner.until.toFixed(2)}초에 곡의 현재 위치로 복귀`
            : `우선순위 ${value('priority')} 요청 거부. 현재 소유자 우선순위 ${previous.priority}`;
    }
    update();
    paint();
}
async function sample() {
    let ready: Promise<AudioContext | null> | null = null;
    try {
        ready = ensureAudio();
        const context = await ready;
        if (!context || audio !== context) return;
        const source = context.createBufferSource(),
            buffer = audio!.createBuffer(1, audio!.sampleRate * 2, audio!.sampleRate),
            data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
            const t = i / audio!.sampleRate;
            data[i] = 0.3 * Math.sin(2 * Math.PI * 220 * t) * (1 - Math.exp(-t * 80)) * Math.exp(-t * 2);
        }
        source.buffer = buffer;
        source.playbackRate.value = pitchSample(value('semitones'), 2).rate;
        source.connect(master!);
        source.start();
        samples.push(source);
        canvas.dataset.sampleRate = String(source.playbackRate.value);
        $('channel-result').textContent =
            `자작 2초 샘플 재생 · ${source.playbackRate.value.toFixed(2)}배 속도`;
        source.onended = () => {
            source.disconnect();
            if (audio !== context) return;
            samples = samples.filter((node) => node !== source);
            if (!running && !starting && samples.length === 0) {
                generators.forEach((node) => node.stop());
                generators = [];
                gains = [];
                void audio?.close();
                audio = null;
                audioReady = null;
                master = null;
                canvas.dataset.audioState = 'closed';
            }
        };
    } catch {
        if (audioReady !== ready) return;
        stop();
        $('channel-result').textContent = '샘플 재생을 시작하지 못했습니다.';
    }
}
function paint() {
    const r = canvas.getBoundingClientRect(),
        dpr = Math.min(devicePixelRatio, 2);
    canvas.width = r.width * dpr;
    canvas.height = r.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = r.width,
        h = r.height,
        mobile = w < 650,
        left = mobile ? 24 : 175,
        span = w - left - 24,
        beat = time * 2;
    ctx.clearRect(0, 0, w, h);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#5e7680';
    ctx.fillText('음원 소유권 · 음악 시계는 계속 진행', 20, 28);
    names.forEach((name, i) => {
        const y = mobile ? 62 + i * 66 : 70 + i * 60,
            owner = ownerAt(owners[i], time),
            enabled = i < value('budget'),
            effect = owner.kind === 'effect';
        ctx.fillStyle = enabled ? '#476670' : '#9caeb1';
        ctx.font = '11px sans-serif';
        ctx.fillText(
            mobile ? `${name} / ${enabled ? (effect ? `효과 #${owner.id}` : '음악') : '사용 안 함'}` : name,
            24,
            mobile ? y - 9 : y + 12,
        );
        for (let n = 0; n < 8; n++) {
            ctx.fillStyle = !enabled
                ? '#dfe6e6'
                : effect
                  ? '#e2ab79'
                  : n === Math.floor(beat) % 8
                    ? '#2d7f78'
                    : '#9ec4bc';
            ctx.fillRect(left + (n * span) / 8, y, span / 8 - 5, 24);
            if (!mobile && n === 0) {
                ctx.fillStyle = '#fff';
                ctx.fillText(effect ? '효과' : '음악', left + 8, y + 16);
            }
        }
    });
    const y = h - 47,
        rate = pitchSample(value('semitones'), 2);
    ctx.strokeStyle = '#c6d5d7';
    ctx.beginPath();
    ctx.moveTo(24, y);
    ctx.lineTo(w - 24, y);
    ctx.stroke();
    ctx.strokeStyle = '#d3945d';
    ctx.beginPath();
    const length = (w - 48) * Math.min(1, rate.duration / 4);
    for (let i = 0; i < 150; i++) {
        const x = 24 + (i / 149) * length,
            dy = Math.sin(i * 0.65) * Math.exp(-i / 60) * 19;
        if (i === 0) ctx.moveTo(x, y + dy);
        else ctx.lineTo(x, y + dy);
    }
    ctx.stroke();
    ctx.fillStyle = '#6f8086';
    ctx.font = '10px sans-serif';
    ctx.fillText(`샘플 파형 · ${rate.duration.toFixed(2)}초 (가로축 4초)`, 24, h - 13);
    $('metric-0').textContent = `${time.toFixed(2)}초 · ${Math.floor(beat / 4) + 1}마디`;
    $('metric-1').textContent = status;
    $('metric-2').textContent = `${rate.rate.toFixed(2)}× / ${rate.duration.toFixed(2)}초`;
    const pcm = pcmBytes(value('seconds'), value('rate'), 16, value('outputs')),
        commands = Math.round((value('seconds') * 4000) / 60),
        bank = value('bank') * 1000;
    $('storage').textContent =
        `비압축 PCM ${pcm.toLocaleString()} B / 시퀀스 명령·메타데이터 ${commands.toLocaleString()} B + 악기 ${bank.toLocaleString()} B = ${(commands + bank).toLocaleString()} B`;
    const summary = `${value('budget')}개 음원 예산. ${owners.slice(0, value('budget')).filter((o) => ownerAt(o, time).kind === 'effect').length}개 효과음이 활성 채널을 점유합니다. 음원 수와 PCM의 ${value('outputs')}개 저장 채널은 서로 다른 개념입니다.`;
    if ($('summary').textContent !== summary) $('summary').textContent = summary;
    for (const key of ['priority', 'duration', 'budget', 'volume', 'seconds', 'bank', 'semitones'])
        $(key + '-value').textContent = String(value(key));
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
$('effect').onclick = effect;
$('sample').onclick = () => void sample();
$('step').onclick = () => {
    time += 0.5;
    owners = owners.map((o) => ownerAt(o, time));
    paint();
};
$('reset').onclick = () => {
    stop();
    for (const [id, v] of Object.entries({
        'effect-channel': '3',
        priority: '2',
        duration: '1.5',
        budget: '4',
        volume: '12',
        seconds: '60',
        rate: '48000',
        outputs: '2',
        bank: '200',
        semitones: '0',
    }))
        $<HTMLInputElement>(id).value = v;
    $<HTMLInputElement>('replace').checked = true;
    status = '요청 없음';
    $('channel-result').textContent = '효과음 요청을 기다립니다.';
    paint();
};
for (const input of panel.querySelectorAll('input,select')) {
    const change = () => {
        update();
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
