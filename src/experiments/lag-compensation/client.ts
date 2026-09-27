import { defaults, evaluate } from './model';
import type { Options } from './model';
import { clipFrame, timing } from './clip';
import { createShootingScene } from './render-3d';
import type { View } from './scene-state';
import { setPlaybackState } from '../../components/experiment-playback';
import { setSettingsOpen, syncViewControls } from '../../layouts/experiment-layout';

const el = (id: string) => document.getElementById(id)!;
const input = (id: string) => el(id) as HTMLInputElement;
const select = (id: string) => el(id) as HTMLSelectElement;
const canvas = el('scene') as HTMLCanvasElement;
const abort = new AbortController();
const on = (id: string, type: string, fn: EventListener) =>
    el(id).addEventListener(type, fn, { signal: abort.signal });
const text = (id: string, value: string) => {
    if (el(id).textContent !== value) el(id).textContent = value;
};

let config = { ...defaults };
let time = timing(config).start;
let playing = false;
let view: View = 'free';
let inspect = true;
let scene: ReturnType<typeof createShootingScene> | undefined;
let frameId = 0;
let lastFrame = 0;
let disposed = false;
let pageActive = true;

function pause() {
    playing = false;
    setPlaybackState('play', false);
}

function start() {
    if (!scene) return;
    if (time >= timing(config).end) time = timing(config).start;
    playing = true;
    setPlaybackState('play', true);
    if (matchMedia('(max-width: 800px)').matches) setSettingsOpen(false);
}

function readOptions(): Options {
    return Object.fromEntries(Object.entries(defaults).map(([key, value]) => [
        key,
        typeof value === 'boolean' ? input(key).checked : typeof value === 'number' ? +input(key).value : select(key).value,
    ])) as Options;
}

function update() {
    const frame = clipFrame(config, time, view, inspect, +input('aim').value);
    const result = frame.result;
    const times = timing(config);
    const progress = (time - times.start) / (times.end - times.start);
    scene?.update(frame.scene);
    canvas.dataset.phase = frame.phase;
    canvas.dataset.time = time.toFixed(1);
    canvas.dataset.result = frame.scene.result;
    canvas.dataset.view = view;
    input('scrub').value = String(Math.round(progress * 1000));
    text('scrub-value', `${Math.round(progress * 100)}%`);
    for (const key of ['up', 'down', 'interpolation', 'window', 'hz', 'speed'] as const) {
        text(`${key}-value`, `${config[key]}${key === 'hz' ? 'Hz' : key === 'speed' ? 'm/s' : 'ms'}`);
    }
    text('aim-value', `${+input('aim').value > 0 ? '+' : ''}${(+input('aim').value).toFixed(2)}m`);
    text('compare', config.mode === 'history' ? '보상 끄고 다시 보기' : '보상 켜고 다시 보기');
    let heading: string;
    let detail: string;
    if (!frame.fired) {
        heading = '표적이 벽 뒤로 이동합니다.';
        detail = `사수에게는 서버보다 ${config.down + config.interpolation}ms 늦은 모습이 보입니다.`;
    } else if (frame.scene.result === 'pending') {
        heading = frame.resolved ? '사수는 판정 소식을 기다립니다.' : '사수가 방아쇠를 당겼습니다.';
        detail = frame.resolved
            ? `서버의 판정이 돌아오는 데 ${config.down}ms 걸립니다.`
            : result.visibleCovered ? '사수 화면에서도 표적이 벽 뒤로 사라졌습니다.'
            : '사수에게는 아직 벽 밖에 있는 표적이 보입니다.';
    } else {
        heading = result.reason ? '서버가 이 사격을 거부했습니다.'
            : result.hit ? result.currentCovered ? '벽 뒤로 숨은 표적에게 피해가 반영됩니다.' : '표적을 맞혔습니다.'
            : result.blocked ? '사격이 고정된 벽에 막힙니다.' : '사격이 표적을 빗나갑니다.';
        detail = result.reason || (config.mode === 'history'
            ? Math.abs(result.q - result.visibleTime) < 0.01
                ? `사수가 본 ${Math.round(1000 - result.q)}ms 전의 표적 위치로 검사했습니다.`
                : `사수가 본 장면은 ${Math.round(1000 - result.visibleTime)}ms 전, 검사는 ${Math.round(1000 - result.q)}ms 전입니다.`
            : '사격 명령이 도착했을 때의 현재 장면으로 검사했습니다.');
        if (result.clamped && !result.reason) detail = `이력이 부족해 ${Math.round(1000 - result.q)}ms 전의 가장 오래된 모습으로 검사했습니다.`;
        if (!result.reason && config.mode === 'history' && Math.abs(result.past.sampleTime - result.q) > 0.01) {
            detail = result.clamped
                ? `이력이 부족해 요청 시각을 ${Math.round(1000 - result.q)}ms 전으로 제한했습니다.`
                : `사수가 본 장면은 ${Math.round(1000 - result.visibleTime)}ms 전, 요청 시각은 ${Math.round(1000 - result.q)}ms 전입니다.`;
            detail += ` ${config.subtick ? '순간이동 구간은 보간하지 않아' : '틱 사이 위치 보간을 꺼'} ${Math.round(1000 - result.past.sampleTime)}ms 전의 저장 표본으로 검사했습니다.`;
        }
    }
    text('scene-heading', heading);
    text('scene-detail', detail);
    text('history-info', `조회 ${result.q.toFixed(0)}ms · 실제 위치 ${result.past.sampleTime.toFixed(1)}ms · 표본 ${result.past.before.toFixed(1)} / ${result.past.after.toFixed(1)}ms · ${config.hz}Hz${result.past.discontinuous ? ' · 순간이동은 보간 제외' : ''}`);
    (el('duplicate') as HTMLButtonElement).disabled = !frame.resolved || Boolean(result.reason);
}

