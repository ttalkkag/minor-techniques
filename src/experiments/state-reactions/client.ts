const get = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const input = (id: string) => get<HTMLInputElement>(id);
const number = (id: string) => Number(input(id).value);
const text = (id: string, value: string) => {
    const element = get(id);
    if (element.textContent !== value) element.textContent = value;
};
const settings = get('settings');
const menu = get<HTMLButtonElement>('menu');
const dialog = get<HTMLDialogElement>('explanation');
const background = [
    ...Array.from(settings.parentElement!.children).filter(
        (element) => element !== settings && element !== menu.parentElement && element !== dialog,
    ),
    ...Array.from(menu.parentElement!.children).filter((element) => element !== menu),
] as HTMLElement[];
function closeMenu(returnFocus = true) {
    if (settings.hidden) return;
    settings.hidden = true;
    menu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-label', '설정 메뉴 열기');
    background.forEach((element) => (element.inert = false));
    document.body.style.overflow = '';
    if (returnFocus) menu.focus();
}
menu.addEventListener('click', () => {
    if (!settings.hidden) return closeMenu();
    settings.hidden = false;
    settings.scrollTop = 0;
    menu.setAttribute('aria-expanded', 'true');
    menu.setAttribute('aria-label', '설정 메뉴 닫기');
    background.forEach((element) => (element.inert = true));
    document.body.style.overflow = 'hidden';
    get('close-menu').focus();
});
get('close-menu').addEventListener('click', () => closeMenu());
get('explain').addEventListener('click', () => dialog.showModal());
get('close-explain').addEventListener('click', () => dialog.close());
window.addEventListener('keydown', (event) => {
    if (settings.hidden || dialog.open) return;
    if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu();
    } else if (event.key === 'Tab') {
        const controls = Array.from(
            settings.querySelectorAll<HTMLElement>('button, input, select, a[href]'),
        ).filter((element) => !element.hasAttribute('disabled') && element.getClientRects().length);
        const first = controls[0],
            last = controls[controls.length - 1];
        if (event.shiftKey && (document.activeElement === first || !settings.contains(document.activeElement))) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !settings.contains(document.activeElement))) {
            event.preventDefault();
            first.focus();
        }
    }
});
import { initialWorld, removeBody, stepWorld, type Contact } from './model';
const scene = document.getElementById('scene') as unknown as SVGSVGElement;
let world = initialWorld(),
    selected = 0,
    timer = 0;
