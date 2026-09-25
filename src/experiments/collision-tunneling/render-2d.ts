import type { Method, Simulation } from './physics';

const methods: Method[] = ['discrete', 'continuous'];
const colors = { discrete: '#a96036', continuous: '#217e73' };
const font = "-apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";

export function createSection(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d');
  if (!context) throw new Error('2D canvas is unavailable');
  const ctx = context;
  let width = 1;
  let height = 1;
  let state: Simulation | undefined;
  let pathVisible = true;

  function draw() {
    if (!state) return;
    const { start, speed, hz, radius, thickness, wallX } = state.config;
    const minimum = start - 1.5;
    const maximum = Math.max(6, wallX + thickness / 2 + radius + speed / hz + 1.5);
    const compact = width < 620;
    const left = compact ? 24 : Math.max(48, width * 0.075);
    const right = width - left;
    const scale = (right - left) / (maximum - minimum);
    const X = (x: number) => left + (x - minimum) * scale;
    const gap = compact ? 142 : Math.min(190, Math.max(152, height * 0.29));
    const firstY = Math.max(72, (height - gap - 135) / 2);
    ctx.clearRect(0, 0, width, height);

    function text(value: string, x: number, y: number, color: string, size = 11, weight = 400) {
      ctx.font = `${weight} ${size}px ${font}`;
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      const half = ctx.measureText(value).width / 2;
      ctx.fillText(value, Math.max(half + 10, Math.min(width - half - 10, x)), y);
    }

    function circle(x: number, y: number, r: number, fill: boolean) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      if (fill) ctx.fill();
      else ctx.stroke();
    }

    for (const [index, method] of methods.entries()) {
      const y = firstY + index * gap;
      const body = state[method];
      const from = state.tick === 0 ? body.x : body.prev;
      const to = state.tick === 0 ? body.x + speed / hz : body.next;
      const color = colors[method];
      ctx.fillStyle = index === 0 ? '#f3e9dc' : '#e3eee7';
      ctx.beginPath();
      ctx.roundRect(left - 10, y - 35, right - left + 20, 70, 10);
      ctx.fill();
      ctx.strokeStyle = '#c7d4cd';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.stroke();
      const wallLeft = X(wallX - thickness / 2);
      ctx.fillStyle = '#a3b4ae';
      ctx.fillRect(wallLeft, y - 33, thickness * scale, 66);
      ctx.strokeStyle = '#748c83';
      ctx.strokeRect(wallLeft, y - 33, thickness * scale, 66);
      ctx.font = `600 ${compact ? 12 : 14}px ${font}`;
      ctx.fillStyle = color;
      ctx.textAlign = 'left';
      ctx.fillText(index === 0 ? 'A  위치만 확인' : 'B  경로 확인', left, y - 54);
      text('벽', X(wallX), y - 39, '#637a70', 10);

      if (pathVisible) {
        ctx.fillStyle = method === 'continuous' ? '#217e7317' : '#a9603609';
        ctx.fillRect(X(from), y - radius * scale, (to - from) * scale, radius * 2 * scale);
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        ctx.moveTo(X(from), y);
        ctx.lineTo(X(to), y);
        ctx.stroke();
        circle(X(from), y, Math.max(2, radius * scale), false);
        circle(X(to), y, Math.max(2, radius * scale), false);
        ctx.globalAlpha = 1;
        ctx.setLineDash([]);
        ctx.strokeStyle = '#8e9f95';
        ctx.beginPath();
        ctx.moveTo(X(from), y + Math.max(4, radius * scale));
        ctx.lineTo(X(from), y + 39);
        ctx.moveTo(X(to), y + Math.max(4, radius * scale));
        ctx.lineTo(X(to), y + 57);
        ctx.stroke();
        text(state.tick === 0 ? '시작 위치' : '이전 위치', X(from), y + 51, '#687d71', compact ? 10 : 11);
        text('충돌이 없을 때 예정 위치', X(to), y + 70, '#687d71', compact ? 10 : 11);
      }
      ctx.fillStyle = color;
      circle(X(body.x), y, Math.max(2, radius * scale), true);
      if (body.status === 'hit' && method === 'continuous') {
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        circle(wallLeft, y, 3.5, true);
        circle(wallLeft, y, 3.5, false);
      }
    }

    const axisY = firstY + gap + 91;
    ctx.strokeStyle = '#c2d0c6';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(left, axisY);
    ctx.lineTo(right, axisY);
    ctx.stroke();
    const interval = maximum - minimum > 25 ? 10 : 5;
    const ticks = new Set([start, 0]);
    for (let x = interval; x < maximum; x += interval) ticks.add(x);
    for (const x of ticks) {
      ctx.beginPath();
      ctx.moveTo(X(x), axisY - 3);
      ctx.lineTo(X(x), axisY + 3);
      ctx.stroke();
      text(`${x > 0 ? '+' : ''}${x} m`, X(x), axisY + 17, '#657b6f', 10);
    }

    if (state.continuous.status === 'hit') {
      const center = state.continuous.x;
      const surface = wallX - thickness / 2;
      const infoY = Math.min(height - 20, axisY + 48);
      text(`B 최초 접촉  ·  중심 ${center.toFixed(2)} m  /  벽 표면 ${surface.toFixed(2)} m`, width / 2, infoY, colors.continuous, compact ? 10 : 12, 500);
    }
  }

  return {
    update(next: Simulation, showPath: boolean) {
      state = next;
      pathVisible = showPath;
      draw();
    },
    resize(nextWidth: number, nextHeight: number) {
      width = Math.max(1, nextWidth);
      height = Math.max(1, nextHeight);
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      draw();
    },
  };
}