function resetClip() {
    pause();
    time = timing(config).start;
    text('command-status', '');
    update();
}

for (const [key, value] of Object.entries(defaults)) {
    on(key, typeof value === 'number' ? 'input' : 'change', () => {
        config = readOptions();
        time = Math.min(time, timing(config).end);
        text('command-status', '');
        update();
    });
}
on('aim', 'input', update);
on('play', 'click', () => { if (playing) pause(); else start(); });
on('step', 'click', () => {
    pause();
    const times = timing(config);
    time = time >= times.end ? times.start : Math.min(times.end, time + 10);
    update();
});
on('reset', 'click', resetClip);
on('scrub', 'input', () => {
    pause();
    const times = timing(config);
    time = times.start + (+input('scrub').value / 1000) * (times.end - times.start);
    text('command-status', '');
    update();
});
on('fire', 'click', () => {
    time = timing(config).fire - 70;
    text('command-status', '');
    update();
    start();
});
on('compare', 'click', () => {
    select('mode').value = config.mode === 'history' ? 'current' : 'history';
    config = readOptions();
    resetClip();
    start();
});
on('view', 'change', () => {
    view = select('view').value as View;
    scene?.setView(view);
    update();
});
on('history-toggle', 'click', () => {
    inspect = !inspect;
    el('history-toggle').setAttribute('aria-pressed', String(inspect));
    update();
});
on('duplicate', 'click', () => {
    pause();
    text('command-status', `${evaluate(config, true).reason} 피해를 다시 적용하지 않았습니다.`);
});
on('help', 'click', () => {
    pause();
    (el('explanation') as HTMLDialogElement).showModal();
});
on('explain-close', 'click', () => (el('explanation') as HTMLDialogElement).close());
document.addEventListener('experiment:reset-all', (event) => {
    event.preventDefault();
    for (const [key, value] of Object.entries(defaults)) {
        if (typeof value === 'boolean') input(key).checked = value;
        else input(key).value = String(value);
    }
    input('aim').value = '0';
    select('rate').value = '0.1';
    select('view').value = view = 'free';
    inspect = true;
    el('history-toggle').setAttribute('aria-pressed', 'true');
    (document.querySelector('.advanced') as HTMLDetailsElement).open = false;
    (el('explanation') as HTMLDialogElement).close();
    config = { ...defaults };
    syncViewControls();
    scene?.setView('free');
    scene?.resetCamera();
    setSettingsOpen(!matchMedia('(max-width: 800px)').matches, false);
    resetClip();
}, { signal: abort.signal });

function animate(stamp: number) {
    if (disposed || !pageActive) return;
    const delta = lastFrame ? Math.min((stamp - lastFrame) / 1000, 0.05) : 0;
    lastFrame = stamp;
    if (playing) {
        time = Math.min(timing(config).end, time + delta * 1000 * +select('rate').value);
        if (time >= timing(config).end) pause();
        update();
    }
    scene?.render(delta);
    frameId = requestAnimationFrame(animate);
}

try {
    scene = createShootingScene(canvas);
} catch {
    text('scene-error', '3D 장면을 열 수 없습니다. 브라우저의 하드웨어 가속을 켠 뒤 새로고침해 주세요.');
    el('scene-error').hidden = false;
    for (const id of ['play', 'step', 'fire', 'compare']) (el(id) as HTMLButtonElement).disabled = true;
}
const observer = new ResizeObserver(() => scene?.resize());
observer.observe(canvas);
update();
frameId = requestAnimationFrame(animate);
document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
}, { signal: abort.signal });
window.addEventListener('pagehide', (event) => {
    pause();
    pageActive = false;
    observer.disconnect();
    cancelAnimationFrame(frameId);
    if (!event.persisted) {
        disposed = true;
        abort.abort();
        scene?.dispose();
    }
});
window.addEventListener('pageshow', (event) => {
    if (!event.persisted) return;
    pageActive = true;
    lastFrame = 0;
    observer.observe(canvas);
    scene?.resize();
    frameId = requestAnimationFrame(animate);
});
