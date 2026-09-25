import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import ts from 'typescript';
import * as model from './model.ts';

function client() {
    const elements = new Map<string, Record<string, any>>();
    const listeners = new Map<string, (event: any) => void>();
    const values: Record<string, string> = {
        method: 'semi', hz: '10', fps: '60', fall: '1', release: '1200', cut: '3',
        acceleration: '20', braking: '12', air: '50',
    };
    let frame: (now: number) => void = () => {};
    let now = 0, bodyY = 0, cancellations = 0, disconnections = 0;
    const ctx = new Proxy({
        fillStyle: '',
        fillRect(_x: number, y: number) {
            if (this.fillStyle === '#167d73') bodyY = y;
        },
    }, { get: (target, key) => key in target ? target[key as keyof typeof target] : () => {} });
    const element = (id: string) => {
        if (!elements.has(id)) elements.set(id, {
            value: values[id] ?? '', checked: id === 'interpolate', hidden: true,
            textContent: '', setAttribute() {}, focus() {}, getContext: () => ctx,
            getBoundingClientRect: () => ({ width: 900, height: 450 }),
        });
        return elements.get(id)!;
    };
    const context = createContext({
        exports: {}, require: () => model, devicePixelRatio: 1,
        document: { getElementById: element, addEventListener() {} },
        window: { addEventListener: (name: string, callback: (event: any) => void) => listeners.set(name, callback) },
        performance: { now: () => now },
        ResizeObserver: class {
            observe() {}
            disconnect() { disconnections++; }
        },
        requestAnimationFrame: (callback: (time: number) => void) => { frame = callback; return 1; },
        cancelAnimationFrame: () => { cancellations++; },
    });
    runInContext(ts.transpileModule(readFileSync(new URL('./client.ts', import.meta.url), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText, context);
    frame(0);
    return {
        element, context, body: () => bodyY,
        counts: () => ({ cancellations, disconnections }),
        advance(time: number) { now = time; frame(time); },
        lifecycle(name: string, persisted: boolean, time: number) {
            now = time;
            listeners.get(name)!({ persisted });
        },
    };
}

test('a paused manual step keeps the current physical position in later render frames', () => {
    const c = client();
    c.element('step').onclick();
    assert.match(c.element('log').textContent, /물리 높이 0.800m/);
    const current = c.body();
    c.advance(200);
    assert.equal(c.body(), current);
    c.advance(1000);
    assert.equal(c.body(), current);
    assert.equal(runInContext('y', c.context), 0.8);
});

test('two cached departures preserve playback and resize, then a real departure cleans up', () => {
    const c = client();
    c.element('jump').onclick();
    for (let cycle = 1; cycle <= 2; cycle++) {
        c.lifecycle('pagehide', true, cycle * 1000);
        c.lifecycle('pageshow', true, cycle * 1000 + 500);
        const before = runInContext('time', c.context);
        c.advance(cycle * 1000 + 600);
        assert.ok(runInContext('time', c.context) > before);
        assert.equal(c.element('scene').width, 900);
        assert.equal(c.element('scene').height, 450);
        assert.deepEqual(c.counts(), { cancellations: 0, disconnections: 0 });
    }
    c.lifecycle('pagehide', false, 3000);
    assert.deepEqual(c.counts(), { cancellations: 1, disconnections: 1 });
});

test('live exact integration lands at one second and releases at the selected tick', () => {
    const c = client();
    c.element('method').value = 'analytic';
    c.element('hz').value = '60';
    c.element('reset').onclick();
    for (let i = 0; i < 60; i++) c.element('step').onclick();
    assert.equal(runInContext('airborne', c.context), false);
    assert.equal(runInContext('y', c.context), 0);
    c.element('release').value = '100';
    c.element('cut').value = '0';
    c.element('reset').onclick();
    for (let i = 0; i < 7; i++) c.element('step').onclick();
    assert.equal(runInContext('released', c.context), true);
    assert.ok(Math.abs(Number(runInContext('peak', c.context)) - 0.9) < 1e-10);
});
