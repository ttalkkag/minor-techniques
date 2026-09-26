import { syncViewControls } from '../../layouts/experiment-layout';
import { createPlayback } from '../../components/experiment-playback';
import { blocks, mesh, corners, qef } from './model';
const get = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = get<HTMLCanvasElement>('scene'),
    ctx = canvas.getContext('2d')!;
const info = get<HTMLDialogElement>('info');
get('explain').addEventListener('click', () => info.showModal());
get('close-info').addEventListener('click', () => info.close());
function surface() {
    const r = canvas.getBoundingClientRect(),
        dpr = Math.min(devicePixelRatio, 2);
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w: r.width, h: r.height };
}
function textAt(text: string, x: number, y: number, color = '#334d58', size = 13) {
    ctx.fillStyle = color;
    ctx.font = `${size}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(text, x, y);
}
function range(id: string) {
    const control = get<HTMLInputElement>(id);
    get(`${id}-value`).textContent = control.value;
    return Number(control.value);
}
let faceProgress = 0,
    faceCount = 0,
    angleDirection = 1;
function draw() {
    syncViewControls();
    const { w, h } = surface(),
        n = range('size'),
        yaw = (range('yaw') * Math.PI) / 180,
        pitch = (range('pitch') * Math.PI) / 180,
        angle = (range('plane-angle') * Math.PI) / 180;
    if (get<HTMLSelectElement>('scene-mode').value === 'qef') {
        const result = qef(angle, get<HTMLInputElement>('regularize').checked),
            size = Math.min(w * 0.64, h * 0.65),
            cx = w / 2,
            cy = h * 0.47;
        const project = (p: number[]) => ({
            x: cx + (p[0] - 0.5) * size,
            y: cy - (p[1] - 0.5) * size,
        });
        ctx.fillStyle = '#e6efee';
        ctx.strokeStyle = '#9bb8b8';
        ctx.lineWidth = 2;
        ctx.fillRect(cx - size / 2, cy - size / 2, size, size);
        ctx.strokeRect(cx - size / 2, cy - size / 2, size, size);
        result.normals.forEach((normal, i) => {
            const p = result.points[i],
                a = project([p[0] - normal[1] * 3, p[1] + normal[0] * 3]),
                b = project([p[0] + normal[1] * 3, p[1] - normal[0] * 3]);
            ctx.save();
            ctx.beginPath();
            ctx.rect(8, 40, w - 16, h - 95);
            ctx.clip();
            ctx.strokeStyle = i ? '#cf9044' : '#1b8b82';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
            ctx.restore();
            const start = project(p),
                end = project([p[0] + normal[0] * 0.2, p[1] + normal[1] * 0.2]);
            ctx.beginPath();
            ctx.arc(start.x, start.y, 5, 0, Math.PI * 2);
            ctx.fillStyle = i ? '#cf9044' : '#1b8b82';
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.lineWidth = 4;
            ctx.stroke();
        });
        const vertex = project(result.vertex),
            onScreen = vertex.x > 8 && vertex.x < w - 8 && vertex.y > 40 && vertex.y < h - 55;
        if (onScreen) {
            ctx.fillStyle = '#bd4c40';
            ctx.beginPath();
            ctx.arc(vertex.x, vertex.y, 7, 0, Math.PI * 2);
            ctx.fill();
        }
        textAt(
            onScreen ? '붉은 점: 제곱 오차 최소 정점' : '최소 정점이 화면 밖에 있습니다',
            w / 2,
            26,
            '#9c513f',
            14,
        );
        textAt(
            `v=(${result.vertex[0].toFixed(3)}, ${result.vertex[1].toFixed(3)})`,
            w / 2,
            h - 27,
            '#334f58',
            15,
        );
        get('metric-0').textContent = '2개';
        get('metric-1').textContent = result.error.toFixed(5);
        get('metric-2').textContent = result.determinant.toFixed(5);
        get('playback-status').textContent =
            `법선 각도 ${Math.round((angle * 180) / Math.PI)}° · 정점 (${result.vertex[0].toFixed(2)}, ${result.vertex[1].toFixed(2)})`;
        get('summary').textContent =
            `법선 사이 ${Math.round((angle * 180) / Math.PI)}°. ${result.vertex.some((v) => v < 0 || v > 1) ? '해가 셀 밖에 있습니다.' : '해가 셀 안에 있습니다.'} ${get<HTMLInputElement>('regularize').checked ? '셀 중심에서의 거리 제약 λ=0.02를 추가했습니다.' : '거의 평행하면 법선 행렬이 불안정해집니다.'} 이 도식은 국소 2D QEF이며 전체 표면 연결은 포함하지 않습니다.`;
    } else {
        const method = get<HTMLSelectElement>('method').value,
            neighbor = get<HTMLSelectElement>('neighbor').value,
            cells = blocks(
                n,
                get<HTMLSelectElement>('pattern').value,
                get<HTMLInputElement>('materials').checked,
                get<HTMLInputElement>('carve').checked,
            ),
            quads = mesh(cells, n, method, neighbor),
            exposed = mesh(cells, n, 'exposed', neighbor),
            greedy = mesh(cells, n, 'greedy', neighbor),
            solid = cells.filter(Boolean).length;
        const scale = Math.min(w / (n * 2.5), h / (n * 2.1), 55),
            cx = w / 2,
            cy = h * 0.51;
        const project = (p: number[]) => {
            const x = p[0] - n / 2,
                y = p[1] - n / 2,
                z = p[2] - n / 2,
                xx = x * Math.cos(yaw) - z * Math.sin(yaw),
                zz = x * Math.sin(yaw) + z * Math.cos(yaw);
            return {
                x: cx + xx * scale,
                y: cy + (zz * Math.sin(pitch) - y * Math.cos(pitch)) * scale,
                depth: zz * Math.cos(pitch) + y * Math.sin(pitch),
            };
        };
        const camera = [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)];
        const faces = quads
            .filter((q) => camera[q.axis] * q.sign > 0)
            .map((q, index) => ({ q, index, p: corners(q).map(project) }))
            .sort((a, b) => a.p.reduce((s, p) => s + p.depth, 0) - b.p.reduce((s, p) => s + p.depth, 0));
        faceCount = faces.length;
        for (const { q, p, index } of faces) {
            ctx.beginPath();
            p.forEach((p, i) => {
                if (i === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            });
            ctx.closePath();
            const shade = q.axis === 1 ? 66 : q.axis === 0 ? 48 : 37;
            ctx.fillStyle =
                index < faceProgress
                    ? `hsl(${q.material === 1 ? 174 : 29} 36% ${shade}%)`
                    : `hsl(175 12% ${shade + 30}%)`;
            ctx.fill();
            ctx.strokeStyle = index === faceProgress - 1 ? '#ef9a32' : '#244c5977';
            ctx.lineWidth = index === faceProgress - 1 ? 2 : 1;
            ctx.stroke();
        }
        const currentFace = faces.find(({ index }) => index === Math.min(faceProgress, faceCount) - 1);
        if (currentFace) {
            ctx.beginPath();
            currentFace.p.forEach((p, i) => {
                if (i === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            });
            ctx.closePath();
            ctx.fillStyle = '#ef9a3244';
            ctx.fill();
            ctx.strokeStyle = '#e58920';
            ctx.lineWidth = 3;
            ctx.stroke();
        }
        textAt(
            currentFace ? '주황: 확인 중인 면(내부 면 포함)' : '같은 논리 데이터 · 방법에 따라 달라지는 면 경계',
            w / 2,
            24,
            '#4a6b73',
            13,
        );
        textAt(
            `큐브 ${solid * 6}면 → 노출 ${exposed.length}면 → 병합 ${greedy.length}면`,
            w / 2,
            h - 25,
            '#166e68',
            w < 500 ? 12 : 16,
        );
        get('metric-0').textContent = `${solid}개`;
        get('metric-1').textContent = `${quads.length}개`;
        get('metric-2').textContent = `${quads.length * 2}개`;
        get('playback-status').textContent =
            `생성 순서 확인 ${Math.min(faceProgress, faceCount)} / ${faceCount}면 · 카메라를 향한 면`;
        get('summary').textContent =
            `${method === 'cubes' ? '맞닿은 내부 면도 생성합니다. 이웃 상태와 관계없이 큐브의 6면을 유지하며, 이웃 정책은 비교용 노출·병합 면 수에만 반영합니다.' : `${method === 'exposed' ? '이웃이 비어 있는 면만 생성합니다.' : '평면·방향·재질이 같은 면만 직사각형으로 묶습니다.'} ${neighbor === 'temporary' ? '미확인 +x 이웃은 임시로 비었다고 보고 면을 만듭니다.' : neighbor === 'hold' ? '미확인 +x 경계 면은 데이터가 올 때까지 보류합니다.' : neighbor === 'solid' ? '+x 이웃이 꽉 차 경계 면을 제거했습니다.' : '+x 이웃은 빈 공간입니다.'}`} ${get<HTMLInputElement>('carve').checked ? '경계 블록 수정으로 메시를 다시 계산했습니다.' : ''} 면 수는 생성량이며 뒤쪽 면은 화면에서만 숨깁니다.`;
    }
}
const playback = createPlayback({
    interval: 180,
    advance: () => {
        if (get<HTMLSelectElement>('scene-mode').value === 'qef') {
            const angle = get<HTMLInputElement>('plane-angle');
            if (Number(angle.value) >= 90) angleDirection = -1;
            if (Number(angle.value) <= 2) angleDirection = 1;
            angle.value = String(Math.max(2, Math.min(90, Number(angle.value) + angleDirection * 2)));
            draw();
            return;
        }
        const step = Math.max(1, Math.ceil(faceCount / 24));
        faceProgress = faceProgress >= faceCount ? step : Math.min(faceCount, faceProgress + step);
        draw();
        return faceProgress < faceCount;
    },
});
function changeSettings() {
    playback.pause();
    faceProgress = 0;
    draw();
}
get('scene-mode').addEventListener('change', changeSettings);
document
    .querySelectorAll<HTMLInputElement | HTMLSelectElement>('#settings input,#settings select')
    .forEach((c) => {
        c.addEventListener('input', changeSettings);
        c.addEventListener('change', changeSettings);
    });
get('reset').addEventListener('click', () => {
    faceProgress = 0;
    angleDirection = 1;
    for (const [id, value] of Object.entries({
        'scene-mode': 'blocks',
        method: 'cubes',
        pattern: 'solid',
        neighbor: 'empty',
    }))
        get<HTMLSelectElement>(id).value = value;
    for (const [id, value] of Object.entries({
        size: '5',
        yaw: '35',
        pitch: '30',
        'plane-angle': '40',
    }))
        get<HTMLInputElement>(id).value = value;
    for (const id of ['materials', 'carve', 'regularize']) get<HTMLInputElement>(id).checked = false;
    draw();
});
const observer = new ResizeObserver(draw);
observer.observe(canvas);
window.addEventListener('pagehide', () => observer.disconnect());
window.addEventListener('pageshow', () => {
    observer.observe(canvas);
    draw();
});
draw();
