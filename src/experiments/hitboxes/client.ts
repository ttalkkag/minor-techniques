const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>('scene');
const ctx = canvas.getContext('2d')!;
const menu = $<HTMLButtonElement>('menu'),
    settings = $<HTMLElement>('settings');
function setMenuOpen(open: boolean) {
    settings.hidden = !open;
    $('menu-backdrop').hidden = !open;
    menu.setAttribute('aria-expanded', String(open));
    for (const region of document.querySelectorAll<HTMLElement>(
        'main > :not(nav):not(#settings):not(#menu-backdrop), nav > :not(#menu)',
    )) region.inert = open;
    if (open) {
        keys.clear();
        $('close-menu').focus();
    }
    else menu.focus();
}
function closeMenu() {
    setMenuOpen(false);
}
menu.onclick = () => setMenuOpen(Boolean(settings.hidden));
$<HTMLButtonElement>('close-menu').onclick = closeMenu;
$('menu-backdrop').onclick = closeMenu;
const dialog = $<HTMLDialogElement>('explanation');
$<HTMLButtonElement>('explain').onclick = () => dialog.showModal();
$<HTMLButtonElement>('close-explanation').onclick = () => dialog.close();
document.addEventListener('keydown', (e) => {
    if (dialog.open || settings.hidden) return;
    if (e.key === 'Escape') {
        e.preventDefault();
        closeMenu();
    }
    if (e.key === 'Tab') {
        const controls = [...settings.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href]',
        )];
        const first = controls[0]!, last = controls[controls.length - 1]!;
        if (!settings.contains(document.activeElement) || (e.shiftKey && document.activeElement === first)) {
            e.preventDefault();
            (e.shiftKey ? last : first).focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }
});
let width = 900,
    height = 450;
function resize() {
    const r = canvas.getBoundingClientRect();
    width = r.width;
    height = r.height;
    const dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
}
const observer = new ResizeObserver(resize);
observer.observe(canvas);

function text(t: string, x: number, y: number, color = '#53626d', size = 14) {
    ctx.fillStyle = color;
    ctx.font = `${size}px -apple-system, sans-serif`;
    ctx.fillText(t, x, y);
}
import { activeRound, applyHit, overlap } from './model';
const number = (id: string) => Number($<HTMLInputElement>(id).value),
    checked = (id: string) => $<HTMLInputElement>(id).checked;
let tick = -1,
    attackId = 0,
    naive = 0,
    deduped = 0,
    seen = new Set<string>(),
    running = true,
    queued = false,
    stopUntil = 0,
    realTime = 0,
    attackerX = 100,
    gameTime = 0,
    last = 0,
    acc = 0,
    raf = 0;
