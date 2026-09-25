import { defaults, plants, grassMetrics, type GrassOptions } from './model';
const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const root = byId('vc-lab'),
    panel = byId('vc-settings'),
    menu = byId<HTMLButtonElement>('vc-menu');
const dialog = byId<HTMLDialogElement>('vc-dialog'),
    canvas = byId<HTMLCanvasElement>('vc-canvas');
const ctx = canvas.getContext('2d')!;
let options: GrassOptions = { ...defaults },
    time = 1,
    cards = false,
    playing = false,
    frame = 0,
    last = 0;
const toggles = [
    'culling',
    'lod',
    'instancing',
    'safeBounds',
    'synchronized',
    'shadows',
    'reuseMain',
] as const;
const numeric = ['camera', 'padding', 'wind'] as const;
const menuMedia = matchMedia('(max-width: 700px)');
const menuBackground = Array.from(document.querySelectorAll<HTMLElement>('.scene-area, nav > a, #vc-help'));
function menuControls() {
    return Array.from(panel.querySelectorAll<HTMLElement>('button, input, select, a[href]'))
        .filter((control) => control.getClientRects().length && !control.hasAttribute('disabled'));
}
function syncMenu() {
    const modal = !panel.hidden && menuMedia.matches;
    for (const element of menuBackground) element.inert = modal;
    panel.setAttribute('role', modal ? 'dialog' : 'complementary');
    if (modal) panel.setAttribute('aria-modal', 'true');
    else panel.removeAttribute('aria-modal');
}
function trapMenu(event: KeyboardEvent) {
    if (dialog.open || panel.hidden || !menuMedia.matches || event.key !== 'Tab') return;
    const controls = menuControls(), first = controls[0], last = controls.at(-1);
    if (!first || !last) return;
    if (!panel.contains(document.activeElement) || (event.shiftKey ? document.activeElement === first : document.activeElement === last)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
    }
}
menuMedia.addEventListener('change', () => {
    syncMenu();
    if (!panel.hidden && menuMedia.matches && !dialog.open) menuControls()[0]?.focus();
});
function setMenu(open: boolean, focus = true) {
    panel.hidden = !open;
    root.classList.toggle('open', open);
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? '설정 메뉴 닫기' : '설정 메뉴 열기');
    syncMenu();
    if (focus) (open ? menuControls()[0] : menu)?.focus();
    requestAnimationFrame(draw);
}
menu.addEventListener('click', () => setMenu(Boolean(panel.hidden)));
byId('vc-close').addEventListener('click', () => setMenu(false));
byId('vc-help').addEventListener('click', () => dialog.showModal());
byId('vc-dialog-close').addEventListener('click', () => dialog.close());
const keydown = (e: KeyboardEvent) => {
    if (dialog.open) return;
    if (e.key === 'Escape' && !panel.hidden) {
        e.preventDefault();
        setMenu(false);
    }
    trapMenu(e);
};
document.addEventListener('keydown', keydown);
for (const key of toggles)
    byId<HTMLInputElement>(`vc-${key}`).addEventListener('change', (e) => {
        options[key] = (e.target as HTMLInputElement).checked;
        update();
    });
for (const key of numeric)
    byId<HTMLInputElement>(`vc-${key}`).addEventListener('input', (e) => {
        options[key] = Number((e.target as HTMLInputElement).value);
        update();
    });
