import { createMachine, writeInput, movePc, step, run, guards, commands, type Guard } from './model';
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>('scene'),
    ctx = canvas.getContext('2d')!,
    panel = $('settings'),
    menu = $('menu'),
    dialog = $<HTMLDialogElement>('explanation');
let machine = createMachine(),
    guard: Guard = { ...guards };
const menuMedia = matchMedia('(max-width: 700px)');
function overlayMenu() {
    return menuMedia.matches;
}
function setMenu(open: boolean, moveFocus = true) {
    panel.hidden = !open;
    $('lab').classList.toggle('open', open);
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? '설정 메뉴 닫기' : '설정 메뉴 열기');
    const modal = open && overlayMenu();
    panel.setAttribute('role', modal ? 'dialog' : 'complementary');
    if (modal) panel.setAttribute('aria-modal', 'true');
    else panel.removeAttribute('aria-modal');
    for (const child of Array.from(panel.parentElement!.children)) {
        if (child instanceof HTMLElement && child !== panel && child.tagName !== 'NAV')
            child.inert = modal;
    }
    for (const child of Array.from(menu.parentElement!.children))
        if (child instanceof HTMLElement && child !== menu) child.inert = modal;
    if (moveFocus) (open ? $('close-menu') : menu).focus();
    requestAnimationFrame(draw);
}
menu.addEventListener('click', () => setMenu(Boolean(panel.hidden)));
$('close-menu').addEventListener('click', () => setMenu(false));
$('help').addEventListener('click', () => dialog.showModal());
$('close-dialog').addEventListener('click', () => dialog.close());
document.addEventListener('keydown', (event) => {
    if (dialog.open || panel.hidden) return;
    if (event.key === 'Escape') {
        event.preventDefault();
        setMenu(false);
    } else if (event.key === 'Tab' && overlayMenu()) {
        const controls = Array.from(panel.querySelectorAll<HTMLElement>(
            'button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href]',
        )).filter((control) => control.getClientRects().length > 0);
        const first = controls[0]!, last = controls[controls.length - 1]!;
        if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
            event.preventDefault();
            first.focus();
        }
    }
});
menuMedia.addEventListener('change', () => setMenu(!panel.hidden, !panel.hidden && overlayMenu()));
const value = (id: string) => Number($<HTMLSelectElement>(id).value);
$('write').addEventListener('click', () => {
    machine = writeInput(machine, value('address'), value('input-value'), guard);
    update();
});
$('jump').addEventListener('click', () => {
    machine = movePc(machine, value('target'), guard);
    update();
});
$('step').addEventListener('click', () => {
    machine = step(machine, guard);
    update();
});
$('run').addEventListener('click', () => {
    machine = run(machine, guard);
    update();
});
for (const [id, key] of [
    ['write-guard', 'write'],
    ['execute-guard', 'execute'],
    ['opcode-guard', 'opcode'],
] as const)
    $(id).addEventListener('change', () => {
        guard[key] = $<HTMLInputElement>(id).checked;
        update();
    });
$('budget').addEventListener('input', () => {
    guard.budget = Number($<HTMLInputElement>('budget').value);
    update();
});
for (const id of ['input-value', 'address', 'target']) $(id).addEventListener('change', draw);
function reset() {
    machine = createMachine();
    guard = { ...guards };
    $<HTMLSelectElement>('input-value').value = '3';
    $<HTMLSelectElement>('address').value = '8';
    $<HTMLSelectElement>('target').value = '8';
    update();
}
$('reset').addEventListener('click', reset);
for (const id of ['data', 'execute', 'loop'])
    $(`${id}-preset`).addEventListener('click', () => {
        reset();
        const number = id === 'loop' ? 4 : 3;
        machine = writeInput(machine, 8, number, guard);
        if (id !== 'data') machine = movePc(machine, 8, guard);
        $<HTMLSelectElement>('input-value').value = String(number);
        update();
    });