function draw() {
    const target = world.bodies.find((b) => b.id === selected);
    text('dry-out', `${number('dry')}틱`);
    text('budget-out', `${number('budget')}건`);
    text('queue-readout', `${world.tick}틱 / ${world.queue.length}건`);
    text('event-readout', `${world.transitions}회 / ${world.notifications}회`);
    text(
        'selected-readout',
        target
            ? `${target.id + 1}번 · ${target.flammable ? '나무' : '돌'} · ${target.burning ? '불붙음' : target.wet ? `젖음 ${target.wet}틱` : '마름'}`
            : '대상 없음',
    );
    text(
        'summary',
        `${input('policy').value === 'water' ? '물 우선 처리' : '도착 순서 처리'} · 점화 ${world.bodies.filter((b) => b.burning).length}개 / 젖음 ${world.bodies.filter((b) => b.wet).length}개 · 입력을 추가한 뒤 한 틱을 실행하세요.`,
    );
    let html = '<rect x="20" y="8" width="960" height="390" rx="25" fill="#e5edef"/>';
    for (let i = 0; i < world.bodies.length; i++)
        for (let j = i + 1; j < world.bodies.length; j++) {
            const a = world.bodies[i],
                b = world.bodies[j];
            if (Math.hypot(a.x - b.x, a.y - b.y) < 270)
                html += `<path d="M${a.x} ${a.y}L${b.x} ${b.y}" stroke="#9cb6ba" stroke-width="3" stroke-dasharray="8 7"/>`;
        }
    for (const b of world.bodies) {
        const color = b.burning ? '#e29858' : b.wet ? '#95cbd1' : b.flammable ? '#c2a58b' : '#9caeb3';
        html += `<g data-body="${b.id}" style="cursor:pointer"><rect x="${b.x - 44}" y="${b.y - 46}" width="88" height="92" rx="20" fill="${color}" stroke="${b.id === selected ? '#0f7073' : '#eff5f5'}" stroke-width="${b.id === selected ? 5 : 2}"/><text x="${b.x}" y="${b.y - 11}" text-anchor="middle" font-size="22">${b.id + 1}</text><text x="${b.x}" y="${b.y + 16}" text-anchor="middle" font-size="16">${b.burning ? '불붙음' : b.wet ? `젖음 ${b.wet}` : b.flammable ? '마른 나무' : '돌'}</text></g>`;
        const pending = world.queue.filter((e) => e.target === b.id);
        if (pending.length)
            html += `<text x="${b.x}" y="${b.y + 71}" text-anchor="middle" font-size="14">${pending
                .map((e) => (e.kind === 'fire' ? '불' : '물'))
                .slice(0, 5)
                .join(' + ')}${pending.length > 5 ? '…' : ''}</text>`;
    }
    scene.innerHTML = html;
    const objectList = get('object-list');
    for (const button of objectList.querySelectorAll<HTMLButtonElement>('button[data-body]'))
        if (!world.bodies.some((body) => body.id === Number(button.dataset.body))) button.remove();
    for (const [index, body] of world.bodies.entries()) {
        let button = objectList.querySelector<HTMLButtonElement>(`button[data-body="${body.id}"]`);
        if (!button) {
            button = document.createElement('button');
            button.dataset.body = String(body.id);
            button.textContent = `${body.id + 1}번 선택`;
            objectList.insertBefore(button, objectList.children[index] || null);
        }
        button.setAttribute('aria-pressed', String(body.id === selected));
    }
    get('log').textContent = world.log.length
        ? world.log.join(' | ')
        : '사건 기록 · 접촉을 추가하면 다음 실행 틱에서 처리합니다.';
    if (target) input('material').value = target.flammable ? 'wood' : 'stone';
}
function enqueue(kinds: Contact['kind'][]) {
    if (!world.bodies.some((b) => b.id === selected)) return;
    for (const kind of kinds) world.queue.push({ target: selected, kind });
    draw();
}
get('fire').addEventListener('click', () => enqueue(['fire']));
get('water').addEventListener('click', () => enqueue(['water']));
get('both').addEventListener('click', () =>
    enqueue(input('order').value === 'wf' ? ['water', 'fire'] : ['fire', 'water']),
);
function step() {
    stepWorld(world, input('policy').value, number('dry'), number('budget'), input('spread').checked);
    draw();
}
get('step').addEventListener('click', step);
get('play').addEventListener('click', () => {
    if (timer) {
        clearInterval(timer);
        timer = 0;
        text('play', '자동 실행');
    } else {
        timer = window.setInterval(step, 650);
        text('play', '일시정지');
    }
});
function select(event: Event) {
    const body = (event.target as Element).closest('[data-body]');
    if (body) {
        selected = Number(body.getAttribute('data-body'));
        draw();
    }
}
scene.addEventListener('click', select);
get('object-list').addEventListener('click', select);
get('remove').addEventListener('click', () => {
    removeBody(world, selected);
    world.log.unshift(`${selected + 1}번 삭제 · 남은 큐 ${world.queue.length}건`);
    selected = world.bodies[0]?.id ?? -1;
    draw();
});
get('material').addEventListener('change', () => {
    const body = world.bodies.find((b) => b.id === selected);
    if (body) {
        body.flammable = input('material').value === 'wood';
        if (!body.flammable) body.burning = false;
    }
    draw();
});
for (const id of ['policy', 'order']) get(id).addEventListener('change', draw);
for (const id of ['dry', 'budget', 'spread']) get(id).addEventListener('input', draw);
function reset(ring = false) {
    clearInterval(timer);
    timer = 0;
    world = initialWorld(ring);
    selected = 0;
    text('play', '자동 실행');
    draw();
}
get('ring').addEventListener('click', () => reset(true));
get('reset').addEventListener('click', () => {
    input('policy').value = 'water';
    input('order').value = 'wf';
    input('dry').value = '4';
    input('budget').value = '20';
    input('spread').checked = true;
    reset();
});
window.addEventListener('pagehide', () => {
    clearInterval(timer);
    timer = 0;
    text('play', '자동 실행');
    closeMenu(false);
});
window.addEventListener('pageshow', (event) => {
    if (event.persisted) draw();
});
draw();
