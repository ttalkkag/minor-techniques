import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Method, Simulation } from './physics';

const methods: Method[] = ['discrete', 'continuous'];
const colors = { discrete: 0xc17b50, continuous: 0x278b80 };

function label(text: string, color: string, pixels: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 160;
  const context = canvas.getContext('2d')!;
  context.font = '500 80px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = color;
  context.fillText(text, 384, 80);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false }));
  sprite.userData.labelPixels = pixels;
  return sprite;
}

function solid(geometry: THREE.BufferGeometry, color: number, options: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.06, ...options }));
}

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    const renderable = child as THREE.Mesh | THREE.Line | THREE.Sprite;
    if ('geometry' in renderable) renderable.geometry.dispose();
    if (!renderable.material) return;
    for (const material of Array.isArray(renderable.material) ? renderable.material : [renderable.material]) {
      const mapped = material as THREE.MeshBasicMaterial;
      mapped.map?.dispose();
      material.dispose();
    }
  });
}

export function createScene(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0xedf1f3);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 400);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.09;
  controls.maxPolarAngle = Math.PI / 2.03;
  controls.minDistance = 5;
  controls.maxDistance = 180;
  let dirty = true;
  let viewportHeight = 1;
  let minimum = -6.5;
  let maximum = 10.8;
  let boundsKey = '';
  const markDirty = () => { dirty = true; };
  controls.addEventListener('change', markDirty);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x93a69f, 3));
  const sun = new THREE.DirectionalLight(0xffffff, 3.2);
  sun.position.set(-4, 12, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.normalBias = 0.03;
  Object.assign(sun.shadow.camera, { left: -42, right: 42, top: 18, bottom: -18, far: 100 });
  scene.add(sun);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(250, 250), new THREE.ShadowMaterial({ color: 0x314757, opacity: 0.1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.2;
  ground.receiveShadow = true;
  scene.add(ground);
  const platform = solid(new THREE.BoxGeometry(1, 0.16, 8.5), 0xfafbf8);
  platform.position.y = -0.1;
  platform.receiveShadow = true;
  platform.castShadow = true;
  scene.add(platform);
  const grid = new THREE.GridHelper(1, 30, 0xcbd6d2, 0xe1e7e3);
  grid.position.y = -0.014;
  grid.scale.z = 8;
  scene.add(grid);
  const axis = new THREE.Group();
  scene.add(axis);

  const lanes = methods.map((method, index) => {
    const z = index === 0 ? -2 : 2;
    const color = colors[method];
    const track = solid(new THREE.BoxGeometry(1, 0.016, 2.75), index === 0 ? 0xefdfcf : 0xd1e5dc);
    track.position.set(0, 0, z);
    track.receiveShadow = true;
    const wall = solid(new THREE.BoxGeometry(1, 2.1, 2.65), 0x8b9d9e, { transparent: true, opacity: 0.58, depthWrite: false });
    wall.position.set(0, 1.05, z);
    wall.castShadow = true;
    wall.add(new THREE.LineSegments(new THREE.EdgesGeometry(wall.geometry), new THREE.LineBasicMaterial({ color: 0x738889, transparent: true, opacity: 0.65 })));
    const sphere = solid(new THREE.SphereGeometry(1, 32, 24), color, { roughness: 0.35, metalness: 0.17 });
    sphere.castShadow = true;
    const previous = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.28 }));
    const next = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.4 }));
    const line = new THREE.Line(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(6), 3)), new THREE.LineDashedMaterial({ color, dashSize: 0.14, gapSize: 0.11, transparent: true, opacity: 0.62 }));
    const volume = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 24, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.09, side: THREE.DoubleSide, depthWrite: false }));
    volume.rotation.z = Math.PI / 2;
    const contact = solid(new THREE.SphereGeometry(0.06, 16, 12), 0xffffff, { emissive: color, emissiveIntensity: 0.4 });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.17, 0.2, 40), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.9 }));
    ring.rotation.y = Math.PI / 2;
    const title = label(index === 0 ? 'A  위치만 확인' : 'B  경로 확인', index === 0 ? '#a96036' : '#217a70', 12);
    title.position.set(-4.6, 1.85, z);
    const wallLabel = label('벽', '#607875', 10);
    wallLabel.position.set(0, 2.48, z);
    const contactLabel = label('최초 접촉', '#217a70', 11);
    contactLabel.position.set(0, 1.3, z);
    scene.add(track, wall, sphere, previous, next, line, volume, contact, ring, title, wallLabel, contactLabel);
    return { method, z, track, wall, sphere, previous, next, line, volume, contact, ring, title, wallLabel, contactLabel };
  });

  function resetCamera() {
    const damping = controls.enableDamping;
    controls.enableDamping = false;
    controls.update();
    controls.enableDamping = damping;
    const center = (minimum + maximum) / 2;
    const vertical = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const direction = new THREE.Vector3(0.34, 0.5, 0.8).normalize();
    const right = new THREE.Vector3(0, 1, 0).cross(direction).normalize();
    const up = direction.clone().cross(right);
    controls.target.set(center, 0.85, 0);
    let distance = 0;
    for (const x of [minimum - 0.5, maximum + 0.5]) {
      for (const y of [-0.2, 2.9]) {
        for (const z of [-4.5, 4.5]) {
          const corner = new THREE.Vector3(x, y, z).sub(controls.target);
          const depth = corner.dot(direction);
          distance = Math.max(distance, depth + Math.abs(corner.dot(right)) / (vertical * camera.aspect), depth + Math.abs(corner.dot(up)) / vertical);
        }
      }
    }
    camera.position.copy(direction.multiplyScalar(distance * 1.12).add(controls.target));
    controls.update();
    dirty = true;
  }

  function update(state: Simulation, pathVisible: boolean) {
    const { start, speed, hz, radius, thickness, wallX } = state.config;
    const nextMinimum = start - 1.5;
    const nextMaximum = Math.max(6, wallX + thickness / 2 + radius + speed / hz + 1.5);
    const key = `${nextMinimum}:${nextMaximum}`;
    if (key !== boundsKey) {
      boundsKey = key;
      minimum = nextMinimum;
      maximum = nextMaximum;
      const center = (minimum + maximum) / 2;
      platform.scale.x = maximum - minimum + 1;
      platform.position.x = center;
      grid.scale.x = maximum - minimum;
      grid.position.x = center;
      disposeObject(axis);
      axis.clear();
      const interval = maximum - minimum > 25 ? 10 : 5;
      const ticks = new Set([start, 0]);
      for (let x = interval; x < maximum; x += interval) ticks.add(x);
      for (const x of ticks) {
        const unit = label(`${x > 0 ? '+' : ''}${x} m`, '#70847f', 10);
        unit.position.set(x, 0.1, 3.95);
        axis.add(unit);
      }
      for (const lane of lanes) {
        lane.track.scale.x = maximum - minimum;
        lane.track.position.x = center;
        lane.title.position.x = start;
      }
      resetCamera();
    }
    for (const lane of lanes) {
      const body = state[lane.method];
      const from = state.tick === 0 ? body.x : body.prev;
      const to = state.tick === 0 ? body.x + speed / hz : body.next;
      lane.wall.scale.x = thickness;
      lane.wall.position.x = wallX;
      lane.wallLabel.position.x = wallX;
      lane.sphere.position.set(body.x, 0.72, lane.z);
      lane.sphere.scale.setScalar(radius);
      lane.previous.position.set(from, 0.72, lane.z);
      lane.previous.scale.setScalar(radius);
      lane.next.position.set(to, 0.72, lane.z);
      lane.next.scale.setScalar(radius);
      lane.previous.visible = pathVisible;
      lane.next.visible = pathVisible;
      const positions = lane.line.geometry.getAttribute('position') as THREE.BufferAttribute;
      positions.setXYZ(0, from, 0.72, lane.z);
      positions.setXYZ(1, to, 0.72, lane.z);
      positions.needsUpdate = true;
      lane.line.geometry.computeBoundingSphere();
      lane.line.computeLineDistances();
      lane.line.visible = pathVisible;
      lane.volume.position.set((from + to) / 2, 0.72, lane.z);
      lane.volume.scale.set(radius, Math.abs(to - from), radius);
      lane.volume.visible = pathVisible && lane.method === 'continuous';
      const touching = body.status === 'hit' && lane.method === 'continuous';
      lane.contact.position.set(wallX - thickness / 2 - 0.005, 0.72, lane.z);
      lane.ring.position.copy(lane.contact.position);
      lane.contact.visible = touching;
      lane.ring.visible = touching;
      lane.contactLabel.position.x = body.x - 0.1;
      lane.contactLabel.visible = touching;
    }
    dirty = true;
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
    if (event.key === 'ArrowLeft') spherical.theta -= 0.12;
    if (event.key === 'ArrowRight') spherical.theta += 0.12;
    if (event.key === 'ArrowUp') spherical.phi -= 0.09;
    if (event.key === 'ArrowDown') spherical.phi += 0.09;
    if (event.key === '+' || event.key === '=') spherical.radius /= 1.12;
    if (event.key === '-' || event.key === '_') spherical.radius *= 1.12;
    spherical.phi = THREE.MathUtils.clamp(spherical.phi, 0.08, controls.maxPolarAngle);
    spherical.radius = THREE.MathUtils.clamp(spherical.radius, controls.minDistance, controls.maxDistance);
    camera.position.copy(offset.setFromSpherical(spherical).add(controls.target));
    controls.update();
    dirty = true;
  }
  canvas.addEventListener('keydown', keyboard);

  return {
    update,
    resetCamera,
    resize(width: number, height: number) {
      viewportHeight = Math.max(1, height);
      camera.aspect = Math.max(1, width) / Math.max(1, height);
      camera.updateProjectionMatrix();
      renderer.setSize(Math.max(1, width), Math.max(1, height), false);
      resetCamera();
    },
    render() {
      if (controls.update()) dirty = true;
      if (!dirty) return;
      camera.updateMatrixWorld();
      scene.traverse((object) => {
        if (!(object instanceof THREE.Sprite)) return;
        const depth = -object.getWorldPosition(new THREE.Vector3()).applyMatrix4(camera.matrixWorldInverse).z;
        const labelHeight = object.userData.labelPixels * 4 * depth * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / viewportHeight;
        object.scale.set(labelHeight * 768 / 160, labelHeight, 1);
      });
      renderer.render(scene, camera);
      dirty = false;
    },
    dispose() {
      canvas.removeEventListener('keydown', keyboard);
      controls.removeEventListener('change', markDirty);
      controls.dispose();
      disposeObject(scene);
      sun.shadow.dispose();
      renderer.dispose();
    },
  };
}