function update() {
    for (const [id, key] of [
        ['write-guard', 'write'],
        ['execute-guard', 'execute'],
        ['opcode-guard', 'opcode'],
    ] as const)
        $<HTMLInputElement>(id).checked = guard[key];
    $<HTMLInputElement>('budget').value = String(guard.budget);
    $('budget-value').textContent = `${guard.budget}단계`;
    $('metric-0').textContent = String(machine.pc).padStart(2, '0');
    $('metric-1').textContent = String(machine.memory[8]);
    $('metric-2').textContent = `${machine.steps} / ${guard.budget}`;
    $('metric-3').textContent = machine.scene ? '새 장면' : '기본 장면';
    $('summary').textContent = machine.status;
    $('log').replaceChildren(
        ...machine.trace.map((text) => {
            const p = document.createElement('p');
            p.textContent = text;
            return p;
        }),
    );
    draw();
}
function draw() {
    const r = canvas.getBoundingClientRect();
    if (!r.width) return;
    const d = Math.min(devicePixelRatio, 2);
    canvas.width = r.width * d;
    canvas.height = r.height * d;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    const w = r.width,
        h = r.height,
        cols = w < 500 ? 4 : 8,
        size = Math.min((w - 30) / cols, 75),
        gap = 6,
        top = 205;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = machine.scene ? '#f3e4d4' : '#deebe6';
    ctx.beginPath();
    ctx.roundRect(12, 15, w - 24, 160, 16);
    ctx.fill();
    ctx.fillStyle = machine.scene ? '#dea06a' : '#9bbcab';
    ctx.beginPath();
    ctx.moveTo(12, 130);
    ctx.lineTo(w * 0.3, 70);
    ctx.lineTo(w * 0.6, 130);
    ctx.lineTo(w * 0.85, 86);
    ctx.lineTo(w - 12, 130);
    ctx.lineTo(w - 12, 175);
    ctx.lineTo(12, 175);
    ctx.fill();
    ctx.strokeStyle = '#779989';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(22, 147);
    ctx.lineTo(w - 22, 147);
    ctx.stroke();
    const avatar = 35 + (machine.position / 5) * (w - 85);
    ctx.fillStyle = '#147c76';
    ctx.beginPath();
    ctx.roundRect(avatar, 116, 18, 28, 7);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(avatar + 9, 107, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '12px -apple-system,sans-serif';
    ctx.fillStyle = '#3b5b61';
    ctx.textAlign = 'left';
    ctx.fillText(machine.scene ? '명령 3 실행 → 새 장면' : '기본 장면 · PC 실행 전에는 그대로', 24, 38);
    ctx.textAlign = 'right';
    ctx.fillText(`점수 ${machine.memory[8]}`, w - 25, 61);
    if (machine.scene) {
        ctx.fillStyle = '#d88236';
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
            const a = -Math.PI / 2 + (i * Math.PI) / 5,
                rr = i % 2 ? 12 : 26;
            const x = w * 0.66 + Math.cos(a) * rr,
                y = 90 + Math.sin(a) * rr;
            i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
    }
    ctx.textAlign = 'left';
    ctx.fillStyle = '#557379';
    ctx.font = '11px -apple-system,sans-serif';
    ctx.fillText('메모리 00–07: 명령 / 08–15: 데이터', 15, top - 12);
    const left = (w - cols * size) / 2;
    for (let i = 0; i < 16; i++) {
        const x = left + (i % cols) * size,
            y = top + Math.floor(i / cols) * 58;
        ctx.fillStyle = i < 8 ? '#dfebe9' : '#f0e7da';
        ctx.strokeStyle = i === machine.pc ? '#dd8547' : i === value('address') ? '#17877e' : '#c5d7d7';
        ctx.lineWidth = i === machine.pc ? 3 : 1;
        ctx.beginPath();
        ctx.roundRect(x + gap / 2, y, size - gap, 50, 8);
        ctx.fill();
        ctx.stroke();
        ctx.textAlign = 'left';
        ctx.font = '10px -apple-system,sans-serif';
        ctx.fillStyle = '#6d8587';
        ctx.fillText(String(i).padStart(2, '0'), x + 8, y + 13);
        ctx.textAlign = 'center';
        ctx.font = 'bold 19px -apple-system,sans-serif';
        ctx.fillStyle = '#355b60';
        ctx.fillText(String(machine.memory[i]), x + size / 2, y + 37);
    }
    if (w >= 500) {
        ctx.textAlign = 'center';
        ctx.font = '12px -apple-system,sans-serif';
        ctx.fillStyle = '#d48143';
        ctx.fillText(
            `PC ${machine.pc} → ${commands[machine.memory[machine.pc]!] ?? '미정의 숫자'}`,
            w / 2,
            top + 153,
        );
        ctx.fillStyle = '#6d8587';
        ctx.fillText('0 정지 · 1 점수 · 2 이동 · 3 장면 · 4 반복', w / 2, top + 180);
    }
}
const observer = new ResizeObserver(draw);
observer.observe(canvas);
setMenu(!menuMedia.matches, false);
update();
window.addEventListener('pageshow', () => {
    setMenu(!panel.hidden, false);
    draw();
});
