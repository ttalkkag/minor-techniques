import { setPlaybackState } from '../../components/experiment-playback';
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const value = (id: string) => Number($<HTMLInputElement>(id).value);
const choice = (id: string) => $<HTMLSelectElement>(id).value;
const panel = $('settings'),
    info = $<HTMLDialogElement>('info');
const keys = new Set<string>();
document.addEventListener('experiment:layoutchange', () => keys.clear());
$('explain').onclick = () => {
    setRunning(false);
    info.showModal();
    $('info-title').focus();
    info.scrollTop = 0;
};
$('close-info').onclick = () => info.close();
document.querySelectorAll<HTMLInputElement>('input[type="range"]').forEach((input) =>
    input.addEventListener('input', () => {
        const out = document.getElementById(input.id + '-value');
        if (out) out.textContent = input.value;
    }),
);
const accepted = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS', 'Space'];
document.addEventListener('keydown', (e) => {
    if (
        info.open || panel.getAttribute('aria-modal') === 'true' ||
        (e.target instanceof HTMLElement && e.target.closest('input, select, textarea, button, a'))
    ) return;
    if (accepted.includes(e.code)) {
        e.preventDefault();
        keys.add(e.code);
        resumeManual();
    }
});
document.addEventListener('keyup', (e) => keys.delete(e.code));
document.querySelectorAll<HTMLButtonElement>('[data-key]').forEach((b) => {
    let keyboardHeld = false;
    b.onpointerdown = (e) => {
        b.setPointerCapture(e.pointerId);
        keys.add(b.dataset.key!);
        resumeManual();
    };
    b.onpointerup = b.onpointercancel = () => keys.delete(b.dataset.key!);
    b.onkeydown = (e) => {
        if (e.code === 'Enter' || e.code === 'Space') {
            e.preventDefault();
            keyboardHeld = true;
            keys.add(b.dataset.key!);
            resumeManual();
        }
    };
    b.onkeyup = (e) => {
        if (e.code === 'Enter' || e.code === 'Space') {
            keyboardHeld = false;
            keys.delete(b.dataset.key!);
        }
    };
    b.onblur = () => {
        if (keyboardHeld) keys.delete(b.dataset.key!);
        keyboardHeld = false;
    };
});
window.addEventListener('blur', () => keys.clear());
function restoreControls() {
    document.querySelectorAll<HTMLInputElement>('input').forEach((e) => {
        e.value = e.defaultValue;
        e.checked = e.defaultChecked;
        e.dispatchEvent(new Event('input'));
    });
    document.querySelectorAll<HTMLSelectElement>('select').forEach((e) => (e.selectedIndex = 0));
    keys.clear();
}
const canvas = $<HTMLCanvasElement>('scene');
const ctx = canvas.getContext('2d')!;
let W = 800,
    H = 500;
function resizeCanvas() {
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    const dpr = Math.min(devicePixelRatio, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
const resize = new ResizeObserver(resizeCanvas);
resize.observe(canvas);
function textAt(t: string, x: number, y: number, color = '#47666d', size = 12) {
    ctx.fillStyle = color;
    ctx.font = `${size}px sans-serif`;
    ctx.fillText(t, x, y);
}
function circle(x: number, y: number, r: number, color: string) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(1, r), 0, Math.PI * 2);
    ctx.fill();
}
import { stoppingDistance, floorAt, jumpSample, JumpInput } from './model';
const jumpInput = new JumpInput();
let x = 2,
    y = 0,
    vx = 0,
    vy = 0,
    grounded = true,
    reward = 12,
    rewardDir = 1,
    collected = false,
    failures = 0,
    peak = 0,
    landing = 0,
    jumpStart = 2,
    clock = 0,
    running = false,
    replayReady = true,
    raf = 0,
    last = performance.now(),
    event = '먼저 평지에서 움직여 보세요.';