byId<HTMLInputElement>('vc-cards').addEventListener('change', (e) => {
    cards = (e.target as HTMLInputElement).checked;
    draw();
});
function stop() {
    playing = false;
    cancelAnimationFrame(frame);
    byId('vc-play').textContent = '바람 재생';
    byId('vc-play').setAttribute('aria-pressed', 'false');
}
byId('vc-reset').addEventListener('click', () => {
    stop();
    options = { ...defaults };
    time = 1;
    cards = false;
    byId<HTMLInputElement>('vc-cards').checked = false;
    update();
});
byId('vc-optimized').addEventListener('click', () => {
    stop();
    options = { ...defaults, culling: true, lod: true, instancing: true, wind: 0, safeBounds: true };
    time = 1;
    update();
});
byId('vc-wind-preset').addEventListener('click', () => {
    stop();
    options = { ...defaults, culling: true, wind: 1, safeBounds: false };
    time = 1;
    update();
});
byId<HTMLInputElement>('vc-time').addEventListener('input', (e) => {
    stop();
    time = Number((e.target as HTMLInputElement).value);
    update();
});
function animate(stamp: number) {
    if (!playing) return;
    time = (time + Math.min((stamp - last) / 1000, 0.05)) % (Math.PI * 2);
    last = stamp;
    update(false);
    frame = requestAnimationFrame(animate);
}
byId('vc-play').addEventListener('click', () => {
    if (playing) {
        stop();
        update();
        return;
    }
    playing = true;
    last = performance.now();
    byId('vc-play').textContent = '바람 일시 정지';
    byId('vc-play').setAttribute('aria-pressed', 'true');
    frame = requestAnimationFrame(animate);
});
function update(announce = true) {
    for (const key of toggles) byId<HTMLInputElement>(`vc-${key}`).checked = options[key];
    for (const key of numeric) {
        byId<HTMLInputElement>(`vc-${key}`).value = String(options[key]);
        byId(`vc-${key}-value`).textContent =
            key === 'padding' ? `${Math.round(options[key] * 100)}%` : `${options[key].toFixed(2)} m`;
    }
    byId<HTMLInputElement>('vc-time').value = String(time);
    byId('vc-time-value').textContent = `${time.toFixed(2)} rad`;
    const m = grassMetrics(options, time),
        fmt = (n: number) => n.toLocaleString('ko-KR');
    byId('vc-commands').textContent = fmt(m.commands);
    byId('vc-submitted').textContent = `1,000 중 ${fmt(m.submitted)}포기 제출`;
    byId('vc-triangles').textContent = fmt(m.triangles);
    byId('vc-lod-detail').textContent = `8tri × ${m.near} + 2tri × ${m.far}`;
    byId('vc-fragments').textContent = fmt(m.fragments);
    byId('vc-shadow').textContent = fmt(m.shadowTriangles);
    byId('vc-shadow-count').textContent = `별도 ${m.shadowCount}포기 × 2tri`;
    byId('vc-summary').setAttribute('aria-live', announce ? 'polite' : 'off');
    byId('vc-summary').textContent =
        `컬링 누락 ${m.missing}포기 · 그림자 누락 ${m.lostShadows}포기. ${m.missing ? '바람으로 화면에 들어오는 잎까지 bounds에 포함하세요.' : m.lostShadows ? '주 카메라 밖의 그림자 제공자가 사라졌습니다.' : options.shadows ? '현재 장면의 필요한 풀과 그림자가 유지됩니다.' : '그림자 패스가 꺼져 있습니다.'}`;
    draw();
}
function draw() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = Math.min(devicePixelRatio, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = rect.width,
        h = rect.height,
        wide = w > 650,
        m = grassMetrics(options, time);
    ctx.clearRect(0, 0, w, h);
    const view = { x: 14, y: 36, w: wide ? w - 225 : w - 28, h: wide ? h - 62 : h - 160 };
    const px = (x: number) => view.x + ((x - options.camera + 5) / 10) * view.w;
    const py = (z: number) => view.y + 25 + ((20 - z) / 20) * (view.h - 40);
    ctx.fillStyle = '#e0ebe4';
    ctx.fillRect(view.x, view.y, view.w, view.h);
    const gradient = ctx.createLinearGradient(0, view.y, 0, view.y + view.h);
    gradient.addColorStop(0, '#d7e6de');
    gradient.addColorStop(1, '#edf2e4');
    ctx.fillStyle = gradient;
    ctx.fillRect(view.x, view.y, view.w, view.h);
    ctx.font = '11px -apple-system,sans-serif';
    ctx.fillStyle = '#5b7478';
    ctx.textAlign = 'left';
    ctx.fillText('카메라 화면 · 직교 투영', view.x, 22);
    ctx.save();
    ctx.beginPath();
    ctx.rect(view.x, view.y, view.w, view.h);
    ctx.clip();
    for (let row = 0; row <= 20; row += 5) {
        ctx.strokeStyle = '#a9c4b64a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(view.x, py(row));
        ctx.lineTo(view.x + view.w, py(row));
        ctx.stroke();
    }
    if (options.lod) {
        ctx.setLineDash([4, 5]);
        ctx.strokeStyle = '#358a80';
        ctx.beginPath();
        ctx.moveTo(view.x, py(5));
        ctx.lineTo(view.x + view.w, py(5));
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#337d76';
        ctx.fillText('LOD 전환 · 5m', view.x + 8, py(5) - 7);
    }
    if (options.shadows)
        for (let i = 0; i < plants.length; i++) {
            const p = plants[i]!,
                s = m.states[i]!;
            if (!s.shadowNeeded) continue;
            ctx.beginPath();
            ctx.moveTo(px(p.x), py(p.z));
            ctx.lineTo(px(p.x + 1.6 - s.half), py(p.z) + 7);
            ctx.lineTo(px(p.x + 1.6 + s.half), py(p.z) + 7);
            ctx.closePath();
            if (s.shadowSubmitted) {
                ctx.fillStyle = '#496b5720';
                ctx.fill();
            } else {
                ctx.strokeStyle = '#d78a4c88';
                ctx.setLineDash([2, 3]);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }
    for (let i = plants.length - 1; i >= 0; i--) {
        const p = plants[i]!,
            s = m.states[i]!;
        if (!s.visible) continue;
        const missing = !s.submitted,
            baseX = px(p.x),
            baseY = py(p.z),
            height = (45 / 600) * view.h,
            wind = (s.displacement / 10) * view.w;
        const count = s.low ? 1 : 4;
        if (cards && !missing) {
            ctx.fillStyle = s.low ? '#63aba515' : '#24856315';
            for (let card = 0; card < count; card++) {
                ctx.beginPath();
                ctx.moveTo(px(p.x - s.half), baseY);
                ctx.lineTo(px(p.x + s.half), baseY);
                ctx.lineTo(px(p.x + s.half) + wind, baseY - height);
                ctx.lineTo(px(p.x - s.half) + wind, baseY - height);
                ctx.closePath();
                ctx.fill();
            }
        }
        for (let blade = 0; blade < count; blade++) {
            const spread = count === 1 ? 0 : (blade - 1.5) * view.w * 0.0034;
            const bladeHeight = height * (count === 1 ? 1 : 0.75 + blade * 0.09);
            ctx.beginPath();
            ctx.moveTo(baseX - view.w * 0.004, baseY);
            ctx.quadraticCurveTo(
                baseX + wind * 0.45 + spread,
                baseY - bladeHeight * 0.5,
                baseX + wind + spread,
                baseY - bladeHeight,
            );
            ctx.quadraticCurveTo(
                baseX + wind * 0.55 + spread,
                baseY - bladeHeight * 0.4,
                baseX + view.w * 0.004,
                baseY,
            );
            ctx.closePath();
            if (missing) {
                ctx.strokeStyle = '#da864a';
                ctx.lineWidth = 1;
                ctx.stroke();
            } else {
                ctx.fillStyle = s.low ? '#67a99a' : blade % 2 ? '#428765' : '#2c7156';
                ctx.fill();
            }
        }
    }
    ctx.restore();
    ctx.strokeStyle = '#c2d5cf';
    ctx.lineWidth = 1;
    ctx.strokeRect(view.x, view.y, view.w, view.h);
    const map = {
        x: wide ? w - 190 : 18,
        y: wide ? 70 : h - 108,
        w: wide ? 170 : w - 36,
        h: wide ? Math.min(210, h - 160) : 74,
    };
    ctx.fillStyle = '#dce6e5';
    ctx.fillRect(map.x, map.y, map.w, map.h);
    ctx.fillStyle = '#607b7e';
    ctx.font = '11px -apple-system,sans-serif';
    ctx.fillText('전체 1,000포기 · 제출 지도', map.x, map.y - 13);
    const mx = (x: number) => map.x + ((x + 12.5) / 25) * map.w,
        my = (z: number) => map.y + ((20 - z) / 20) * map.h;
    ctx.fillStyle = '#16897c16';
    ctx.fillRect(mx(options.camera - 5), map.y, (10 / 25) * map.w, map.h);
    for (let i = 0; i < plants.length; i++) {
        const p = plants[i]!,
            s = m.states[i]!;
        ctx.fillStyle = !s.submitted ? '#acbcba' : s.low ? '#64a496' : '#3d8168';
        ctx.fillRect(mx(p.x) - 1, my(p.z) - 1, wide ? 2 : 1.7, wide ? 2 : 1.7);
    }
    ctx.strokeStyle = '#137f78';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(mx(options.camera - 5), map.y, (10 / 25) * map.w, map.h);
    if (options.culling && options.safeBounds) {
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = '#dc8a4d';
        ctx.strokeRect(
            mx(options.camera - 5 - options.wind),
            map.y,
            ((10 + 2 * options.wind) / 25) * map.w,
            map.h,
        );
        ctx.setLineDash([]);
    }
    ctx.fillStyle = '#6b8387';
    ctx.font = '10px -apple-system,sans-serif';
    ctx.fillText('청록 테두리 = 카메라 범위', map.x, map.y + map.h + 18);
    if (wide) {
        ctx.fillText(`제출 ${m.submitted} / 누락 ${m.missing}`, map.x, map.y + map.h + 42);
        ctx.fillText('주황 점선 = 바람 bounds', map.x, map.y + map.h + 61);
    }
}
const observer = new ResizeObserver(draw);
observer.observe(canvas);
setMenu(!menuMedia.matches, false);
update();
const onVisibility = () => {
    if (document.hidden) stop();
};
document.addEventListener('visibilitychange', onVisibility);
window.addEventListener('pagehide', (event) => {
    stop();
    observer.disconnect();
    if (!event.persisted) {
        document.removeEventListener('keydown', keydown);
        document.removeEventListener('visibilitychange', onVisibility);
    }
});
window.addEventListener('pageshow', () => {
    observer.observe(canvas);
    syncMenu();
    draw();
});
