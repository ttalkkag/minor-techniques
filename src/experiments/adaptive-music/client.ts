import { beatPosition, requestTransition, type Mood, type Reservation } from './model';
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const value = (id: string) => Number($<HTMLInputElement>(id).value);
const choice = (id: string) => $<HTMLSelectElement>(id).value;
const checked = (id: string) => $<HTMLInputElement>(id).checked;
const canvas = $<HTMLCanvasElement>('scene'),
    draw = canvas.getContext('2d')!;
const panel = $('settings'),
    dialog = $<HTMLDialogElement>('explanation');
let audio: AudioContext | null = null,
    master: GainNode | null = null,
    origin = 0,
    time = 0,
    running = false;
let pending: Reservation | null = null,
    desired: Mood = 'calm',
    id = 0;
let segments: Reservation[] = [{ id: 0, at: 0, target: 'calm' }],
    scheduled = new Set<string>();
let voices: { node: OscillatorNode; at: number; key: string }[] = [],
    timer = 0,
    frame = 0,
    lastPaint = 0;
const events: string[] = [];
function log(text: string) {
    events.unshift(`${time.toFixed(2)}s · ${text}`);
    events.splice(8);
    $('events').textContent = events.join('  /  ');
}
const label = (state: Mood) => (state === 'calm' ? '탐험' : '전투');
function stateAt(t: number) {
    return [...segments, ...(pending ? [pending] : [])].filter((s) => s.at <= t + 1e-7).at(-1) ?? segments[0];
}
function sync() {
    if (running && audio) time = Math.max(0, audio.currentTime - origin);
    if (pending && time >= pending.at) {
        segments.push(pending);
        log(`예약 #${pending.id} 실행 · ${label(pending.target)} @ ${pending.at.toFixed(2)}s`);
        pending = null;
    }
}
function tone(
    key: string,
    at: number,
    frequency: number,
    duration: number,
    type: OscillatorType,
    level: number,
) {
    if (!audio || !master || scheduled.has(key) || origin + at < audio.currentTime) return;
    const node = audio.createOscillator(),
        gain = audio.createGain();
    node.type = type;
    node.frequency.value = frequency;
    gain.gain.setValueAtTime(0, origin + at);
    gain.gain.linearRampToValueAtTime(level, origin + at + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, origin + at + duration);
    node.connect(gain).connect(master);
    node.start(origin + at);
    node.stop(origin + at + duration + 0.02);
    scheduled.add(key);
    voices.push({ node, at, key });
    node.onended = () => {
        node.disconnect();
        gain.disconnect();
        voices = voices.filter((v) => v.node !== node);
    };
}
function scheduler() {
    if (!running || !audio) return;
    sync();
    const beat = 60 / value('bpm'),
        half = beat / 2;
    const plan = [...segments, ...(pending ? [pending] : [])];
    for (let s = 0; s < plan.length; s++) {
        const segment = plan[s],
            end = plan[s + 1]?.at ?? Infinity;
        if (end < time - 0.05 || segment.at > time + 0.3) continue;
        const anchor = choice('structure') === 'section' ? segment.at : 0;
        const first = Math.max(0, Math.ceil((Math.max(time - 0.02, segment.at) - anchor) / half - 1e-7));
        for (let n = first; anchor + n * half < Math.min(end - 1e-7, time + 0.3); n++) {
            const at = anchor + n * half;
            if (at < segment.at - 1e-6) continue;
            const combat = segment.target === 'combat',
                pattern = combat && choice('structure') === 'section'
                    ? [0, 3, 7, 10, 7, 3, 10, 7]
                    : [0, 4, 7, 4, 0, 4, 9, 7];
            if (n % 2 === 0)
                tone(
                    `${segment.id}:${n}:bass`,
                    at,
                    130.81 * 2 ** ((n % 8 === 6 ? 5 : 0) / 12),
                    beat * 0.65,
                    'triangle',
                    0.22,
                );
            if (choice('structure') === 'section' || n % 2 === 0)
                tone(
                    `${segment.id}:${n}:melody`,
                    at,
                    261.63 * 2 ** (pattern[n % 8] / 12),
                    half * 0.75,
                    'sine',
                    0.16,
                );
            if (combat)
                tone(`${segment.id}:${n}:pulse`, at, n % 2 ? 880 : 110, half * 0.25, 'triangle', 0.13);
        }
    }
}
function cancelFuture() {
    if (!audio) return;
    for (const voice of [...voices])
        if (voice.at > time + 0.005) {
            voice.node.stop();
            scheduled.delete(voice.key);
        }
}
function request(target: Mood) {
    sync();
    desired = target;
    const old = pending;
    pending = requestTransition(
        stateAt(time).target,
        pending,
        target,
        time,
        value('bpm'),
        value('lead'),
        choice('timing') === 'bar',
        checked('cancel'),
        ++id,
    );
    cancelFuture();
    if (old && old !== pending) log(`예약 #${old.id} 취소`);
    if (pending && pending !== old)
        log(`게임 ${label(target)} → 예약 #${pending.id} @ ${pending.at.toFixed(2)}s`);
    else log(`게임 ${label(target)} · ${pending ? '기존 예약 유지' : '예약 없음'}`);
    if (running && checked('stinger'))
        tone(`event:${id}`, time + 0.03, target === 'combat' ? 660 : 440, 0.13, 'sine', 0.18);
    scheduler();
    paint();
}
function stop(resetClock = true) {
    running = false;
    clearInterval(timer);
    cancelAnimationFrame(frame);
    for (const voice of voices) voice.node.stop();
    voices = [];
    scheduled.clear();
    void audio?.close();
    audio = null;
    master = null;
    if (resetClock) {
        time = 0;
        desired = 'calm';
        pending = null;
        segments = [{ id: 0, at: 0, target: 'calm' }];
    }
    $('play').textContent = '소리 켜고 재생';
    $<HTMLButtonElement>('step').disabled = false;
    paint();
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
        master.gain.value = value('volume') / 100;
        master.connect(audio.destination);
        origin = audio.currentTime + 0.04 - time;
        running = true;
        $('play').textContent = '소리 정지';
        $<HTMLButtonElement>('step').disabled = true;
        timer = window.setInterval(scheduler, 25);
        scheduler();
        animate(0);
    } catch {
        if (audio !== context) return;
        stop(false);
        log('오디오를 시작하지 못했습니다. 무음 진행으로 비교하세요.');
    }
}
function paint() {
    sync();
    const rect = canvas.getBoundingClientRect(),
        dpr = Math.min(devicePixelRatio, 2);
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    draw.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = rect.width,
        h = rect.height,
        mobile = w < 650,
        left = mobile ? 24 : 115,
        right = w - 24,
        span = right - left,
        bpm = value('bpm'),
        bar = 240 / bpm,
        base = Math.floor(time / bar) * bar;
    draw.clearRect(0, 0, w, h);
    draw.font = '12px sans-serif';
    draw.fillStyle = '#5d7780';
    draw.fillText(`공통 음악 시계 ${time.toFixed(2)}s  ·  ${bpm} BPM`, 24, 30);
    for (let i = 0; i <= 8; i++) {
        const x = left + (span * i) / 8;
        draw.strokeStyle = i % 4 === 0 ? '#99b9ba' : '#d1dedf';
        draw.beginPath();
        draw.moveTo(x, 60);
        draw.lineTo(x, h - 45);
        draw.stroke();
        draw.fillStyle = '#687d84';
        draw.fillText(`${(i % 4) + 1}`, x + 3, 76);
    }
    const now = stateAt(time).target;
    const rows = [
        { name: '베이스', active: true, color: '#659c96' },
        { name: '선율', active: true, color: '#367c7b' },
        { name: '리듬', active: now === 'combat', color: '#dba069' },
    ];
    rows.forEach((row, j) => {
        const y = 105 + j * 72;
        draw.fillStyle = '#506c74';
        draw.fillText(row.name, mobile ? 24 : 24, y - 9);
        for (let n = 0; n < 8; n++) {
            draw.globalAlpha = row.active ? 1 : 0.15;
            draw.fillStyle = row.color;
            const bw = span / 8 - 7;
            draw.fillRect(left + (n * span) / 8, y, bw, 29 + (j === 1 && n % 2 ? 8 : 0));
        }
        draw.globalAlpha = 1;
    });
    const px = left + ((time - base) / (bar * 2)) * span;
    draw.strokeStyle = '#263d4d';
    draw.lineWidth = 2;
    draw.beginPath();
    draw.moveTo(px, 84);
    draw.lineTo(px, h - 38);
    draw.stroke();
    if (pending) {
        const x = left + ((pending.at - base) / (bar * 2)) * span;
        draw.strokeStyle = '#d48749';
        draw.setLineDash([4, 4]);
        draw.beginPath();
        draw.moveTo(x, 83);
        draw.lineTo(x, h - 36);
        draw.stroke();
        draw.setLineDash([]);
        draw.fillStyle = '#b66c32';
        draw.fillText(`예약 #${pending.id}`, Math.min(x + 5, w - 86), h - 20);
    }
    draw.fillStyle = '#526d76';
    draw.fillText(
        `마디 ${Math.floor(beatPosition(time, bpm) / 4) + 1} · 박 ${((beatPosition(time, bpm) % 4) + 1).toFixed(2)}`,
        24,
        h - 14,
    );
    $('metric-0').textContent = label(desired);
    $('metric-1').textContent = label(now);
    $('metric-2').textContent = pending ? `${Math.max(0, pending.at - time).toFixed(2)}초` : '예약 없음';
    const summary = `${running ? 'Web Audio 재생 중' : '무음 관찰'} · ${choice('structure') === 'layer' ? '공통 박자의 악기 층' : '구간 첫 박부터 진입'} . ${pending ? `목표 ${label(pending.target)}, 실행 ${pending.at.toFixed(2)}초` : '대기 중인 전환이 없습니다.'}`;
    if ($('summary').textContent !== summary) $('summary').textContent = summary;
    for (const key of ['bpm', 'lead', 'volume']) $(key + '-value').textContent = String(value(key));
}
function animate(stamp: number) {
    if (!running) return;
    if (stamp - lastPaint > 1000 / value('visual')) {
        paint();
        lastPaint = stamp;
    }
    frame = requestAnimationFrame(animate);
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
$('calm').onclick = () => request('calm');
$('combat').onclick = () => request('combat');
$('step').onclick = () => {
    time += 60 / value('bpm') / 4;
    paint();
};
$('near-bar').onclick = () => {
    stop();
    time = 480 / value('bpm') - 0.1;
    paint();
};
$('reset').onclick = () => {
    stop();
    $<HTMLInputElement>('bpm').value = '120';
    $<HTMLInputElement>('lead').value = '.15';
    $<HTMLInputElement>('volume').value = '12';
    $<HTMLSelectElement>('structure').value = 'layer';
    $<HTMLSelectElement>('timing').value = 'bar';
    $<HTMLInputElement>('cancel').checked = true;
    $<HTMLInputElement>('stinger').checked = false;
    $<HTMLSelectElement>('visual').value = '60';
    id = 0;
    events.length = 0;
    $('events').textContent = '';
    paint();
};
for (const key of ['bpm', 'structure']) $(key).addEventListener('change', () => stop());
for (const key of ['lead', 'volume', 'timing', 'visual', 'cancel', 'stinger']) {
    const update = () => {
        if (master && audio) master.gain.setTargetAtTime(value('volume') / 100, audio.currentTime, 0.02);
        paint();
    };
    $(key).addEventListener('input', update);
    $(key).addEventListener('change', update);
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
