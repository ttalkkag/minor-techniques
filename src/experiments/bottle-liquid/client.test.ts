import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import ts from 'typescript';
import * as model from './model.ts';

test('two cached departures stop sloshing and allow a fresh impulse after each return', () => {
    const elements = new Map<string, any>();
    const listeners = new Map<string, ((event: any) => void)[]>();
    const frames = new Map<number, (time: number) => void>();
    const values: Record<string, string> = {
        tilt: '55',
        fill: '40',
        damping: '0.25',
        shape: 'bottle',
        level: 'fixed',
    };
    let nextFrame = 0;
    let observing = false;
    const ctx = new Proxy(
        {},
        {
            get: (_, key) => (key === 'createLinearGradient' ? () => ({ addColorStop() {} }) : () => {}),
        },
    );
    const element = (id: string) => {
        if (!elements.has(id))
            elements.set(id, {
                value: values[id] ?? '',
                hidden: true,
                open: false,
                textContent: '',
                handlers: new Map<string, () => void>(),
                addEventListener(event: string, callback: () => void) {
                    this.handlers.set(event, callback);
                },
                setAttribute() {},
                removeAttribute() {},
                focus() {},
                getContext: () => ctx,
                getBoundingClientRect: () => ({ width: 400, height: 630 }),
            });
        return elements.get(id);
    };
    const context = createContext({
        exports: {},
        require: () => model,
        devicePixelRatio: 1,
        performance: { now: () => 0 },
        document: {
            getElementById: element,
            querySelectorAll: () => [],
            addEventListener() {},
        },
        window: {
            addEventListener(name: string, callback: (event: any) => void) {
                listeners.set(name, [...(listeners.get(name) ?? []), callback]);
            },
        },
        ResizeObserver: class {
            observe() {
                observing = true;
            }
            disconnect() {
                observing = false;
            }
        },
        requestAnimationFrame: (callback: (time: number) => void) => {
            frames.set(++nextFrame, callback);
            return nextFrame;
        },
        cancelAnimationFrame: (id: number) => frames.delete(id),
    });
    runInContext(
        ts.transpileModule(readFileSync(new URL('./client.ts', import.meta.url), 'utf8'), {
            compilerOptions: {
                module: ts.ModuleKind.CommonJS,
                target: ts.ScriptTarget.ES2022,
            },
        }).outputText,
        context,
    );
    const emit = (name: string) => listeners.get(name)?.forEach((callback) => callback({ persisted: true }));
    for (let cycle = 0; cycle < 2; cycle++) {
        element('pulse').handlers.get('click')();
        assert.equal(frames.size, 1);
        const [id, callback] = [...frames][0]!;
        frames.delete(id);
        callback(16);
        assert.ok(runInContext('slosh', context) > 0);
        emit('pagehide');
        assert.equal(frames.size, 0);
        assert.equal(runInContext('frame', context), 0);
        assert.equal(runInContext('slosh + velocity', context), 0);
        emit('pageshow');
        assert.equal(observing, true);
    }
    element('pulse').handlers.get('click')();
    assert.equal(frames.size, 1);
});
