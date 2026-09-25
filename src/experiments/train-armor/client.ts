const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const value = (id: string) => Number($<HTMLInputElement>(id).value);
const checked = (id: string) => $<HTMLInputElement>(id).checked;
const choice = (id: string) => $<HTMLSelectElement>(id).value;
const lab = $('lab'),
    panel = $('settings'),
    menu = $('menu'),
    info = $<HTMLDialogElement>('info');
const keys = new Set<string>();
const compact = matchMedia('(max-width: 700px)');
const backdrop = $('menu-backdrop');
const background = [
    lab.querySelector<HTMLElement>('.scene')!,
    lab.querySelector<HTMLElement>('footer')!,
    lab.querySelector<HTMLElement>('header a')!,
    $('explain'),
];
function menuControls() {
    return Array.from(panel.querySelectorAll<HTMLElement>('button, input, select, a[href]'))
        .filter((element) => !element.hasAttribute('disabled') && element.getClientRects().length > 0);
}
function syncMenu() {
    const modal = compact.matches && !panel.hidden;
    backdrop.hidden = !modal;
    background.forEach((element) => {
        element.inert = modal;
    });
    if (modal) {
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-modal', 'true');
    } else {
        panel.setAttribute('role', 'complementary');
        panel.removeAttribute('aria-modal');
    }
}
function setMenu(open: boolean, focus = true) {
    panel.hidden = !open;
    lab.classList.toggle('menu-open', open);
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? '설정 닫기' : '설정 열기');
    keys.clear();
    syncMenu();
    if (focus) {
        if (open) menuControls()[0]?.focus();
        else menu.focus();
    }
}
setMenu(!compact.matches, false);
menu.onclick = () => setMenu(Boolean(panel.hidden));
$('close-menu').onclick = () => setMenu(false);
backdrop.onclick = () => setMenu(false);
compact.addEventListener('change', () => {
    syncMenu();
    if (compact.matches && !panel.hidden && !info.open) menuControls()[0]?.focus();
});
$('explain').onclick = () => {
    keys.clear();
    info.showModal();
    $('info-title').focus();
    info.scrollTop = 0;
};
$('close-info').onclick = () => info.close();
document.addEventListener('keydown', (e) => {
    if (info.open) return;
    if (e.key === 'Escape' && !panel.hidden) {
        e.preventDefault();
        setMenu(false);
    } else if (e.key === 'Tab' && compact.matches && !panel.hidden) {
        const controls = menuControls();
        const first = controls[0], last = controls[controls.length - 1];
        if (e.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
            e.preventDefault();
            last?.focus();
        } else if (!e.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
            e.preventDefault();
            first?.focus();
        }
    }
});
document.querySelectorAll<HTMLInputElement>('input[type="range"]').forEach((input) =>
    input.addEventListener('input', () => {
        const out = document.getElementById(input.id + '-value');
        if (out) out.textContent = input.value;
    }),
);
const accepted = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS', 'Space'];
document.addEventListener('keydown', (e) => {
    if (
        info.open || (compact.matches && !panel.hidden) ||
        (e.target instanceof HTMLElement && e.target.closest('input, select, textarea, button, a'))
    ) return;
    if (accepted.includes(e.code)) {
        e.preventDefault();
        keys.add(e.code);
    }
});
document.addEventListener('keyup', (e) => keys.delete(e.code));
document.querySelectorAll<HTMLButtonElement>('[data-key]').forEach((b) => {
    let keyboardHeld = false;
    b.onpointerdown = (e) => {
        b.setPointerCapture(e.pointerId);
        keys.add(b.dataset.key!);
    };
    b.onpointerup = b.onpointercancel = () => keys.delete(b.dataset.key!);
    b.onkeydown = (e) => {
        if (e.code === 'Enter' || e.code === 'Space') {
            e.preventDefault();
            keyboardHeld = true;
            keys.add(b.dataset.key!);
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
import * as THREE from 'three';
const host = $('webgl');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#e2ecee');
scene.fog = new THREE.Fog('#e2ecee', 45, 95);
const camera = new THREE.PerspectiveCamera(55, 1, 0.05, 140);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
host.append(renderer.domElement);
renderer.domElement.setAttribute('aria-label', '캐릭터 팔에 부착된 객차와 이동 경로의 3D 장면');
scene.add(new THREE.HemisphereLight(0xffffff, 0x638375, 2.4));
const sun = new THREE.DirectionalLight(0xffffff, 2.8);
sun.position.set(15, 24, 6);
scene.add(sun);
function material(color: string, opacity = 1) {
    return new THREE.MeshStandardMaterial({
        color,
        roughness: 0.75,
        transparent: opacity < 1,
        opacity,
        side: THREE.DoubleSide,
    });
}
function box(
    w: number,
    h: number,
    d: number,
    color: string,
    parent: THREE.Object3D,
    x = 0,
    y = 0,
    z = 0,
    opacity = 1,
) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material(color, opacity));
    m.position.set(x, y, z);
    parent.add(m);
    return m;
}
const floor = box(130, 0.15, 130, '#c6d6c5', scene, 0, -0.15, 0);
floor.name = 'ground';
const grid = new THREE.GridHelper(70, 35, 0xa5bdaa, 0xb9cbbb);
scene.add(grid);
const curve = new THREE.CatmullRomCurve3(
    Array.from({ length: 40 }, (_, i) => {
        const t = (i / 40) * Math.PI * 2;
        return new THREE.Vector3(Math.cos(t) * 12, 0, Math.sin(t) * 8);
    }),
    true,
    'catmullrom',
    0.5,
);
for (const shift of [-0.72, 0.72]) {
    const pts = curve.getPoints(150).map((p, i) => {
        const tangent = curve.getTangent(i / 150);
        return new THREE.Vector3(p.x + tangent.z * shift, 0.08, p.z - tangent.x * shift);
    });
    const rail = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false), 200, 0.045, 6, false),
        material('#6a7976'),
    );
    scene.add(rail);
}
for (let i = 0; i < 90; i++) {
    const p = curve.getPoint(i / 90),
        t = curve.getTangent(i / 90);
    const sleeper = box(2, 0.08, 0.18, '#9a8b70', scene, p.x, 0.01, p.z);
    sleeper.rotation.y = Math.atan2(t.x, t.z);
}
for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    box(1.6, 4, 1.6, '#a4b9a2', scene, Math.cos(a) * 21, 2, Math.sin(a) * 16);
}
const actor = new THREE.Group();
scene.add(actor);
const bodyMat = material('#26788a');
const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.6, 4, 8), bodyMat);
body.position.y = 0.8;
actor.add(body);
const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 12, 8), bodyMat);
head.position.y = 1.6;
actor.add(head);
box(0.15, 0.65, 0.18, '#26788a', actor, 0.42, 1, 0);
const attachPoint = new THREE.Group();
attachPoint.position.set(0.52, 1.05, 0);
actor.add(attachPoint);
const anchor = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), material('#e58b40'));
attachPoint.add(anchor);
const axes = new THREE.AxesHelper(2);
attachPoint.add(axes);
const car = new THREE.Group();
scene.add(car);
const shells: THREE.Mesh[] = [];
shells.push(box(2.5, 0.25, 5.8, '#317f77', car, 0, 0.4, 0));
shells.push(box(2.5, 0.18, 5.8, '#22665e', car, 0, 2.6, 0));
for (const side of [-1, 1]) {
    shells.push(box(0.13, 0.75, 5.8, '#368c80', car, side * 1.2, 0.88, 0));
    for (let z = -2.6; z <= 2.6; z += 1.3) {
        shells.push(box(0.15, 1.35, 0.13, '#368c80', car, side * 1.2, 1.84, z));
    }
    shells.push(box(0.07, 1.0, 5.5, '#9bd1d1', car, side * 1.2, 1.82, 0, 0.35));
    for (const z of [-1.9, 1.9]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.16, 16), material('#53605d'));
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(side * 1.25, 0.35, z);
        car.add(wheel);
    }
}
for (const z of [-2.9, 2.9]) {
    shells.push(box(2.5, 0.6, 0.12, '#398c7e', car, 0, 0.85, z));
    shells.push(box(2.5, 0.13, 0.13, '#317f77', car, 0, 2.45, z));
    for (const side of [-1, 1]) shells.push(box(0.15, 1.4, 0.12, '#317f77', car, side * 1.15, 1.8, z));
}
const cabin = new THREE.Group();
actor.add(cabin);
cabin.position.set(0, 1.72, 2.25);
const worldArrow = new THREE.ArrowHelper(
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(),
    3,
    0xe58b40,
    0.65,
    0.4,
);
scene.add(worldArrow);
let progress = 0,
    playing = false,
    attached = true,
    locked = true,
    last = performance.now(),
    raf = 0,
    frozenCamera = new THREE.Vector3(),
    frozenLook = new THREE.Vector3(),
    carWorld = new THREE.Vector3(),
    carQuaternion = new THREE.Quaternion();
