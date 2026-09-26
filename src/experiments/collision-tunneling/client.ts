import { setSettingsOpen } from '../../layouts/experiment-layout';
import { DEFAULTS, createSimulation, stepSimulation, advanceSimulation } from './physics';
import { createSection } from './render-2d';
import type { createScene } from './render-3d';

const element = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const fields = ['speed', 'thickness', 'hz', 'radius'] as const;
const inputs = Object.fromEntries(fields.map((field) => [field, element<HTMLInputElement>(field)])) as Record<typeof fields[number], HTMLInputElement>;
const stage = element('stage');
const canvas = element<HTMLCanvasElement>('scene');
const sectionCanvas = element<HTMLCanvasElement>('section');
const section = createSection(sectionCanvas);
const playButton = element<HTMLButtonElement>('play');
const stepButton = element<HTMLButtonElement>('step');
const playback = element<HTMLSelectElement>('playback-speed');
const explanation = element<HTMLDialogElement>('explanation');
const compact = window.matchMedia('(max-width: 800px)');
let scene: ReturnType<typeof createScene> | undefined;
let simulation = createSimulation();
let playing = false;
let view: '2d' | '3d' = '3d';
let pathVisible = true;
let lastTime: number | null = null;
let animationFrame = 0;

function finished() {
    return simulation.discrete.status !== 'pending' && simulation.continuous.status !== 'pending';
}

function updateReadouts() {
    for (const field of fields) {
        const input = inputs[field];
        const value = Number(input.value);
        const unit = { speed: 'm/s', hz: '회', thickness: 'm', radius: 'm' }[field];
        const formatted = field === 'radius' || field === 'thickness' ? value.toFixed(2) : String(value);
        element(`${field}-value`).innerHTML = `${formatted} <small>${unit}</small>`;
        input.setAttribute('aria-valuetext', `${formatted} ${unit}`);
        input.style.setProperty('--progress', `${(value - Number(input.min)) / (Number(input.max) - Number(input.min)) * 100}%`);
    }
    const { speed, hz } = simulation.config;
    element('distance-value').innerHTML = `${(speed / hz).toFixed(2)} <small>m</small>`;
    element('distance-formula').textContent = `${speed} m/s ÷ ${hz}회/s`;
    element('tick-value').textContent = `${simulation.tick} STEP`;
    element('time-value').textContent = `${simulation.time.toFixed(3)} s`;
    for (const method of ['discrete', 'continuous'] as const) {
        const body = simulation[method];
        const status = element(`${method}-status`);
        status.className = `status ${body.status}`;
        const label = { pending: simulation.tick ? '이동 중' : '대기', hit: '충돌 감지', missed: '충돌 누락' }[body.status];
        if (status.textContent !== label) status.textContent = label;
        const detail = element(`${method}-detail`);
        if (body.status === 'hit') {
            detail.textContent = `${body.checks}회 검사 · ${body.hitTime!.toFixed(6)} s · 중심 x = ${body.hitX!.toFixed(2)} m`;
        } else if (body.status === 'missed') {
            detail.textContent = `${body.checks}회 검사 · 벽 앞 ${body.prev.toFixed(2)} → 벽 뒤 ${body.next.toFixed(2)} m`;
        } else {
            detail.textContent = `${body.checks}회 검사 · 중심 x = ${body.x.toFixed(2)} m`;
        }
    }
    stepButton.disabled = finished();
    playButton.textContent = playing ? '일시정지' : finished() ? '다시 재생' : simulation.tick ? '계속 재생' : '실험 재생';
    playButton.setAttribute('aria-pressed', String(playing));
}

function update() {
    updateReadouts();
    scene?.update(simulation, pathVisible);
    section.update(simulation, pathVisible);
}

function reset() {
    playing = false;
    lastTime = null;
    simulation = createSimulation(Object.fromEntries(fields.map((field) => [field, Number(inputs[field].value)])));
    update();
}

function applyPreset(dense: boolean) {
    for (const field of fields) inputs[field].value = String(dense && field === 'hz' ? 120 : DEFAULTS[field]);
    for (const [id, selected] of [['preset-miss', !dense], ['preset-fix', dense]] as const) {
        element(id).classList.toggle('selected', selected);
        element(id).setAttribute('aria-pressed', String(selected));
    }
}

function setPreset(dense: boolean) {
    applyPreset(dense);
    reset();
}

