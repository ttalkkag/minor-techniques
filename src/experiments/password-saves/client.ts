import { setSettingsOpen } from '../../layouts/experiment-layout';
import { createPlayback } from '../../components/experiment-playback';
import { encode, encodeRaw, decode, restore, alphabet } from './model';
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
let restored: ReturnType<typeof restore> = null;
let result = decode('2G68');
let pending = true;
let phase = 0;
let message = '';
const stages = ['문자', '비트', '검사값', '버전·범위', '복원'];
function stageDetail() {
    const code = input('code').value;
    if (phase === 0) return '입력한 코드를 한 단계씩 검증합니다.';
    if (!result.ok && phase === result.step) return result.error;
    const packed = [...code].reduce((value, char) => value * 32 + alphabet.indexOf(char), 0),
        version = packed >>> 18,
        level = (packed >>> 14) & 15,
        items = (packed >>> 6) & 255;
    return [
        '',
        `${code} · 4글자 모두 문자표에 포함`,
        [...code].map((char) => alphabet.indexOf(char).toString(2).padStart(5, '0')).join(' '),
        `기록 ${packed & 63} = (${version} + ${level} + ${items}) mod 64 = ${(version + level + items) % 64}`,
        `버전 ${version} 지원 · 레벨 ${level}은 1–12 범위`,
        `레벨 ${level} · 아이템 ${items} 복원 / 위치 10% · 효과 없음`,
    ][phase]!;
}
function current() {
    return {
        level: +input('level').value,
        items: Array.from({ length: 8 }, (_, i) => (input(`item-${i}`).checked ? 1 << i : 0)).reduce(
            (a, b) => a | b,
            0,
        ),
        position: +input('position').value,
        effect: input('effect').checked,
    };
}
function draw() {
    const state = current(),
        generated = encode(state),
        code = input('code').value;
    el('level-value').textContent = String(state.level);
    el('position-value').textContent = `${state.position}%`;
    el('generated').textContent = generated;
    el('metric-0').textContent = '4글자 · 20비트';
    el('metric-1').textContent = pending ? `${phase} / 5 진행` : result.ok ? '5 / 5 통과' : `${result.step}단계 거부`;
    el('metric-2').textContent = pending ? '입력 확인 전' : result.ok ? '레벨 + 아이템' : '기존 상태 유지';
    el('summary').textContent =
        message ||
        `현재 위치 ${state.position}%와 일시 효과는 코드에 저장되지 않으므로, 복원은 위치 10% · 효과 없음으로 시작합니다.`;
    el('playback-status').textContent = `${phase} / 5 · ${phase ? stages[phase - 1] : '입력 코드 검증 대기'}${!pending && !result.ok ? ' 거부' : ''}`;
    const bitBox = el('bits');
    bitBox.replaceChildren();
    if (code.length === 4 && [...code].every((char) => alphabet.includes(char))) {
        const bits = [...code].map((char) => alphabet.indexOf(char).toString(2).padStart(5, '0')).join('');
        for (const [title, start, end] of [
            ['버전', 0, 2],
            ['레벨', 2, 6],
            ['아이템', 6, 14],
            ['검사값', 14, 20],
        ] as const) {
            const span = document.createElement('span');
            span.textContent = `${title} ${bits.slice(start, end)}`;
            bitBox.append(span);
        }
    } else {
        const span = document.createElement('span');
        span.textContent = '길이·문자표를 확인해야 20비트를 읽을 수 있습니다.';
        bitBox.append(span);
    }
    ctx.clearRect(0, 0, w, h);
    const stepWidth = (w - 28) / stages.length;
    stages.forEach((stage, index) => {
        const failed = !result.ok && !pending && index + 1 === phase,
            reached = index < phase,
            color = failed ? '#b65c43' : reached ? '#147e73' : '#6d8790';
        rect(14 + index * stepWidth, 13, stepWidth - 5, 33, failed ? '#f6dfd6' : reached ? '#d7eee8' : '#f5f9fa', 6);
        text(`${index + 1} ${stage}`, 20 + index * stepWidth, 34, color, w < 500 ? 10 : 12, stepWidth - 15);
    });
    text(stageDetail(), 16, 71, !pending && !result.ok ? '#b65c43' : '#345963', w < 500 ? 10 : 12, w - 32);
    const mobile = w < 620,
        panelW = mobile ? w - 24 : (w - 42) / 2,
        panelH = mobile ? (h - 126) / 2 : h - 120;
    for (let i = 0; i < 2; i++) {
        const x = mobile ? 12 : 14 + i * (panelW + 14),
            y = mobile ? 100 + i * (panelH + 12) : 104;
        const data = i === 0 ? state : restored;
        rect(x, y, panelW, panelH, '#f8fbfc', 14);
        text(
            i === 0 ? '지금 모험 중인 상태' : '코드를 읽어 복원한 상태',
            x + 16,
            y + 27,
            i === 0 ? '#b47542' : '#147e73',
            13,
            panelW - 28,
        );
        if (!data) {
            text('아직 복원하지 않았습니다.', x + 16, y + 62, '#8399a0', 12);
            continue;
        }
        text(`LEVEL ${data.level}`, x + 16, y + 58, '#345963', 21);
        const trackY = y + panelH * 0.54,
            start = x + 19,
            end = x + panelW - 19;
        line(start, trackY + 18, end, trackY + 18, '#b7cdd0', false, 5);
        for (let n = 0; n <= 10; n++)
            line(
                start + (n * (end - start)) / 10,
                trackY + 18,
                start + (n * (end - start)) / 10,
                trackY + 24,
                '#9eb8be',
                false,
                1,
            );
        const player = start + (data.position / 100) * (end - start);
        dot(player, trackY - 6, 7, i === 0 ? '#dc9657' : '#2a9b8b');
        rect(player - 7, trackY + 2, 14, 16, i === 0 ? '#dc9657' : '#2a9b8b', 3);
        if (data.effect) {
            ctx.strokeStyle = '#d9a44c';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(player, trackY + 3, 21, 0, Math.PI * 2);
            ctx.stroke();
        }
        text(
            `위치 ${data.position}% · 효과 ${data.effect ? '켜짐' : '없음'}`,
            x + 16,
            trackY + 45,
            '#647e87',
            11,
        );
        const cellW = Math.min(27, (panelW - 36) / 8);
        for (let bit = 0; bit < 8; bit++) {
            rect(
                x + 17 + bit * cellW,
                y + panelH - 43,
                cellW - 4,
                22,
                data.items & (1 << bit) ? '#41a493' : '#e2ebed',
                4,
            );
            text(
                String(bit),
                x + 23 + bit * cellW,
                y + panelH - 28,
                data.items & (1 << bit) ? '#fff' : '#8ba1a8',
                10,
            );
        }
    }
}
function read() {
    playback.pause();
    pending = false;
    result = decode(input('code').value);
    phase = result.ok ? 5 : result.step;
    if (result.ok) {
        restored = restore(input('code').value);
        message = `복원 성공: 레벨 ${result.value.level}, 아이템 값 ${result.value.items}, 검사값 ${result.checksum}. 위치와 효과는 초기값입니다.`;
    } else message = `복원 거부: ${result.error} 이전 복원 상태를 유지했습니다.`;
    draw();
}
function advance() {
    if (!pending) phase = 0;
    if (phase === 0) result = decode(input('code').value);
    pending = true;
    phase++;
    if (!result.ok && phase === result.step) {
        pending = false;
        message = `복원 거부: ${result.error} 이전 복원 상태를 유지했습니다.`;
    } else if (phase === 5 && result.ok) {
        restored = restore(input('code').value);
        pending = false;
        message = `복원 성공: 레벨 ${result.value.level}, 아이템 값 ${result.value.items}. 위치와 효과는 초기값입니다.`;
    } else message = `${phase}단계 · ${stageDetail()}`;
    draw();
    return pending;
}
const playback = createPlayback({ interval: 750, advance });
function prepare() {
    playback.pause();
    phase = 0;
    pending = true;
    result = decode(input('code').value);
}
function reset() {
    playback.pause();
    input('level').value = '5';
    input('position').value = '65';
    input('effect').checked = true;
    for (let i = 0; i < 8; i++) input(`item-${i}`).checked = i < 2;
    input('code').value = '2G68';
    select('fault').value = 'typo';
    restored = null;
    result = decode('2G68');
    pending = true;
    phase = 0;
    message = '';
    draw();
}
for (const id of ['level', 'position', 'effect', ...Array.from({ length: 8 }, (_, i) => `item-${i}`)])
    on(id, 'input', draw);