function setRunning(next: boolean) {
    running = next;
    if (!running) keys.clear();
    setPlaybackState('play', running);
}
function resumeManual() {
    if (jumpInput.replaying) jumpInput.reset();
    replayReady = false;
    setRunning(true);
}
function reset() {
    setRunning(false);
    replayReady = true;
    restoreControls();
    x = 2;
    y = 0;
    vx = 0;
    vy = 0;
    grounded = true;
    reward = 12;
    rewardDir = 1;
    collected = false;
    failures = 0;
    peak = 0;
    landing = 0;
    jumpStart = 2;
    clock = 0;
    jumpInput.reset();
    event = '먼저 평지에서 움직여 보세요.';
}
$('reset').onclick = reset;
$<HTMLSelectElement>('layout').onchange = () => {
    setRunning(false);
    replayReady = true;
    jumpInput.reset();
    x = 2;
    y = 0;
    vx = 0;
    vy = 0;
    grounded = true;
    collected = false;
    failures = 0;
    reward = 12;
    rewardDir = 1;
    clock = 0;
    peak = 0;
    landing = 0;
    jumpStart = 2;
    event = '배치를 바꿨습니다. 같은 조작으로 다시 시도하세요.';
};
function prepareReplay() {
    keys.clear();
    x = 2;
    y = 0;
    vx = 5;
    vy = 0;
    grounded = true;
    jumpInput.startReplay();
    replayReady = false;
    peak = 0;
    landing = 0;
    jumpStart = 2;
    event = '오른쪽 5m/s + 0.12초 점프 입력 재생 중';
}
$('jump-test').onclick = () => {
    prepareReplay();
    setRunning(true);
};
$('play').onclick = () => {
    if (running) {
        setRunning(false);
        return;
    }
    if (replayReady) prepareReplay();
    setRunning(true);
};
$('step').onclick = () => {
    setRunning(false);
    if (replayReady) prepareReplay();
    advance(1 / 30);
    draw();
};
function update(dt: number) {
    clock += dt;
    const mixed = choice('layout') === 'mixed';
    const input = jumpInput.step(dt, keys.has('Space'));
    const jump = input.down;
    const horizontal = jumpInput.replaying ? 1 :
        Number(keys.has('ArrowRight') || keys.has('KeyD')) -
        Number(keys.has('ArrowLeft') || keys.has('KeyA'));
    const desired = horizontal * 5,
        accel = horizontal ? (vx * horizontal < 0 ? value('brake') : 18) : value('brake');
    vx += Math.sign(desired - vx) * Math.min(Math.abs(desired - vx), accel * dt);
    if (input.pressed && grounded) {
        vy = 8.5;
        grounded = false;
        jumpStart = x;
        peak = y;
    }
    const oldY = y;
    vy -= 18 * (vy < 0 ? value('fall') : !jump ? value('release') : 1) * dt;
    let nx = Math.max(0.4, Math.min(59, x + vx * dt)),
        ny = y + vy * dt;
    const nextFloor = floorAt(nx, mixed);
    if (nextFloor > y + 0.02 && nextFloor > -10) {
        nx = x;
        vx = 0;
    }
    const height = collected ? 1.5 : 1,
        pipe = { left: 18, right: 19, top: 1.5 };
    if (nx + 0.35 > pipe.left && nx - 0.35 < pipe.right && y < pipe.top) {
        if (x <= pipe.left - 0.35) {
            nx = pipe.left - 0.35;
            vx = 0;
        } else if (x >= pipe.right + 0.35) {
            nx = pipe.right + 0.35;
            vx = 0;
        }
    }
    if (nx > 9 && nx < 16 && oldY + height <= 2.5 && ny + height > 2.5) {
        ny = 2.5 - height;
        vy = 0;
    }
    const floor =
        nx + 0.3 > pipe.left && nx - 0.3 < pipe.right && oldY >= pipe.top ? pipe.top : floorAt(nx, mixed);
    if (ny <= floor && oldY >= floor) {
        ny = floor;
        vy = 0;
        if (!grounded) {
            landing = nx - jumpStart;
            if (jumpInput.replaying) {
                jumpInput.reset();
                replayReady = true;
                event = `재생 완료: 최고점 ${peak.toFixed(2)}m · 수평 이동 ${landing.toFixed(2)}m`;
            }
        }
        grounded = true;
    } else grounded = false;
    x = nx;
    y = ny;
    peak = Math.max(peak, y);
    if (!collected) {
        reward += rewardDir * 1.5 * dt;
        if (reward >= 17.4) {
            reward = 17.4;
            rewardDir = -1;
        }
        if (reward <= 9) {
            reward = 9;
            rewardDir = 1;
        }
        if (Math.abs(x - reward) < 0.8 && y < 0.8 && y + height > 0.2) {
            collected = true;
            event = '보상 접촉 → 몸이 커졌습니다. 다음 공간에서 다시 점프하세요.';
        }
    }
    const enemy = mixed ? 4 + Math.sin(clock) * 1 : 32 + Math.sin(clock) * 1.2;
    if (Math.abs(x - enemy) < 0.65 && y < 0.65) {
        if (vy < 0 && oldY > 0.4) {
            vy = 6;
            event = '위에서 접촉: 튕겨 오릅니다.';
        } else {
            failures++;
            x = mixed ? 2 : 29;
            y = 0;
            vx = 0;
            vy = 0;
            event = '옆에서 접촉: 근처에서 다시 시도합니다.';
        }
    }
    if (y < -6) {
        failures++;
        x = mixed && x < 12 ? 2 : 34;
        y = 0;
        vx = 0;
        vy = 0;
        event = '바닥 없는 틈: 낙하 실패. 바닥 있는 틈과 비교하세요.';
    }
    if (x > 56) event = '도착! 접촉 결과와 서로 다른 실패 비용을 경험했습니다.';
}
function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#e3eeee';
    ctx.fillRect(0, 0, W, H);
    const scale = Math.min(50, Math.max(22, W / 21)),
        cam = Math.max(8, Math.min(52, x + 4)),
        sx = (v: number) => (v - cam) * scale + W / 2,
        ground = H * 0.64,
        sy = (v: number) => ground - v * scale,
        mixed = choice('layout') === 'mixed';
    for (let g = 0; g < 60; g += 0.25) {
        const f = floorAt(g + 0.125, mixed);
        if (f > -10) {
            ctx.fillStyle = f < 0 ? '#bccec2' : '#97b6a2';
            ctx.fillRect(sx(g), sy(f), scale * 0.25 + 1, H - sy(f));
        }
    }
    ctx.fillStyle = '#487c69';
    ctx.fillRect(sx(18), sy(1.5), scale, 1.5 * scale);
    ctx.fillStyle = '#adc7b4';
    ctx.fillRect(sx(9), sy(3), 7 * scale, 0.5 * scale);
    if (!collected) {
        circle(sx(reward), sy(0.4), scale * 0.36, '#e59c54');
        textAt(rewardDir > 0 ? '→' : '←', sx(reward) - 6, sy(0.4) + 5, '#fff', 15);
    }
    const enemy = mixed ? 4 + Math.sin(clock) : 32 + Math.sin(clock) * 1.2;
    ctx.fillStyle = '#ba6657';
    ctx.fillRect(sx(enemy) - scale * 0.35, sy(0.65), scale * 0.7, scale * 0.65);
    textAt('!', sx(enemy) - 3, sy(0.22), 'white', 16);
    ctx.fillStyle = collected ? '#168a74' : '#276f79';
    ctx.fillRect(
        sx(x) - scale * 0.3,
        sy(y + (collected ? 1.5 : 1)),
        scale * 0.6,
        scale * (collected ? 1.5 : 1),
    );
    circle(
        sx(x),
        sy(y + (collected ? 1.5 : 1)) - 0.12 * scale,
        0.28 * scale,
        collected ? '#168a74' : '#276f79',
    );
    for (const [at, label] of [
        [3, '안전 연습'],
        [12, '반사되는 보상'],
        [25, '바닥 있는 틈'],
        [39, '낭떠러지'],
        [56, '다음 단계'],
    ] as const) {
        textAt(label, sx(at) - 28, ground + H * 0.27, '#446a60', 12);
    }
    textAt('횡스크롤 조작 · 자체 이동 수치', 16, 27);
    textAt(event, 16, 52, '#527572', Math.max(10, Math.min(13, W / 40)));
    const sample = jumpSample(value('release'), value('fall'));
    $('readout').textContent =
        `속도 ${vx.toFixed(1)}m/s · 5m/s 제동거리 ${stoppingDistance(5, value('brake')).toFixed(2)}m · 짧은 점프 계산 ${sample.peak.toFixed(2)}m / ${sample.range.toFixed(2)}m · 실패 ${failures}회 · 보상 ${collected ? '접촉함' : '아직'}`;
    $('playback-detail').textContent = `${running ? '재생 중' : '정지'} · ${clock.toFixed(2)}초 · ${jumpInput.replaying ? '짧은 점프 입력' : replayReady ? '짧은 점프 비교 대기' : '직접 이동'} · 한 스텝은 1/30초입니다.`;
}
function advance(dt: number) {
    if (info.open) return;
    const replaying = jumpInput.replaying;
    while (dt > 0) {
        const step = Math.min(dt, 1 / 120);
        update(step);
        dt -= step;
        if (replaying && !jumpInput.replaying) {
            setRunning(false);
            break;
        }
    }
}
function frame(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (running) advance(dt);
    draw();
    raf = requestAnimationFrame(frame);
}
raf = requestAnimationFrame(frame);
window.addEventListener('pagehide', (e) => {
    setRunning(false);
    cancelAnimationFrame(raf);
    if (!e.persisted) resize.disconnect();
});
window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    last = performance.now();
    resize.observe(canvas);
    resizeCanvas();
    raf = requestAnimationFrame(frame);
});