function restoreSettings() {
    applyPreset(false);
    pathVisible = true;
    element<HTMLInputElement>('show-path').checked = true;
    playback.value = '0.1';
}

function resetAll() {
    restoreSettings();
    reset();
    setView(element<HTMLButtonElement>('view-3d').disabled ? '2d' : '3d');
    setSettingsOpen(!compact.matches, false);
    scene?.resetCamera();
}

function setView(next: '2d' | '3d') {
    view = next;
    const show3D = view === '3d' && Boolean(scene);
    canvas.hidden = !show3D;
    sectionCanvas.hidden = show3D;
    stage.setAttribute('aria-label', show3D ? '위치 검사와 경로 검사를 비교하는 3D 장면' : '이전 위치, 예정 위치와 최초 접촉을 비교하는 2D 단면');
    for (const mode of ['3d', '2d']) {
        element(`view-${mode}`).classList.toggle('selected', view === mode);
        element(`view-${mode}`).setAttribute('aria-pressed', String(view === mode));
    }
    element('scene-hint').textContent = show3D
        ? '드래그 회전 · 휠/핀치 확대 · 오른쪽 드래그/두 손가락 이동 · 방향키 회전 · +/− 확대'
        : '● 현재 중심   ◌ 이전·예정 중심   ┄ 이동 경로   ○ 벽 표면 접촉';
    section.update(simulation, pathVisible);
}

function resize() {
    const width = Math.max(1, stage.clientWidth);
    const height = Math.max(1, stage.clientHeight);
    scene?.resize(width, height);
    section.resize(width, height);
}

for (const field of fields) {
    inputs[field].addEventListener('input', () => {
        for (const id of ['preset-miss', 'preset-fix']) {
            element(id).classList.remove('selected');
            element(id).setAttribute('aria-pressed', 'false');
        }
        reset();
    });
}
element('preset-miss').addEventListener('click', () => setPreset(false));
element('preset-fix').addEventListener('click', () => setPreset(true));
element('reset').addEventListener('click', reset);
document.addEventListener('experiment:reset-all', (event) => {
    event.preventDefault();
    resetAll();
});
stepButton.addEventListener('click', () => {
    playing = false;
    simulation.accumulator = 0;
    stepSimulation(simulation);
    update();
});
playButton.addEventListener('click', () => {
    if (finished()) reset();
    playing = !playing;
    lastTime = null;
    updateReadouts();
});
element<HTMLInputElement>('show-path').addEventListener('change', (event) => {
    pathVisible = (event.currentTarget as HTMLInputElement).checked;
    scene?.update(simulation, pathVisible);
    section.update(simulation, pathVisible);
});
element('view-3d').addEventListener('click', () => setView('3d'));
element('view-2d').addEventListener('click', () => setView('2d'));
element('explain').addEventListener('click', () => {
    playing = false;
    updateReadouts();
    explanation.showModal();
});
element('close-explanation').addEventListener('click', () => explanation.close());
explanation.addEventListener('click', (event) => {
    if (event.target !== explanation) return;
    const bounds = explanation.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) explanation.close();
});

function animate(timestamp: number) {
    const elapsed = lastTime === null ? 0 : (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    if (!document.hidden) {
        if (playing) {
            const steps = advanceSimulation(simulation, elapsed * Number(playback.value));
            if (finished()) playing = false;
            if (steps > 0) update();
        }
        if (view === '3d') scene?.render();
    }
    animationFrame = requestAnimationFrame(animate);
}

function fallback() {
    scene?.dispose();
    scene = undefined;
    element('render-error').hidden = false;
    element<HTMLButtonElement>('view-3d').disabled = true;
    setView('2d');
}

canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    fallback();
});
document.addEventListener('visibilitychange', () => { lastTime = null; });
const observer = new ResizeObserver(resize);
observer.observe(stage);
resize();
reset();
setView(view);
animationFrame = requestAnimationFrame(animate);

import('./render-3d').then(({ createScene }) => {
    scene = createScene(canvas);
    resize();
    scene.update(simulation, pathVisible);
    scene.resetCamera();
    setView(view);
}).catch(fallback);

window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        lastTime = null;
        resize();
    }
});

window.addEventListener('pagehide', (event) => {
    lastTime = null;
    if (event.persisted) return;
    cancelAnimationFrame(animationFrame);
    observer.disconnect();
    scene?.dispose();
});