const keys = new Set<string>();
function attack() {
    if (tick >= 0) {
        queued = true;
        $('log').textContent = '새 공격 입력 저장 · 회복 후 한 번 실행';
    } else {
        tick = 0;
        attackId++;
        seen.clear();
    }
    running = true;
    $('play').textContent = '일시 정지';
    draw();
}
function reset() {
    tick = -1;
    attackId = 0;
    naive = 0;
    deduped = 0;
    seen.clear();
    queued = false;
    stopUntil = 0;
    realTime = 0;
    gameTime = 0;
    attackerX = 100;
    running = true;
    acc = 0;
    $('play').textContent = '일시 정지';
    $('log').textContent = '공격 버튼 또는 한 틱으로 시작하세요.';
    draw();
}
function shapes() {
    const enemyX = 100 + number('distance');
    return {
        attack: { x: attackerX + 30, y: 115, w: number('reach'), h: 88 },
        hurts: checked('areas')
            ? [
                  { x: enemyX, y: 112, w: 42, h: 38 },
                  { x: enemyX - 8, y: 154, w: 58, h: 85 },
              ]
            : [{ x: enemyX - 8, y: 112, w: 58, h: 127 }],
    };
}
function step() {
    gameTime += 0.05;
    attackerX = Math.max(
        20,
        Math.min(340, attackerX + (keys.has('ArrowRight') ? 5 : 0) - (keys.has('ArrowLeft') ? 5 : 0)),
    );
    if (tick < 0) {
        draw();
        return;
    }
    const round = activeRound(tick, checked('multi')),
        shape = shapes(),
        immune = checked('invulnerable') && tick === 5;
    if (round >= 0) {
        let confirmed = false;
        for (const area of shape.hurts)
            if (overlap(shape.attack, area) && !immune) {
                naive++;
                if (applyHit(attackId, 'enemy-1', round, immune, seen)) {
                    deduped++;
                    confirmed = true;
                }
            }
        if (confirmed) stopUntil = realTime + number('hitstop');
    }
    tick++;
    if (tick >= (checked('multi') ? 20 : 15)) {
        tick = -1;
        if (queued) {
            queued = false;
            tick = 0;
            attackId++;
            seen.clear();
        }
    }
    draw();
}
function draw() {
    ctx.clearRect(0, 0, width, height);
    const s = Math.min((width - 32) / 500, (height - 65) / 300),
        ox = (width - 500 * s) / 2,
        oy = 30;
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(s, s);
    ctx.fillStyle = '#ccd7da';
    ctx.fillRect(0, 240, 500, 8);
    const { attack: area, hurts } = shapes(),
        enemyX = 100 + number('distance');
    ctx.fillStyle = '#718893';
    ctx.beginPath();
    ctx.roundRect(attackerX, 124, 46, 116, 18);
    ctx.fill();
    ctx.fillStyle = '#7ba99d';
    ctx.beginPath();
    ctx.roundRect(enemyX - 8, 112, 58, 128, 20);
    ctx.fill();
    ctx.strokeStyle = '#8d99a3';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(attackerX + 25, 159);
    ctx.lineTo(attackerX + number('reach') + 27, activeRound(tick, checked('multi')) >= 0 ? 165 : 95);
    ctx.stroke();
    const round = activeRound(tick, checked('multi'));
    if (checked('shapes')) {
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#384854';
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(attackerX, 140, 46, 100);
        ctx.setLineDash([]);
        for (const box of hurts) {
            ctx.fillStyle = '#13827322';
            ctx.fillRect(box.x, box.y, box.w, box.h);
            ctx.strokeStyle = '#11776b';
            ctx.strokeRect(box.x, box.y, box.w, box.h);
        }
        if (round >= 0) {
            ctx.fillStyle = '#d8793940';
            ctx.fillRect(area.x, area.y, area.w, area.h);
            ctx.strokeStyle = '#bc632d';
            ctx.strokeRect(area.x, area.y, area.w, area.h);
        }
    }
    text('이동', attackerX, 270, '#53626d', 14);
    text(checked('invulnerable') && tick === 5 ? '무적' : '상대 ID 1', enemyX - 10, 270, '#176f69', 14);
    ctx.restore();
    const total = checked('multi') ? 20 : 15,
        bw = (width - 36) / total;
    for (let t = 0; t < total; t++) {
        ctx.fillStyle =
            t === tick ? '#174d49' : activeRound(t, checked('multi')) >= 0 ? '#d98648' : '#d6e0e2';
        ctx.fillRect(18 + t * bw, height - 25, Math.max(1, bw - 3), 9);
    }
    text(
        tick < 0
            ? '대기'
            : `${tick} 틱 · ${round >= 0 ? `활성 ${round + 1}회차` : tick < 5 ? '준비' : '회복'}`,
        18,
        23,
        '#344651',
        14,
    );
    text(realTime < stopUntil ? '히트스톱 · 입력 수집 계속' : '', width - 195, 23, '#b45f2c', 12);
    $('naive-result').textContent = `${naive} 회 · ${naive * 10} 피해`;
    $('dedupe-result').textContent = `${deduped} 회 · ${deduped * 10} 피해`;
    if (tick >= 0 || attackId > 0)
        $('log').textContent =
            `공격 ID ${attackId} · 게임 ${gameTime.toFixed(2)}s / 실제 ${(realTime / 1000).toFixed(2)}s · ${queued ? '다음 공격 입력 대기' : '대기 입력 없음'}`;
}
function frame(now: number) {
    const elapsed = Math.min(0.1, (now - last) / 1000);
    last = now;
    realTime += elapsed * 1000;
    if (running && realTime >= stopUntil) {
        acc += Math.min(elapsed, (realTime - stopUntil) / 1000);
        while (acc >= 0.05 && realTime >= stopUntil) {
            acc -= 0.05;
            step();
        }
        if (realTime < stopUntil) acc = 0;
    } else acc = 0;
    if (realTime < stopUntil || tick >= 0) draw();
    raf = requestAnimationFrame(frame);
}
$('attack').onclick = attack;
$('play').onclick = () => {
    running = !running;
    $('play').textContent = running ? '일시 정지' : '재생';
};
$('step').onclick = () => {
    running = false;
    $('play').textContent = '재생';
    stopUntil = 0;
    if (tick < 0) {
        tick = 0;
        attackId++;
        seen.clear();
    }
    step();
};
$('reset').onclick = reset;
function move(d: number) {
    attackerX = Math.max(20, Math.min(340, attackerX + d * 10));
    draw();
}
$('left').onclick = () => move(-1);
$('right').onclick = () => move(1);
document.addEventListener('keydown', (e) => {
    if (dialog.open || !settings.hidden || ['INPUT', 'SELECT', 'BUTTON'].includes((e.target as HTMLElement).tagName)) return;
    if (e.code === 'Space') {
        e.preventDefault();
        if (!e.repeat) attack();
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        keys.add(e.key);
    }
});
document.addEventListener('keyup', (e) => keys.delete(e.key));
window.addEventListener('blur', () => keys.clear());
for (const id of ['distance', 'reach', 'hitstop'])
    $<HTMLInputElement>(id).oninput = () => {
        $(`${id}-value`).textContent = `${number(id)} ${id === 'hitstop' ? 'ms' : 'px'}`;
        reset();
    };
for (const id of ['areas', 'invulnerable', 'multi']) $(id).onchange = reset;
$('shapes').onchange = draw;
window.addEventListener('pagehide', (event) => {
    keys.clear();
    if (event.persisted) return;
    cancelAnimationFrame(raf);
    observer.disconnect();
});
window.addEventListener('pageshow', (event) => {
    if (!event.persisted) return;
    last = performance.now();
    acc = 0;
    resize();
});
reset();
raf = requestAnimationFrame((now) => {
    last = now;
    frame(now);
});
