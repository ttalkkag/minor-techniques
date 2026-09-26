import { setPlaybackState } from '../../components/experiment-playback';

const get = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const input = (id: string) => get<HTMLInputElement>(id);
const number = (id: string) => Number(input(id).value);
const text = (id: string, value: string) => {
    const element = get(id);
    if (element.textContent !== value) element.textContent = value;
};
const dialog = get<HTMLDialogElement>('explanation');
get('explain').addEventListener('click', () => dialog.showModal());
get('close-explain').addEventListener('click', () => dialog.close());
import { initialWall, blocked, strike, tickWall, type Span } from './model';
const scene = document.getElementById('scene') as unknown as SVGSVGElement;
let wall = initialWall(),
    ticks = 0,
    actorPassed = false,
    actorTried = false,
    frame = 0,
    playing = false,
    sceneTime = 0,
    previous = 0,
    elapsed = 0,
    demoStep = 0;
let particles: { x: number; y: number; vx: number; vy: number; born: number }[] = [];
const projected = (span: Span, y: number, color: string, outline = false) =>
    `<rect x="${210 + span.a * 670}" y="${y}" width="${(span.b - span.a) * 670}" height="50" rx="3" fill="${outline ? 'none' : color}" stroke="${color}" stroke-width="${outline ? 3 : 1}" ${outline ? 'stroke-dasharray="7 5"' : ''}/>`;
