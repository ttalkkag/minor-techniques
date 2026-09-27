import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { arena } from './model';
import type { SceneFrame, View } from './scene-state';

const targetZ = arena.targetZ;
const shooterPosition = new THREE.Vector3(arena.shooterX, 0, arena.shooterZ);
const up = new THREE.Vector3(0, 1, 0);

function material(color: number, options: THREE.MeshStandardMaterialParameters = {}) {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.12, ...options });
}

function box<T extends THREE.Material>(width: number, height: number, depth: number, surface: T) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), surface);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
}

function caption(text: string, foreground: string, background: string) {
    const source = document.createElement('canvas');
    source.width = 512;
    source.height = 128;
    const context = source.getContext('2d')!;
    context.fillStyle = background;
    context.roundRect(8, 8, 496, 112, 25);
    context.fill();
    context.fillStyle = foreground;
    context.font = '600 55px sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, 256, 67);
    const texture = new THREE.CanvasTexture(source);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
    sprite.scale.set(1.15, 0.2875, 1);
    return sprite;
}

function character(color: number, armed: boolean, ghost = false) {
    const group = new THREE.Group();
    const armor = material(color, ghost ? { transparent: true, opacity: 0.25, depthWrite: false, emissive: color, emissiveIntensity: 0.4 } : {});
    const dark = material(ghost ? color : 0x243343, ghost ? { transparent: true, opacity: 0.16, depthWrite: false } : {});
    const visor = material(ghost ? color : armed ? 0x91dcea : 0xffb958, {
        emissive: ghost ? color : armed ? 0x286777 : 0xce6519,
        emissiveIntensity: ghost ? 0.5 : 0.35,
        transparent: ghost,
        opacity: ghost ? 0.42 : 1,
        depthWrite: !ghost,
        roughness: 0.3,
    });
    const torso = box(0.57, 0.57, 0.34, armor);
    torso.position.y = 1.18;
    const chest = box(0.37, 0.24, 0.035, dark);
    chest.position.set(0, 1.25, 0.184);
    const belt = box(0.46, 0.13, 0.31, dark);
    belt.position.y = 0.85;
    const head = box(0.36, 0.33, 0.33, armor);
    head.position.y = 1.67;
    const face = box(0.29, 0.1, 0.035, visor);
    face.position.set(0, 1.69, 0.184);
    group.add(torso, chest, belt, head, face);
    const legs = [-1, 1].map((side) => {
        const leg = new THREE.Group();
        leg.position.set(side * 0.16, 0.85, 0);
        const thigh = box(0.22, 0.36, 0.24, armor);
        thigh.position.y = -0.18;
        const knee = box(0.2, 0.12, 0.27, dark);
        knee.position.y = -0.39;
        const shin = box(0.19, 0.3, 0.21, armor);
        shin.position.y = -0.57;
        const boot = box(0.23, 0.13, 0.36, dark);
        boot.position.set(0, -0.775, 0.07);
        leg.add(thigh, knee, shin, boot);
        group.add(leg);
        return leg;
    });
    const arms = [-1, 1].map((side) => {
        const arm = new THREE.Group();
        arm.position.set(side * 0.39, 1.42, 0);
        const shoulder = box(0.23, 0.23, 0.3, armor);
        shoulder.position.y = -0.06;
        const upperArm = box(0.18, 0.29, 0.18, armor);
        upperArm.position.y = -0.23;
        const forearm = box(0.17, 0.27, 0.18, dark);
        forearm.position.y = -0.49;
        arm.add(shoulder, upperArm, forearm);
        if (armed) arm.rotation.x = -1.15;
        group.add(arm);
        return arm;
    });
    const gun = new THREE.Group();
    if (armed) {
        const steel = material(0x192936, { metalness: 0.75, roughness: 0.35 });
        const stock = box(0.15, 0.16, 0.28, dark);
        stock.position.z = -0.23;
        const body = box(0.15, 0.18, 0.48, steel);
        const barrel = box(0.065, 0.065, 0.36, steel);
        barrel.position.set(0, 0.025, 0.4);
        const magazine = box(0.09, 0.19, 0.13, dark);
        magazine.position.set(0, -0.16, -0.04);
        const sight = box(0.075, 0.045, 0.11, dark);
        sight.position.y = 0.125;
        gun.add(stock, body, barrel, magazine, sight);
        gun.position.set(0, 1.2, 0.5);
        group.add(gun);
    }
    if (ghost) {
        for (const piece of [torso, head, ...legs.map((leg) => leg.children[0] as THREE.Mesh)]) {
            piece.add(new THREE.LineSegments(new THREE.EdgesGeometry(piece.geometry), new THREE.LineBasicMaterial({ color: 0x64ffe5, transparent: true, opacity: 0.85 })));
        }
        group.traverse((piece) => { piece.castShadow = false; piece.receiveShadow = false; });
    }
    return { group, armor, torso, head, legs, arms, gun };
}

