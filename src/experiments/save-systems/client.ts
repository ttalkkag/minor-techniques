import { MemorySave, initial, copy, recover, validate, packFlags, reverseCompletion } from './model';
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
function menu(open: boolean) {
    const panel = el('settings');
    panel.hidden = !open;
    el('backdrop').hidden = !open;
    el('menu').setAttribute('aria-expanded', String(open));
    for (const sibling of panel.parentElement!.children) {
        if (
            sibling instanceof HTMLElement &&
            !['settings', 'backdrop', 'explanation'].includes(sibling.id)
        )
            sibling.inert = open;
    }
    document.body.style.overflow = open ? 'hidden' : '';
    (open ? el('close') : el('menu')).focus();
}
function boot(draw: () => void) {
    on('menu', 'click', () => menu(Boolean(el('settings').hidden)));
    on('close', 'click', () => menu(false));
    on('backdrop', 'click', () => menu(false));
    on('help', 'click', () => (el('explanation') as HTMLDialogElement).showModal());
    on('explain-close', 'click', () => (el('explanation') as HTMLDialogElement).close());
    document.addEventListener(
        'keydown',
        (event) => {
            const panel = el('settings');
            if (panel.hidden || (el('explanation') as HTMLDialogElement).open) return;
            if (event.key === 'Escape') {
                event.preventDefault();
                menu(false);
            } else if (event.key === 'Tab') {
                const controls = Array.from(
                    panel.querySelectorAll<HTMLElement>(
                        'button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href]',
                    ),
                ).filter((control) => control.getClientRects().length > 0);
                const first = controls[0]!,
                    last = controls.at(-1)!;
                if (
                    !panel.contains(document.activeElement) ||
                    (event.shiftKey && document.activeElement === first)
                ) {
                    event.preventDefault();
                    (event.shiftKey ? last : first).focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
            }
        },
        { signal: abort.signal },
    );
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
let machine = new MemorySave();
let game = initial();
function draw() {
    const supported = +select('reader').value,
        recovery = recover(machine.slots, supported),
        selected = recovery.selected;
    el('metric-0').textContent = selected
        ? `${selected.slot} · 세대 ${selected.result.value.generation}`
        : '복구 불가';
    el('metric-1').textContent =
        `${machine.job ? `${machine.job.slot} ${machine.job.phase}/5` : '없음'} / ${machine.queue.length}개`;
    el('metric-2').textContent = `위치 ${game.x} · 가방 ${game.items.length}개`;
    el('summary').textContent = machine.log;
    const flags = packFlags(game.flags);
    el('save-info').textContent =
        `현재 이벤트 바이트 ${flags.map((byte) => byte.toString(2).padStart(8, '0')).join(' ')} = ${flags.join(', ')} · 2B. 동일 16개 0/1 배열의 JSON은 ${new TextEncoder().encode(JSON.stringify(Array.from({ length: 16 }, (_, i) => (game.flags >>> i) & 1))).length}B. RNG ${game.rng}.`;
    (el('step') as HTMLButtonElement).disabled = !machine.job;
    ctx.clearRect(0, 0, w, h);
    rect(12, 12, w - 24, 88, '#f8fbfc', 13);
    text('플레이 중인 상태 · 저장 요청 순간 복사', 25, 35, '#446b74', w < 500 ? 11 : 13);
    line(29, 78, w - 29, 78, '#bed3d7', false, 5);
    const px = 30 + (game.x / 100) * (w - 60);
    dot(px, 56, 7, '#1e9787');
    rect(px - 6, 64, 12, 14, '#1e9787', 3);
    const chestX = w - 94,
        gateX = w - 44;
    rect(chestX, 59, 24, 18, game.flags & 1 ? '#c5d7da' : '#d79b60', 3);
    text(game.flags & 1 ? '받음' : '상자', chestX - 1, 53, '#8b7152', 10);
    if (!(game.flags & 8)) rect(gateX, 45, 7, 32, '#7f98a2', 1);
    else line(gateX, 47, gateX + 13, 47, '#a3bcc3', false, 4);
    const mobile = w < 620,
        panelW = mobile ? w - 24 : (w - 42) / 2,
        panelH = mobile ? (h - 137) / 2 : h - 133;
    for (let i = 0; i < 2; i++) {
        const slot = i === 0 ? 'A' : 'B',
            raw = machine.slots[slot],
            validation = validate(raw, supported);
        const x = mobile ? 12 : 14 + i * (panelW + 14),
            y = 113 + (mobile ? i * (panelH + 9) : 0);
        const color = validation.ok ? '#258e7f' : raw ? '#cf8a4e' : '#8ca6af';
        rect(x, y, panelW, panelH, '#f8fbfc', 12);
        text(`슬롯 ${slot}${selected?.slot === slot ? ' · 복원 선택' : ''}`, x + 14, y + 25, color, 16);
        text(
            validation.ok
                ? `세대 ${validation.value.generation} · 버전 ${validation.value.version} · 정상`
                : validation.error,
            x + 14,
            y + 47,
            color,
            11,
            panelW - 25,
        );
        text(`${new TextEncoder().encode(raw).length}바이트 기록됨`, x + 14, y + 68, '#76919a', 10);
        const phase = machine.job?.slot === slot ? machine.job.phase : validation.ok ? 5 : raw ? 1 : 0;
        const part = (panelW - 30) / 5;
        for (let n = 0; n < 5; n++)
            rect(x + 14 + n * part, y + 80, part - 4, 8, n < phase ? color : '#e2ebed', 3);
        const preview =
            raw.length > (mobile ? 30 : 52)
                ? raw.slice(0, mobile ? 30 : 52) + '…'
                : raw || '(아직 기록 없음)';
        text(preview, x + 14, y + 111, '#6b8690', 10, panelW - 28);
        if (!mobile && validation.ok) {
            text(`복원 위치 ${validation.value.game.x}`, x + 14, y + 147, '#4b737d', 14);
            text(
                `가방: ${validation.value.game.items.join(', ') || '비어 있음'}`,
                x + 14,
                y + 174,
                '#4b737d',
                12,
                panelW - 28,
            );
            text('헤더 → 본문 → 검사값 → 검증', x + 14, y + panelH - 21, '#72919a', 11, panelW - 28);
        }
    }
}
function reset() {
    machine = new MemorySave();
    game = initial();
    select('version').value = '2';
    select('reader').value = '2';
    select('fault').value = 'checksum';
    input('consistent').checked = true;
    input('queued').checked = true;
    draw();
}
on('chest', 'click', () => {
    if (!(game.flags & 1)) {
        game.items.push('보석');
        game.flags |= 1;
        game.rng = (Math.imul(game.rng, 1664525) + 1013904223) >>> 0;
        machine.log = '보석 지급과 상자 플래그를 같은 상태에 적용했습니다.';
    } else machine.log = '이미 받은 상자: 보상을 다시 지급하지 않습니다.';
    draw();
});
on('move', 'click', () => {
    game.x = (game.x + 3) % 100;
    machine.log = '플레이어가 이동했습니다. 진행 중인 저장 스냅샷은 바뀌지 않습니다.';
    draw();
});
on('gate', 'click', () => {
    game.flags ^= 8;
    machine.log = `문을 ${game.flags & 8 ? '열었습니다' : '닫았습니다'}.`;
    draw();
});
on('request', 'click', () => {
    const snapshot = copy(game);
    if (!input('consistent').checked && snapshot.flags & 1)
        snapshot.items = snapshot.items.filter((item) => item !== '보석');
    machine.request(snapshot, +select('version').value);
    draw();
});
on('step', 'click', () => {
    machine.step();
    draw();
});
on('recover', 'click', () => {
    const result = machine.interrupt(+select('reader').value);
    if (result.selected) game = copy(result.selected.result.value.game);
    draw();
});
on('reader', 'change', draw);
on('corrupt', 'click', () => {
    machine.job = null;
    machine.queue = [];
    const fault = select('fault').value;
    if (fault === 'both') {
        machine.slots.A = '손상';
        machine.slots.B = '손상';
    } else {
        const slot =
            Number(machine.slots.B.split('|')[1] || 0) > Number(machine.slots.A.split('|')[1] || 0)
                ? 'B'
                : 'A';
        const raw = machine.slots[slot];
        machine.slots[slot] =
            fault === 'truncate'
                ? raw.slice(0, Math.floor(raw.length / 2))
                : raw.slice(0, -1) + (raw.endsWith('0') ? '1' : '0');
    }
    machine.log = '손상을 적용했습니다. 중단 후 복구로 남은 정상본을 확인하세요.';
    menu(false);
    draw();
});
on('race', 'click', () => {
    machine = reverseCompletion(input('queued').checked, game);
    menu(false);
    draw();
});
on('reset', 'click', reset);
boot(draw);