function draw(now = sceneTime) {
    const lane = number('lane'),
        hit = number('hit-position');
    text('hit-out', `${(hit * 100).toFixed(0)}%`);
    text('lane-out', `${(lane * 100).toFixed(0)}%`);
    text('power-out', `${number('power')}`);
    const collider = [...wall.collision, ...wall.debris],
        navBlocked = blocked([...wall.nav, ...wall.debris], lane);
    text(
        'nav-readout',
        `${navBlocked ? '우회 필요 · 통로 없음' : '직선 통로 열림'}${wall.pending.length ? ' · 갱신 대기' : ''}`,
    );
    text('player-readout', actorTried ? (actorPassed ? '통과 성공' : '충돌에 막힘') : '시도 전');
    text(
        'debris-readout',
        `표시 ${particles.filter((p) => now - p.born < 1800).length}개 / 큰 파편 ${wall.debris.length}개`,
    );
    text(
        'summary',
        `틱 ${ticks} · ${wall.removed.length ? '파괴 범위 ' + wall.removed.length + '곳' : '정상 벽'} · 이동 위치 ${Math.round(lane * 100)}%는 ${blocked(collider, lane) ? '충돌 차단' : '충돌 통과'} · 표시와 판정의 빈틈을 비교하세요.`,
    );
    let html = `<rect x="20" y="8" width="960" height="412" rx="25" fill="#e5edef"/><text x="48" y="50" font-size="16">같은 벽의 세 상태 · 위에서 본 단면</text>`;
    const labels = ['화면의 벽', '이동 충돌', 'AI 통로'];
    [wall.visual, wall.collision, wall.nav].forEach((spans, row) => {
        const y = 90 + row * 100;
        html += `<text x="52" y="${y + 30}" font-size="18">${labels[row]}</text><path d="M210 ${y + 25}H880" stroke="#c8d8da" stroke-width="50"/>`;
        spans.forEach((span) => {
            html += projected(span, y, row === 0 ? '#8da7ab' : row === 1 ? '#d3864d' : '#81989e');
        });
        if (row === 0 && input('method').value === 'fracture')
            for (let i = 1; i < 5; i++)
                html += `<path d="M${210 + i * 134} ${y}V${y + 50}" stroke="#edf1f3" stroke-width="3"/>`;
        if (row === 0 && input('overlay').checked)
            for (const span of wall.collision) html += projected(span, y - 4, '#b35e30', true);
        if (row > 0) for (const span of wall.debris) html += projected(span, y, '#73543e');
        html += `<path d="M${210 + lane * 670} ${y + 74}V${y - 8}" stroke="${row === 2 && navBlocked ? '#b6563d' : '#0c7c7b'}" stroke-width="5" stroke-dasharray="7 6"/>`;
    });
    html += `<path d="M${210 + hit * 670} 62V88" stroke="#be592f" stroke-width="4"/><circle cx="${210 + lane * 670}" cy="${actorTried && actorPassed ? 171 : actorTried ? 246 : 263}" r="12" fill="#117c7b" stroke="white" stroke-width="3"/>`;
    if (wall.total > 0)
        html += `<text x="210" y="388" font-size="15">누적 피해 ${wall.total} · 셀 잔여 ${wall.health.join(' / ')}</text>`;
    particles = particles.filter((p) => now - p.born < 1800);
    for (const p of particles) {
        const t = (now - p.born) / 1000;
        const x = p.x + p.vx * t,
            y = Math.min(165, p.y + p.vy * t + 100 * t * t);
        html += `<rect x="${x}" y="${y}" width="9" height="9" transform="rotate(${t * p.vx} ${x} ${y})" fill="#91a6a9" opacity="${Math.max(0, 1 - t / 1.8)}"/>`;
    }
    scene.innerHTML = html;
}
function update() {
    draw();
}
function strikeWall() {
    const x = number('hit-position'),
        cut = strike(
            wall,
            x,
            number('power'),
            input('method').value,
            input('policy').value,
            input('debris').checked,
        );
    actorTried = false;
    if (cut)
        for (let i = 0; i < 6; i++)
            particles.push({
                x: 210 + (cut.a + ((cut.b - cut.a) * (i + 0.5)) / 6) * 670,
                y: 105,
                vx: (i - 2.5) * 30 + (x - 0.5) * 90,
                vy: -70 - (i % 3) * 20,
                born: sceneTime,
            });
    update();
}
function walk() {
    actorTried = true;
    actorPassed = !blocked([...wall.collision, ...wall.debris], number('lane'));
    update();
}
function nextTick() {
    ticks++;
    tickWall(wall);
    update();
}
function clearWall() {
    wall = initialWall();
    ticks = 0;
    particles = [];
    actorTried = false;
    actorPassed = false;
}
function advanceDemo() {
    if (demoStep === 5) demoStep = 0;
    if (demoStep === 0) {
        clearWall();
        strikeWall();
    } else if (demoStep === 1 || demoStep === 4) walk();
    else nextTick();
    const labels = ['타격', '이동 시도', 'AI 갱신 1틱', 'AI 갱신 2틱', '다시 이동 시도'];
    text('playback-status', `${demoStep + 1}/5 · ${labels[demoStep]}`);
    demoStep++;
    return demoStep < 5;
}
function setPlaying(next: boolean) {
    playing = next;
    cancelAnimationFrame(frame);
    setPlaybackState('play', playing);
}
function animate(now: number) {
    if (!playing) return;
    const delta = Math.min(100, now - previous);
    previous = now;
    if (!dialog.open) {
        sceneTime += delta;
        elapsed += delta;
        if (elapsed >= 900) {
            elapsed -= 900;
            if (!advanceDemo()) setPlaying(false);
        }
        draw();
    }
    if (playing) frame = requestAnimationFrame(animate);
}
get('play').addEventListener('click', () => {
    if (playing) {
        setPlaying(false);
        return;
    }
    if (demoStep === 0 || demoStep === 5) advanceDemo();
    setPlaying(true);
    previous = performance.now();
    elapsed = 0;
    frame = requestAnimationFrame(animate);
});
get('step').addEventListener('click', () => {
    setPlaying(false);
    sceneTime += 900;
    advanceDemo();
    draw();
});
for (const [id, action] of [['strike', strikeWall], ['walk', walk], ['tick', nextTick]] as const)
    get(id).addEventListener('click', () => {
        setPlaying(false);
        demoStep = 0;
        if (id === 'tick') sceneTime += 900;
        action();
        text('playback-status', '수동 조작 · 재생하면 새 벽에서 순서를 시작합니다.');
    });
get('clear').addEventListener('click', () => {
    setPlaying(false);
    demoStep = 0;
    wall.debris = [];
    particles = [];
    actorTried = false;
    update();
});
for (const id of ['hit-position', 'power', 'lane', 'overlay', 'debris'])
    get(id).addEventListener('input', () => {
        actorTried = false;
        update();
    });
for (const id of ['method', 'policy'])
    get(id).addEventListener('change', () => {
        setPlaying(false);
        demoStep = 0;
        clearWall();
        update();
    });
get('reset').addEventListener('click', () => {
    setPlaying(false);
    sceneTime = 0;
    demoStep = 0;
    clearWall();
    input('method').value = 'fracture';
    input('policy').value = 'sync';
    input('hit-position').value = '.5';
    input('power').value = '100';
    input('lane').value = '.5';
    input('debris').checked = false;
    input('overlay').checked = true;
    text('playback-status', '타격 → 이동 시도 → 2틱 갱신 → 다시 이동');
    update();
});
window.addEventListener('pagehide', () => {
    setPlaying(false);
});
window.addEventListener('pageshow', (event) => {
    if (event.persisted) update();
});
setPlaybackState('play', playing);
update();
