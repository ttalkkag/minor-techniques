import {
    cycle,
    freshBuild,
    buildBatch,
    rollback,
    type World,
    type Observation,
    type Build,
    type CycleResult,
} from './model';
import { createPlayback } from '../../components/experiment-playback';
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const value = (id: string) => Number($<HTMLInputElement>(id).value),
    choice = (id: string) => $<HTMLSelectElement>(id).value;
const canvas = $<HTMLCanvasElement>('scene'),
    ctx = canvas.getContext('2d')!,
    panel = $('settings'),
    dialog = $<HTMLDialogElement>('explanation');
let world: World = { tick: 0, x: 1, map: '마을', delivered: false, interrupted: false };
let observation: Observation = { ...world, id: 0, capturedAt: 0 },
    result: CycleResult | null = null,
    build: Build = freshBuild(),
    id = 0,
    report = '아직 판단하지 않음';
const logs: string[] = [];
function log(message: string) {
    logs.unshift(message);
    logs.splice(7);
    $('events').textContent = logs.join(' / ');
}
function execute() {
    const verified = choice('policy') === 'verified';
    let canContinue = false;
    if (choice('scenario') === 'move') {
        result = cycle(
            world,
            value('delay'),
            value('burst'),
            verified,
            $<HTMLInputElement>('interrupt').checked,
            ++id,
        );
        world = result.world;
        observation = result.observation;
        report = result.claimed ? '목표 완료' : verified ? '완료 미확인' : '전송 실패';
        $('result-detail').textContent = result.result;
        log(
            `관측 #${observation.id}: ${observation.capturedAt}틱 ${observation.map} x=${observation.x} → 판단 나이 ${result.age}틱 → ${result.sent}명령 / 실제 ${result.moved}칸`,
        );
        canContinue = !world.delivered && world.map === '마을' && result.moved > 0;
        $('playback-detail').textContent = world.delivered
            ? '소포 전달 완료 · 재생을 멈췄습니다.'
            : world.map === '전투'
              ? '전투로 전환되었습니다. 전투 종료 후 재생을 이어가세요.'
              : '관측 → 행동 → 결과 확인을 한 사이클씩 진행합니다.';
    } else {
        const before = build.blocks.filter((v) => v === '벽').length;
        build = buildBatch(build, verified);
        const filled = build.blocks.filter((v) => v === '벽').length;
        report = verified ? (filled === 10 ? '10칸 완료 확인' : '부분 성공') : '명령 응답 성공';
        $('result-detail').textContent =
            `이번 명령 ${build.commands}개 · 실제 새 벽 ${filled - before}개 · 남은 청사진 ${10 - filled}칸 · 자원 ${build.stock}개`;
        log(`벽 배치: 요청 ${build.commands}명령, 실제 ${filled}/10칸, 자원 ${build.stock}`);
        canContinue = filled < 10 && build.stock > 0 && filled > before;
        $('playback-detail').textContent = filled === 10
            ? '벽 10칸 완료 · 재생을 멈췄습니다.'
            : build.stock === 0
              ? '자원이 부족합니다. 자원을 추가한 뒤 재시도하세요.'
              : filled === before
                ? '새로 배치한 벽이 없습니다. 변경분 재시도와 비교하세요.'
                : '청사진과 실제 월드의 차이를 확인하며 배치합니다.';
    }
    paint();
    return canContinue;
}
const playback = createPlayback({ stepId: 'cycle', interval: 700, advance: execute });
function reset() {
    playback.pause();
    world = { tick: 0, x: 1, map: '마을', delivered: false, interrupted: false };
    observation = { ...world, id: 0, capturedAt: 0 };
    result = null;
    build = freshBuild();
    id = 0;
    report = '아직 판단하지 않음';
    logs.length = 0;
    $('events').textContent = '';
    $('result-detail').textContent = '관측을 캡처하고 한정된 행동을 실행합니다.';
    $('playback-detail').textContent = choice('scenario') === 'move'
        ? '관측 → 행동 → 결과 확인을 한 사이클씩 진행합니다.'
        : '청사진과 실제 월드의 차이를 확인하며 배치합니다.';
    paint();
}
function grid(
    x: number,
    y: number,
    width: number,
    height: number,
    title: string,
    state: World | undefined,
    blueprint: boolean,
) {
    const cols = choice('scenario') === 'move' ? 10 : 5,
        rows = choice('scenario') === 'move' ? 4 : 2,
        size = Math.min((width - 10) / cols, (height - 37) / rows);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#46656e';
    ctx.fillText(title, x, y + 16);
    const oy = y + 33;
    for (let row = 0; row < rows; row++)
        for (let col = 0; col < cols; col++) {
            const index = row * 5 + col,
                block = build.blocks[index],
                px = x + col * size,
                py = oy + row * size;
            ctx.fillStyle = state
                ? state.map === '전투'
                    ? '#f1ded3'
                    : '#dfece6'
                : blueprint
                  ? '#dcebe5'
                  : block === '벽'
                    ? '#6eaaa1'
                    : block === '나무'
                      ? '#d89f65'
                      : '#edf1f1';
            ctx.fillRect(px + 2, py + 2, size - 4, size - 4);
            if (!state) {
                ctx.fillStyle = blueprint ? '#8bb4aa' : block === '벽' ? '#fff' : '#70878b';
                ctx.font = `${Math.max(10, size * 0.23)}px sans-serif`;
                ctx.fillText(
                    blueprint ? '벽' : block === '빈칸' ? `${index + 1}` : block,
                    px + size * 0.25,
                    py + size * 0.58,
                );
            }
        }
    if (state) {
        const cy = oy + 2.5 * size;
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = '#93aba9';
        ctx.beginPath();
        ctx.moveTo(x + 1.5 * size, cy);
        ctx.lineTo(x + 8.5 * size, cy);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#dca16a';
        ctx.fillRect(x + 8.25 * size, cy - size * 0.25, size * 0.5, size * 0.5);
        ctx.fillStyle = state.map === '전투' ? '#bb7352' : '#237e78';
        ctx.beginPath();
        ctx.arc(x + (state.x + 0.5) * size, cy, size * 0.27, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = '10px sans-serif';
        ctx.fillStyle = '#607980';
        ctx.fillText(`${state.map} · x=${state.x} · ${state.tick}틱`, x, oy + rows * size + 18);
    }
}
function paint() {
    const r = canvas.getBoundingClientRect(),
        dpr = Math.min(devicePixelRatio, 2);
    canvas.width = r.width * dpr;
    canvas.height = r.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, r.width, r.height);
    const mobile = r.width < 650,
        isMove = choice('scenario') === 'move',
        width = mobile ? r.width - 42 : (r.width - 70) / 2,
        height = mobile ? 170 : 270;
    if (isMove) {
        grid(22, 18, width, height, '실제 월드 · 지금', world, false);
        grid(
            mobile ? 22 : r.width / 2 + 12,
            mobile ? 208 : 18,
            width,
            height,
            `받은 관측 #${observation.id} · 캡처 시점`,
            observation,
            false,
        );
    } else {
        grid(22, 18, width, height, '요청 청사진 · 벽 10칸', undefined, true);
        grid(
            mobile ? 22 : r.width / 2 + 12,
            mobile ? 208 : 18,
            width,
            height,
            '실제 월드 · 빈칸 / 벽 / 다른 작업',
            undefined,
            false,
        );
    }
    if (!mobile) {
        ctx.fillStyle = '#526f78';
        ctx.font = '13px sans-serif';
        ctx.fillText(
            isMove
                ? '관측 → 판단 → 제한된 실행 → 실제 결과 확인'
                : '청사진과 월드의 차이 → 남은 좌표만 재시도 → 버전 확인 후 복원',
            24,
            r.height - 56,
        );
        ctx.fillStyle = '#d29b66';
        ctx.fillRect(24, r.height - 36, 10, 10);
        ctx.fillStyle = '#627a81';
        ctx.font = '11px sans-serif';
        ctx.fillText(
            isMove ? '주황: 전달 목적지 / 원: 에이전트' : '청록: 이번 작업의 벽 / 주황: 다른 작업의 나무',
            41,
            r.height - 26,
        );
    }
    const filled = build.blocks.filter((v) => v === '벽').length;
    $('metric-0').textContent = isMove
        ? `${result?.age ?? 0}틱 / ${result?.sent ?? 0}명령`
        : `${build.commands}명령 / 자원 ${build.stock}`;
    $('metric-1').textContent = isMove
        ? world.delivered
            ? '소포 전달 완료'
            : `미완료 · ${8 - world.x}칸 남음`
        : `${filled} / 10칸`;
    $('metric-2').textContent = report;
    $('summary').textContent = isMove
        ? `현재 ${world.map}, ${world.tick}틱. 관측은 ${observation.map}, ${observation.capturedAt}틱. ${result?.claimed && !world.delivered ? '완료 보고와 실제 목표가 불일치합니다.' : '실제 월드의 목표 조건을 함께 확인하세요.'}`
        : `버전 보호 ${choice('policy') === 'verified' ? '켜짐' : '꺼짐'} · 되돌리기 충돌 ${build.conflicts}개. 최대 6명령 예산을 중복 명령이 소모할 수 있습니다.`;
    $('resolve').hidden = !isMove;
    for (const id of ['restock', 'concurrent', 'rollback']) $(id).hidden = isMove;
    for (const id of ['delay', 'burst', 'interrupt']) $<HTMLInputElement>(id).disabled = !isMove;
    for (const id of ['delay', 'burst']) $(id + '-value').textContent = String(value(id));
}
$('help').onclick = () => {
    playback.pause();
    dialog.showModal();
};
$('close-help').onclick = () => dialog.close();