export function createShootingScene(canvas: HTMLCanvasElement) {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.16;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xbccbd2);
    scene.fog = new THREE.Fog(0xbccbd2, 28, 65);
    const camera = new THREE.PerspectiveCamera(44, 1, 0.08, 90);
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.minDistance = 1.2;
    controls.maxDistance = 35;
    controls.maxPolarAngle = Math.PI * 0.485;
    controls.minPolarAngle = 0.12;
    controls.panSpeed = 0.75;
    controls.rotateSpeed = 0.65;
    controls.zoomSpeed = 0.8;
    scene.add(new THREE.HemisphereLight(0xe7f6ff, 0x53616a, 2.3));
    const sunlight = new THREE.DirectionalLight(0xffedd2, 3.7);
    sunlight.position.set(-4, 11, 6);
    sunlight.castShadow = true;
    sunlight.shadow.mapSize.set(2048, 2048);
    sunlight.shadow.normalBias = 0.035;
    Object.assign(sunlight.shadow.camera, { left: -12, right: 12, top: 14, bottom: -12, near: 0.5, far: 32 });
    scene.add(sunlight);
    const fill = new THREE.DirectionalLight(0x7bbfda, 1.4);
    fill.position.set(6, 5, -7);
    scene.add(fill);

    const concrete = material(0x839695);
    const wallMaterial = material(0x526878);
    const trim = material(0x273e50, { roughness: 0.5 });
    const lightMetal = material(0xbed3d4, { metalness: 0.65, roughness: 0.4 });
    const paint = material(0xe9bf60);
    const floor = box(13, 0.24, 15.8, concrete);
    floor.position.set(-1, -0.14, 0);
    scene.add(floor);
    const surroundings = new THREE.Mesh(new THREE.PlaneGeometry(130, 130), material(0x8ca2a7));
    surroundings.rotation.x = -Math.PI / 2;
    surroundings.position.y = -0.29;
    surroundings.receiveShadow = true;
    scene.add(surroundings);
    const backstop = box(12.9, 3.2, 0.42, wallMaterial);
    backstop.position.set(-1, 1.5, -6.35);
    scene.add(backstop);
    for (let x = -6.2; x <= 4.3; x += 1.5) {
        const rib = box(0.08, 3.1, 0.12, trim);
        rib.position.set(x, 1.5, -6.06);
        scene.add(rib);
        const absorber = box(1.22, 1.45, 0.14, material(0x6a7d87));
        absorber.position.set(x + 0.69, 1.13, -6.03);
        scene.add(absorber);
    }
    const topBand = box(12.85, 0.23, 0.48, trim);
    topBand.position.set(-1, 3.13, -6.35);
    scene.add(topBand);
    const rangeSign = caption('REWIND  /  01', '#e7f6f6', '#293f50');
    rangeSign.position.set(-1, 2.71, -6.06);
    rangeSign.scale.set(3.2, 0.8, 1);
    scene.add(rangeSign);
    for (const x of [-7.3, 5.3]) {
        const parapet = box(0.3, 0.8, 12.1, wallMaterial);
        parapet.position.set(x, 0.3, 0.2);
        scene.add(parapet);
        for (const z of [-4.7, 3.8]) {
            const post = box(0.15, 3.8, 0.15, trim);
            post.position.set(x, 1.8, z);
            const lamp = box(0.56, 0.13, 0.42, material(0xe6fcff, { emissive: 0xc2eefe, emissiveIntensity: 0.85 }));
            lamp.position.set(x, 3.76, z);
            scene.add(post, lamp);
        }
    }
    for (const z of [-3.74, -3.26]) {
        const rail = box(10, 0.035, 0.055, lightMetal);
        rail.position.set(-1, 0.018, z);
        scene.add(rail);
    }
    for (const z of [2.2, 6.1]) {
        const stripe = box(5.1, 0.014, 0.065, paint);
        stripe.position.set(-2.25, 0.004, z);
        scene.add(stripe);
    }
    const firingMat = box(2, 0.025, 1.8, material(0x475c68));
    firingMat.position.set(-3.5, 0.008, 5);
    scene.add(firingMat);
    for (const [x, z, scale] of [[3.7, 3.9, 1], [4.1, -4.9, 0.8], [-6.2, 0.1, 0.75]]) {
        const crate = new THREE.Group();
        crate.position.set(x, 0, z);
        const body = box(1.15, 0.9, 0.96, material(0x9b8b69));
        body.position.y = 0.45;
        const lid = box(1.22, 0.11, 1.02, trim);
        lid.position.y = 0.94;
        crate.add(body, lid);
        for (const offset of [-0.4, 0.4]) {
            const binding = box(0.08, 0.91, 0.99, trim);
            binding.position.set(offset, 0.46, 0);
            crate.add(binding);
        }
        crate.scale.setScalar(scale);
        scene.add(crate);
    }

    const coverWidth = arena.coverMaxX - arena.coverMinX;
    const coverDepth = arena.coverFrontZ - arena.coverBackZ;
    const coverCenterX = (arena.coverMinX + arena.coverMaxX) / 2;
    const coverCenterZ = (arena.coverFrontZ + arena.coverBackZ) / 2;
    const cover = box(coverWidth, arena.coverHeight, coverDepth, material(0x82949b, { roughness: 0.96, metalness: 0 }));
    cover.position.set(coverCenterX, arena.coverHeight / 2, coverCenterZ);
    scene.add(cover);
    const coverCap = box(coverWidth, 0.09, coverDepth, material(0xb2bfc0, { roughness: 0.94, metalness: 0 }));
    coverCap.position.set(coverCenterX, arena.coverHeight - 0.045, coverCenterZ);
    scene.add(coverCap);
    const hazard = box(coverWidth - 0.04, 0.12, 0.008, paint);
    hazard.position.set(coverCenterX, 0.24, arena.coverFrontZ + 0.004);
    scene.add(hazard);
    for (const y of [0.85, 1.7]) {
        const seam = box(coverWidth, 0.014, 0.006, material(0x667b83));
        seam.position.set(coverCenterX, y, arena.coverFrontZ + 0.003);
        scene.add(seam);
    }
    const coverCaption = caption('엄폐물', '#eff5f8', '#455e6b');
    coverCaption.position.set(coverCenterX, arena.coverHeight + 0.27, coverCenterZ);
    scene.add(coverCaption);
    const coverBounds = new THREE.Box3(
        new THREE.Vector3(arena.coverMinX, 0, arena.coverBackZ),
        new THREE.Vector3(arena.coverMaxX, arena.coverHeight, arena.coverFrontZ),
    );
    const shotRay = new THREE.Ray();

    const shooter = character(0x527ea5, true);
    shooter.group.position.copy(shooterPosition);
    scene.add(shooter.group);
    const target = character(0xda9564, false);
    target.group.position.z = targetZ;
    target.group.rotation.y = Math.PI / 2;
    scene.add(target.group);
    const ghost = character(0x33d9c0, false, true);
    ghost.group.position.z = targetZ;
    ghost.group.rotation.y = Math.PI / 2;
    scene.add(ghost.group);
    const shooterLabel = caption('사수', '#eff8ff', '#294760');
    shooterLabel.position.set(0, 2.13, 0);
    shooter.group.add(shooterLabel);
    const targetLabel = caption('표적', '#fff3e6', '#86522f');
    targetLabel.position.set(0, 2.32, 0);
    target.group.add(targetLabel);
    const ghostLabel = caption('조회한 과거', '#baffef', '#1a5454');
    ghostLabel.position.set(-0.15, 2.82, 0);
    ghost.group.add(ghostLabel);
    const roleLabels = [shooterLabel, targetLabel, ghostLabel, coverCaption];
    for (const label of roleLabels) {
        label.material.depthTest = true;
        label.renderOrder = 10;
    }
    const health = new THREE.Group();
    const healthBack = new THREE.Mesh(new THREE.PlaneGeometry(0.69, 0.085), new THREE.MeshBasicMaterial({ color: 0x263c45, depthWrite: false }));
    const healthFill = new THREE.Mesh(new THREE.PlaneGeometry(0.65, 0.05), new THREE.MeshBasicMaterial({ color: 0x75e9b5, depthWrite: false }));
    healthFill.position.z = 0.005;
    health.add(healthBack, healthFill);
    scene.add(health);
    const targetBase = box(0.85, 0.075, 0.67, trim);
    targetBase.position.z = targetZ;
    targetBase.position.y = 0.02;
    scene.add(targetBase);

    const flashMaterial = new THREE.MeshBasicMaterial({ color: 0xffec9a, transparent: true, opacity: 1, depthWrite: false });
    const muzzleFlash = new THREE.Mesh(new THREE.IcosahedronGeometry(0.18, 0), flashMaterial);
    scene.add(muzzleFlash);
    const muzzleLight = new THREE.PointLight(0xffb45d, 0, 4);
    scene.add(muzzleLight);
    const tracerMaterial = new THREE.MeshBasicMaterial({ color: 0xffb258, transparent: true, depthWrite: false });
    const tracer = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 1, 7), tracerMaterial);
    const tracerCore = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 1, 6), new THREE.MeshBasicMaterial({ color: 0xfff2c7, transparent: true, depthWrite: false }));
    scene.add(tracer, tracerCore);
    const aimMarker = new THREE.Mesh(new THREE.RingGeometry(0.055, 0.071, 28), new THREE.MeshBasicMaterial({ color: 0xffefbe, side: THREE.DoubleSide, transparent: true, opacity: 0.85 }));
    scene.add(aimMarker);
    const impactMaterial = new THREE.MeshBasicMaterial({ color: 0xffba5b, transparent: true, depthWrite: false });
    const impact = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 1), impactMaterial);
    scene.add(impact);
    const sparks = Array.from({ length: 8 }, (_, index) => {
        const spark = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.11, 0.022), impactMaterial);
        spark.userData.angle = index * Math.PI / 4;
        scene.add(spark);
        return spark;
    });

    let frame: SceneFrame = { targetX: 4, targetTime: 1000, moving: false, aimX: 3.4, targetCovered: true, ghostX: 3.4, ghostVisible: false, shotFlash: 0, trace: 'none', traceBlocked: false, result: 'pending', hitPulse: 0 };
    let view: View = 'free';
    let hasSized = false;
    let previousWidth = 0;
    let previousHeight = 0;
    let elapsed = 0;
    const muzzle = new THREE.Vector3();
    const endpoint = new THREE.Vector3();
    const direction = new THREE.Vector3();
    const targetPoint = new THREE.Vector3();

    function resetCamera() {
        controls.enableDamping = false;
        controls.update();
        if (view === 'shooter') {
            controls.target.set(frame.aimX - 4, 1.24, targetZ);
            camera.position.set(shooterPosition.x - 1.1, 2.1, shooterPosition.z + 0.75);
        } else if (view === 'target') {
            controls.target.set(shooterPosition.x, 1.18, shooterPosition.z);
            camera.position.set(frame.targetX - 4 + 0.82, 2.18, targetZ - 1.75);
        } else {
            const portrait = camera.aspect < 0.85;
            controls.target.set(portrait ? -1.8 : -1.35, portrait ? 0.15 : 0.9, 0.65);
            const ray = portrait ? new THREE.Vector3(-1.5, 0.95, 0.75).normalize() : new THREE.Vector3(-1.6, 0.9, 0.75).normalize();
            const right = up.clone().cross(ray).normalize();
            const cameraUp = ray.clone().cross(right);
            const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
            let distance = 9;
            const regions = portrait
                ? [{ x: [-4.1, -2.8], z: [4.3, 5.6] }, { x: [-1.8, 1.2], z: [-3.9, -3.1] }]
                : [{ x: [-4.15, 1.3], z: [-4.25, 5.8] }];
            for (const region of regions) for (const x of region.x) for (const y of [0, 2.65]) for (const z of region.z) {
                const corner = new THREE.Vector3(x, y, z).sub(controls.target);
                distance = Math.max(distance, corner.dot(ray) + Math.abs(corner.dot(right)) / (tan * camera.aspect), corner.dot(ray) + Math.abs(corner.dot(cameraUp)) / tan);
            }
            camera.position.copy(ray.multiplyScalar(distance * 1.12).add(controls.target));
        }
        controls.update();
        controls.enableDamping = true;
    }

    function update(next: SceneFrame) {
        if (view === 'target') {
            const displacement = next.targetX - frame.targetX;
            camera.position.x += displacement;
            controls.target.x += displacement;
        }
        frame = next;
        const x = frame.targetX - 4;
        target.group.position.set(x, 0.075, targetZ);
        targetBase.position.x = x;
        ghost.group.position.set(frame.ghostX - 4, 0.075, targetZ);
        ghost.group.visible = frame.ghostVisible;
        shooter.group.rotation.y = Math.atan2(frame.aimX - 4 - shooterPosition.x, targetZ - shooterPosition.z);
        const stride = frame.moving ? Math.sin(frame.targetTime * 0.018) * 0.55 : 0;
        target.legs[0].rotation.x = stride;
        target.legs[1].rotation.x = -stride;
        target.arms[0].rotation.x = -stride * 0.8;
        target.arms[1].rotation.x = stride * 0.8;
        target.torso.rotation.z = frame.result === 'hit' ? frame.hitPulse * -0.15 : 0;
        target.head.rotation.z = frame.result === 'hit' ? frame.hitPulse * -0.12 : 0;
        target.armor.emissive.setHex(frame.result === 'hit' ? 0xff3e13 : 0x000000);
        target.armor.emissiveIntensity = frame.result === 'hit' ? frame.hitPulse * 1.6 : 0;
        ghost.legs[0].rotation.x = 0.24;
        ghost.legs[1].rotation.x = -0.24;
        targetLabel.visible = view !== 'target' && !(view === 'shooter' && frame.targetCovered);
        health.visible = !(view === 'shooter' && frame.targetCovered);
        health.position.set(x, 2.17, targetZ);
        const fraction = frame.result === 'hit' ? 0.35 : 1;
        healthFill.scale.x = fraction;
        healthFill.position.x = -(1 - fraction) * 0.325;
        healthFill.material.color.setHex(frame.result === 'hit' ? 0xff7965 : 0x75e9b5);
        shooter.gun.position.z = 0.5 - frame.shotFlash * 0.07;
        shooter.group.updateMatrixWorld(true);
        muzzle.set(0, 0.025, 0.62);
        shooter.gun.localToWorld(muzzle);
        targetPoint.set(frame.aimX - 4, 1.23, targetZ);
        endpoint.copy(targetPoint);
        if (frame.traceBlocked) {
            shotRay.set(muzzle, direction.copy(targetPoint).sub(muzzle).normalize());
            shotRay.intersectBox(coverBounds, endpoint);
        } else if (frame.result === 'miss') {
            const intersection = (-5.86 - muzzle.z) / (targetZ - muzzle.z);
            endpoint.copy(muzzle).lerp(targetPoint, intersection);
        }
        direction.copy(endpoint).sub(muzzle);
        const showTrace = frame.trace !== 'none' && frame.result !== 'rejected';
        for (const beam of [tracer, tracerCore]) {
            beam.visible = showTrace;
            beam.position.copy(muzzle).add(endpoint).multiplyScalar(0.5);
            beam.scale.y = direction.length();
            beam.quaternion.setFromUnitVectors(up, direction.clone().normalize());
        }
        tracerMaterial.color.setHex(frame.trace === 'query' ? 0x43f4ce : 0xffb258);
        tracerMaterial.opacity = frame.trace === 'query' ? 0.7 : Math.max(0.3, frame.shotFlash);
        tracerCore.visible = showTrace && frame.trace === 'shot';
        muzzleFlash.visible = frame.shotFlash > 0.01;
        muzzleFlash.position.copy(muzzle);
        muzzleFlash.scale.setScalar(0.6 + frame.shotFlash * 0.8);
        flashMaterial.opacity = frame.shotFlash;
        muzzleLight.position.copy(muzzle);
        muzzleLight.intensity = frame.shotFlash * 5;
        aimMarker.position.copy(targetPoint);
        aimMarker.visible = frame.result === 'pending';
        impact.visible = showTrace && (frame.result === 'hit' || frame.result === 'miss' || frame.result === 'blocked');
        impact.position.copy(endpoint);
        impactMaterial.color.setHex(frame.result === 'hit' ? 0x9bffcc : 0xffba5b);
        impactMaterial.opacity = 0.4 + frame.hitPulse * 0.6;
        for (const spark of sparks) {
            spark.visible = impact.visible && frame.hitPulse > 0.03;
            const angle = spark.userData.angle as number;
            const radius = (1 - frame.hitPulse) * 0.4 + 0.05;
            spark.position.copy(endpoint).add(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.08));
            spark.rotation.z = angle - Math.PI / 2;
            spark.scale.setScalar(frame.hitPulse);
        }
    }

    function resize() {
        const bounds = canvas.getBoundingClientRect();
        const width = Math.max(1, bounds.width);
        const height = Math.max(1, bounds.height);
        if (width === previousWidth && height === previousHeight) return;
        previousWidth = width;
        previousHeight = height;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
        if (!hasSized) {
            hasSized = true;
            resetCamera();
        }
    }

    function keyboard(event: KeyboardEvent) {
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', '_', 'Home'].includes(event.key)) return;
        event.preventDefault();
        if (event.key === 'Home') {
            resetCamera();
            return;
        }
        const offset = camera.position.clone().sub(controls.target);
        const spherical = new THREE.Spherical().setFromVector3(offset);
        if (event.key === 'ArrowLeft') spherical.theta -= 0.1;
        if (event.key === 'ArrowRight') spherical.theta += 0.1;
        if (event.key === 'ArrowUp') spherical.phi -= 0.08;
        if (event.key === 'ArrowDown') spherical.phi += 0.08;
        if (event.key === '+' || event.key === '=') spherical.radius /= 1.12;
        if (event.key === '-' || event.key === '_') spherical.radius *= 1.12;
        spherical.phi = THREE.MathUtils.clamp(spherical.phi, controls.minPolarAngle, controls.maxPolarAngle);
        spherical.radius = THREE.MathUtils.clamp(spherical.radius, controls.minDistance, controls.maxDistance);
        camera.position.copy(offset.setFromSpherical(spherical).add(controls.target));
        controls.update();
    }
    canvas.addEventListener('keydown', keyboard);
    update(frame);
    resize();

    return {
        update,
        setView(next: View) {
            view = next;
            shooterLabel.visible = view !== 'shooter';
            targetLabel.visible = view !== 'target' && !(view === 'shooter' && frame.targetCovered);
            health.visible = !(view === 'shooter' && frame.targetCovered);
            resetCamera();
        },
        resetCamera,
        resize,
        render(deltaSeconds: number) {
            elapsed += deltaSeconds;
            muzzleFlash.rotation.set(elapsed * 9, elapsed * 13, elapsed * 17);
            controls.update();
            camera.updateMatrixWorld();
            health.quaternion.copy(camera.quaternion);
            const healthDepth = -health.getWorldPosition(new THREE.Vector3()).applyMatrix4(camera.matrixWorldInverse).z;
            health.scale.setScalar(6 * 2 * Math.max(0.1, healthDepth) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / Math.max(1, previousHeight) / 0.085);
            aimMarker.quaternion.copy(camera.quaternion);
            for (const label of roleLabels) {
                const depth = -label.getWorldPosition(new THREE.Vector3()).applyMatrix4(camera.matrixWorldInverse).z;
                const height = 21 * 2 * Math.max(0.1, depth) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / Math.max(1, previousHeight);
                label.scale.set(height * 4, height, 1);
            }
            renderer.render(scene, camera);
        },
        dispose() {
            canvas.removeEventListener('keydown', keyboard);
            controls.dispose();
            const geometries = new Set<THREE.BufferGeometry>();
            const materials = new Set<THREE.Material>();
            const textures = new Set<THREE.Texture>();
            scene.traverse((object) => {
                const drawable = object as THREE.Mesh | THREE.Line | THREE.Sprite;
                if ('geometry' in drawable) geometries.add(drawable.geometry);
                if (!drawable.material) return;
                for (const entry of Array.isArray(drawable.material) ? drawable.material : [drawable.material]) {
                    materials.add(entry);
                    const texture = (entry as THREE.MeshBasicMaterial).map;
                    if (texture) textures.add(texture);
                }
            });
            for (const geometry of geometries) geometry.dispose();
            for (const texture of textures) texture.dispose();
            for (const surface of materials) surface.dispose();
            sunlight.shadow.dispose();
            renderer.dispose();
        },
    };
}
