import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSimulation, stepSimulation } from './physics.ts';
import { createSection } from './render-2d.ts';

const pageStyles = readFileSync(new URL('../../styles/collision-tunneling.css', import.meta.url), 'utf8');
const layoutStyles = readFileSync(new URL('../../styles/experiment-layout.css', import.meta.url), 'utf8');

function minimumHeight(mobile: boolean) {
  const override = pageStyles.match(/--experiment-graphics-min-height:\s*(\d+)px/);
  const defaults = [...layoutStyles.matchAll(/minmax\(var\(--experiment-graphics[^;]+?,\s*(\d+)px\)/g)];
  return Number(override?.[1] ?? defaults[mobile ? 1 : 0]![1]);
}

for (const [name, width, mobile] of [['mobile', 343, true], ['desktop', 1080, false]] as const) {
  test(`2D comparison labels remain visible and separated at the ${name} minimum height`, () => {
    const height = minimumHeight(mobile);
    const labels: { text: string; y: number; size: number }[] = [];
    const context = new Proxy({
      font: '',
      measureText: (value: string) => ({ width: value.length * 6 }),
      fillText(value: string, _x: number, y: number) {
        labels.push({ text: value, y, size: Number(this.font.match(/(\d+)px/)![1]) });
      },
    }, {
      get(target, key) { return key in target ? Reflect.get(target, key) : () => {}; },
    });
    const canvas = { getContext: () => context } as unknown as HTMLCanvasElement;
    const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { devicePixelRatio: 1 } });
    try {
      const section = createSection(canvas);
      section.resize(width, height);
      const state = createSimulation();
      stepSimulation(state);
      section.update(state, true);
    } finally {
      if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
      else Reflect.deleteProperty(globalThis, 'window');
    }
    for (const label of labels) {
      assert.ok(label.y - label.size >= 0 && label.y + 3 <= height, `${label.text} is clipped at y=${label.y} in height=${height}`);
    }
    const axisLabels = labels.filter(({ text }) => /^[+-]?\d+ m$/.test(text));
    const contact = labels.find(({ text }) => text.startsWith('B 최초 접촉'))!;
    assert.ok(axisLabels.length > 0);
    assert.ok(contact.y - contact.size > Math.max(...axisLabels.map(({ y }) => y + 3)), 'contact explanation overlaps the distance axis labels');
  });
}