const offset = new THREE.Matrix4().makeTranslation(-0.52, -1.05, 0),
    composed = new THREE.Matrix4();
function setPath(t: number) {
    const point = curve.getPoint(t % 1),
        tangent = curve.getTangent(t % 1);
    actor.position.copy(point);
    actor.rotation.y = Math.atan2(tangent.x, tangent.z);
    return { point, tangent };
}
function updateTransforms() {
    const { point, tangent } = setPath(progress);
    attachPoint.rotation.z = (value('joint') * Math.PI) / 180;
    actor.updateMatrixWorld(true);
    const isActor = choice('owner') === 'actor';
    if (isActor && checked('attach')) {
        composed.multiplyMatrices(attachPoint.matrixWorld, offset);
        composed.decompose(car.position, car.quaternion, car.scale);
    } else if (!isActor) {
        car.position.copy(point);
        car.rotation.set(0, Math.atan2(tangent.x, tangent.z), 0);
        car.scale.set(1, 1, 1);
    }
    actor.visible = isActor;
    body.visible = head.visible = checked('xray');
    anchor.visible = axes.visible = checked('xray') && isActor;
    shells.forEach((mesh) => {
        const m = mesh.material as THREE.MeshStandardMaterial;
        const glass = mesh.geometry instanceof THREE.BoxGeometry && mesh.geometry.parameters.width === 0.07;
        m.opacity = checked('xray') ? 0.3 : glass ? 0.35 : 1;
        m.transparent = m.opacity < 1;
        m.depthWrite = m.opacity >= 1;
    });
    worldArrow.position.copy(point).add(new THREE.Vector3(0, 3.1, 0));
    worldArrow.setDirection(tangent);
    worldArrow.visible = choice('view') === 'outside';
    car.getWorldPosition(carWorld);
    car.getWorldQuaternion(carQuaternion);
    const ridePosition = new THREE.Vector3(0, 1.7, 2)
            .applyQuaternion(isActor ? actor.quaternion : carQuaternion)
            .add(isActor ? actor.position : carWorld),
        rideLook = new THREE.Vector3(0, 1.65, 9)
            .applyQuaternion(isActor ? actor.quaternion : carQuaternion)
            .add(isActor ? actor.position : carWorld);
    if (locked && !checked('cameraLock')) {
        frozenCamera.copy(ridePosition);
        frozenLook.copy(rideLook);
    }
    locked = checked('cameraLock');
    attached = checked('attach');
    if (choice('view') === 'ride') {
        camera.position.copy(locked ? ridePosition : frozenCamera);
        camera.lookAt(locked ? rideLook : frozenLook);
    } else {
        const a = (value('orbit') * Math.PI) / 180,
            center = point.clone().lerp(carWorld, 0.5);
        camera.position.copy(center).add(new THREE.Vector3(Math.sin(a) * 15, 10, Math.cos(a) * 15));
        camera.lookAt(center.x, 1.2, center.z);
    }
    const attachmentError = actor.position.distanceTo(carWorld);
    $('readout').textContent =
        `소유자 ${isActor ? '캐릭터' : '독립 객차'} · 경로 ${(progress * 100).toFixed(1)}% · ${isActor ? (attached ? '팔 부착 유지' : '객차 변환 고정') : '객차가 경로를 직접 추적'} · 기준점 거리 ${attachmentError.toFixed(2)}m · 시점 ${choice('view') === 'ride' ? (locked ? '탑승 고정' : '세계에 고정') : '외부 관찰'}`;
}
$('play').onclick = () => {
    playing = !playing;
    $('play').textContent = playing ? '운행 일시정지' : '운행 시작';
};
$<HTMLInputElement>('progress').addEventListener('input', () => {
    progress = value('progress') / 100;
});
$('reset').onclick = () => {
    restoreControls();
    progress = 0;
    playing = false;
    attached = true;
    locked = true;
    car.position.set(12, 0, 0);
    car.rotation.set(0, 0, 0);
    $('play').textContent = '운행 시작';
};
function resizeScene() {
    const w = host.clientWidth,
        h = host.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
}
const resize = new ResizeObserver(resizeScene);
resize.observe(host);
function frame(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (playing && !info.open) {
        progress = (progress + dt * 0.04) % 1;
        $<HTMLInputElement>('progress').value = String(progress * 100);
        $('progress-value').textContent = (progress * 100).toFixed(0);
    }
    updateTransforms();
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
}
raf = requestAnimationFrame(frame);
window.addEventListener('pagehide', (e) => {
    keys.clear();
    playing = false;
    $('play').textContent = '운행 시작';
    cancelAnimationFrame(raf);
    if (e.persisted) return;
    resize.disconnect();
    renderer.dispose();
    scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
            o.geometry.dispose();
            const mats = Array.isArray(o.material) ? o.material : [o.material];
            mats.forEach((m) => m.dispose());
        }
    });
});

window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    last = performance.now();
    syncMenu();
    resize.observe(host);
    resizeScene();
    raf = requestAnimationFrame(frame);
});