$('reset').onclick = () => {
    for (const [id, v] of Object.entries({ policy: 'unsafe', delay: '3', burst: '5' }))
        $<HTMLInputElement>(id).value = v;
    $<HTMLInputElement>('interrupt').checked = true;
    reset();
};
$('resolve').onclick = () => {
    playback.pause();
    world.map = '마을';
    world.tick++;
    $('playback-detail').textContent = '마을로 돌아왔습니다. 재생하면 현재 상태를 다시 관측합니다.';
    log('전투 종료 → 현재 마을로 복귀');
    paint();
};
$('restock').onclick = () => {
    playback.pause();
    build.stock += 4;
    $('playback-detail').textContent = '자원을 보충했습니다. 재생 또는 한 스텝으로 배치를 재시도하세요.';
    log('건축 자원 +4');
    paint();
};
$('concurrent').onclick = () => {
    playback.pause();
    build.blocks[2] = '나무';
    build.versions[2]++;
    $('playback-detail').textContent = '다른 작업이 3번 칸을 바꿨습니다. 변경분 재시도나 되돌리기를 비교하세요.';
    log(`다른 작업: 3번 칸을 나무로 변경, 버전 ${build.versions[2]}`);
    paint();
};
$('rollback').onclick = () => {
    playback.pause();
    build = rollback(build, choice('policy') === 'verified');
    $('playback-detail').textContent = '이번 작업을 되돌렸습니다. 실제 월드와 보존된 충돌 칸을 확인하세요.';
    report = build.conflicts ? `충돌 ${build.conflicts}개 보존` : '변경 복원';
    $('result-detail').textContent =
        `다른 작업과 충돌한 ${build.conflicts}개 칸을 건너뛰었습니다. 자원 반환은 이 복원 실험 범위에 포함하지 않습니다.`;
    paint();
};
$('scenario').addEventListener('change', reset);
for (const input of panel.querySelectorAll('input,select')) {
    input.addEventListener('input', paint);
    input.addEventListener('change', paint);
}
const resize = new ResizeObserver(paint);
resize.observe(canvas);
window.addEventListener('pagehide', () => {
    resize.disconnect();
});
window.addEventListener('pageshow', () => {
    resize.observe(canvas);
    paint();
});
paint();
