import { simulate, learningTarget, parseValueEstimate, type Config, type Route, type RewardMode, type Step } from './model';
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const value = (id: string) => Number($<HTMLInputElement>(id).value),
    choice = (id: string) => $<HTMLSelectElement>(id).value;
const canvas = $<HTMLCanvasElement>('scene'),
    ctx = canvas.getContext('2d')!,
    panel = $('settings'),
    dialog = $<HTMLDialogElement>('explanation');
const names: Record<Route, string> = { loop: '왕복 반복', direct: '위험한 지름길', safe: '안전한 우회' },
    routes: Route[] = ['loop', 'direct', 'safe'];
let index = -1,
    timer = 0,
    running = false;
function config(): Config {
    return {
        mode: choice('reward') as RewardMode,
        bonus: value('bonus'),
        death: value('death'),
        cost: value('cost'),
        limit: value('limit'),
        finite: choice('timeout') === 'finite',
        gamma: value('gamma'),
    };
}
function traces() {
    const c = config();
    return routes.map((route) => ({ route, steps: simulate(route, c) }));
}
function selected() {
    const list = traces();
    return choice('route') === 'auto'
        ? list.reduce((best, item) =>
              item.steps.at(-1)!.discounted > best.steps.at(-1)!.discounted ? item : best,
          )
        : list.find((item) => item.route === choice('route'))!;
}
function stop() {
    running = false;
    clearInterval(timer);
    $('play').textContent = '정책 재생';
}
function step() {
    const steps = selected().steps;
    if (index >= steps.length - 1) {
        stop();
        return;
    }
    index++;
    paint();
    if (index === steps.length - 1) stop();
}
function paint() {
    const c = config(),
        selectedTrace = selected(),
        trace = selectedTrace.steps,
        entry: Step | undefined = trace[index];
    const r = canvas.getBoundingClientRect(),
        dpr = Math.min(devicePixelRatio, 2);
    canvas.width = r.width * dpr;
    canvas.height = r.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, r.width, r.height);
    const mobile = r.width < 650,
        gridW = mobile ? r.width - 40 : r.width * 0.57,
        size = Math.min(gridW / 5, (r.height - 80) / 3),
        ox = 20,
        oy = 48;
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#55717c';
    ctx.fillText('시작 → 목적지 · 주황 칸은 실패', 20, 27);
    for (let y = 0; y < 3; y++)
        for (let x = 0; x < 5; x++) {
            ctx.fillStyle =
                y === 0
                    ? '#e0e7e8'
                    : x === 3 && y === 1
                      ? '#edbc9a'
                      : x === 4 && y === 1
                        ? '#80b8aa'
                        : '#e0ece6';
            ctx.fillRect(ox + x * size + 3, oy + y * size + 3, size - 6, size - 6);
            if (y === 1 && (x === 0 || x === 3 || x === 4)) {
                ctx.fillStyle = '#516e75';
                ctx.font = `${Math.max(10, size * 0.17)}px sans-serif`;
                ctx.fillText(
                    x === 0 ? '시작' : x === 3 ? '위험' : '도착',
                    ox + x * size + size * 0.23,
                    oy + y * size + size * 0.6,
                );
            }
        }
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = '#c09a76';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ox + 0.5 * size, oy + 1.5 * size);
    trace.forEach((s) => ctx.lineTo(ox + (s.x + 0.5) * size, oy + (s.y + 0.5) * size));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#216f70';
    ctx.beginPath();
    ctx.arc(
        ox + ((entry?.x ?? 0) + 0.5) * size,
        oy + ((entry?.y ?? 1) + 0.5) * size,
        size * 0.17,
        0,
        Math.PI * 2,
    );
    ctx.fill();
    const chartX = mobile ? 20 : r.width * 0.65,
        chartY = mobile ? oy + size * 3 + 34 : 76,
        barWidth = mobile ? r.width - 40 : r.width * 0.3,
        max = Math.max(1, ...traces().map((t) => Math.abs(t.steps.at(-1)!.discounted)));
    traces().forEach((item, i) => {
        const score = item.steps.at(-1)!.discounted,
            y = chartY + i * (mobile ? 28 : 72);
        ctx.fillStyle = '#617a83';
        ctx.font = '11px sans-serif';
        ctx.fillText(`${names[item.route]}  ${score.toFixed(2)}`, chartX, y);
        const zero = chartX + barWidth / 2,
            bar = ((score / max) * barWidth) / 2;
        ctx.strokeStyle = '#9aafb2';
        ctx.beginPath();
        ctx.moveTo(zero, y + 3);
        ctx.lineTo(zero, y + (mobile ? 16 : 26));
        ctx.stroke();
        ctx.fillStyle = score < 0 ? '#d6a271' : item.route === selectedTrace.route ? '#428e83' : '#b7d1cb';
        ctx.fillRect(bar >= 0 ? zero : zero + bar, y + 6, Math.max(2, Math.abs(bar)), mobile ? 7 : 17);
    });
    const estimates = ['online-left', 'online-right', 'target-left', 'target-right'].map((id) => {
        const input = $<HTMLInputElement>(id), estimate = parseValueEstimate(input.value);
        input.setAttribute('aria-invalid', String(estimate === null));
        return estimate;
    });
    const invalid = estimates.some((estimate) => estimate === null),
        reward = entry?.reward ?? 0,
        terminated = entry?.terminated ?? false,
        online = estimates.slice(0, 2).map((estimate) => estimate ?? 0),
        target = estimates.slice(2).map((estimate) => estimate ?? 0),
        double = choice('target-method') === 'double',
        y = invalid ? null : learningTarget(reward, c.gamma, online, target, terminated, double);
    $('value-error').hidden = !invalid;
    $('metric-0').textContent = names[selectedTrace.route];
    $('metric-1').textContent = `${(entry?.total ?? 0).toFixed(1)} / ${entry?.outcome ?? '대기'}`;
    $('metric-2').textContent = y === null ? '입력 확인' : y.toFixed(2);
    $('transition-detail').textContent = y === null
        ? '학습 타깃 계산 보류 · 네 가치에 -20부터 20까지의 유한한 숫자를 입력하세요.'
        : `${entry ? `${entry.t}스텝: 진행 ${entry.progress >= 0 ? '+' : ''}${entry.progress}, 종료 ${entry.terminal >= 0 ? '+' : ''}${entry.terminal}, 비용 ${entry.cost.toFixed(1)} → r=${reward.toFixed(1)}` : '첫 전이 전 · r=0 예시'} · terminated=${terminated} / truncated=${entry?.truncated ?? false} · y = ${reward.toFixed(1)}${terminated ? '' : ` + ${c.gamma} × ${double ? target[online[0] >= online[1] ? 0 : 1] : Math.max(...target)}`} = ${y.toFixed(2)}`;
    $('summary').textContent =
        `${choice('route') === 'auto' ? '세 고정 후보의 할인 보상으로 선택' : '사용자가 후보 선택'} · ${entry?.t ?? 0}/${c.limit}스텝. ${c.finite ? `관측 상태의 남은 시간 ${Math.max(0, c.limit - (entry?.t ?? 0))}스텝` : '제한은 외부 수집 중단입니다.'} 점수와 도착 여부를 별도로 비교하세요.`;
    $('candidates').innerHTML = traces()
        .map((item) => {
            const last = item.steps.at(-1)!;
            return `<tr><td>${names[item.route]}${item.route === selectedTrace.route ? ' ✓' : ''}</td><td>${last.discounted.toFixed(2)}</td><td>${last.outcome}</td><td>${last.t}</td></tr>`;
        })
        .join('');
    for (const key of ['bonus', 'death', 'cost', 'limit', 'gamma'])
        $(key + '-value').textContent = String(value(key));
}
function reset(all: boolean) {
    stop();
    index = -1;
    if (all) {
        for (const [id, v] of Object.entries({
            reward: 'move',
            bonus: '0',
            death: '0',
            cost: '0',
            limit: '8',
            timeout: 'external',
            gamma: '.9',
            route: 'auto',
            'target-method': 'double',
            'online-left': '8',
            'online-right': '7',
            'target-left': '4',
            'target-right': '9',
        }))
            $<HTMLInputElement>(id).value = v;
    }
    paint();
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
$('step').onclick = step;
$('play').onclick = () => {
    if (running) {
        stop();
        return;
    }
    if (index >= selected().steps.length - 1) index = -1;
    running = true;
    $('play').textContent = '일시 정지';
    timer = window.setInterval(step, 550);
    step();
};
$('reset').onclick = () => reset(true);
$('fix').onclick = () => {
    reset(true);
    $<HTMLSelectElement>('reward').value = 'progress';
    $<HTMLInputElement>('bonus').value = '10';
    $<HTMLInputElement>('death').value = '8';
    paint();
};
for (const input of panel.querySelectorAll('input,select')) {
    const change = () => reset(false);
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