on('code', 'input', () => {
    prepare();
    message = '재생 또는 한 단계 진행으로 입력 코드를 검증하세요.';
    draw();
});
on('encode', 'click', () => {
    input('code').value = encode(current());
    prepare();
    message = '현재 레벨과 아이템을 코드에 담았습니다. 복원해 보세요.';
    draw();
});
on('decode', 'click', read);
on('inject', 'click', () => {
    const state = current(),
        code = encode(state),
        fault = select('fault').value;
    input('code').value =
        fault === 'typo'
            ? code.slice(0, 3) + alphabet[(alphabet.indexOf(code[3]!) + 1) % 32]
            : fault === 'short'
              ? code.slice(0, 3)
              : fault === 'version'
                ? encodeRaw(1, state.level, state.items)
                : fault === 'range'
                  ? encodeRaw(0, 15, state.items)
                  : encodeRaw(0, 6, 2, 8);
    if (fault === 'collision') {
        input('level').value = '5';
        for (let i = 0; i < 8; i++) input(`item-${i}`).checked = i < 2;
    }
    prepare();
    message =
        fault === 'collision'
            ? '현재 상태 5 + 3 = 8, 실험 코드 6 + 2 = 8. 검사값이 같아도 상태는 다릅니다. 복원해 보세요.'
            : '실험 코드를 입력했습니다. 복원 버튼으로 검사를 실행하세요.';
    setSettingsOpen(false);
    draw();
});
on('reset', 'click', reset);
boot(draw);
