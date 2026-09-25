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
        scenario: 'manual',
        hz: '60',
        offset: '50',
        coyote: '80',
        buffer: '100',
    };
    let frame: (now: number) => void = () => {};
    const element = (id: string) => {
        if (!elements.has(id))
            elements.set(id, {
                value: values[id] ?? '',
                checked: id === 'hold-example',
                hidden: true,
                textContent: '',
                tagName: id === 'scene' ? 'CANVAS' : 'BUTTON',
                setAttribute() {},
                focus() {},
                setPointerCapture() {},
                getContext: () => new Proxy({}, { get: () => () => {} }),
            });
        return elements.get(id)!;
    };
    const context = createContext({
        exports: {},
        require: () => model,
        document: {
            getElementById: element,
            addEventListener: (name: string, callback: (event: any) => void) => listeners.set(name, callback),
        },
        window: { addEventListener() {} },
        ResizeObserver: class {
            observe() {}
            disconnect() {}
        },
        requestAnimationFrame: (callback: (now: number) => void) => {
            frame = callback;
            return 1;
        },
        cancelAnimationFrame() {},
    });
    const source = readFileSync(new URL('./client.ts', import.meta.url), 'utf8');
    runInContext(
        ts.transpileModule(source, {
            compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
        }).outputText,
        context,
    );
    frame(0);
    return {
        element,
        advance: (now: number) => frame(now),
        press: () =>
            listeners.get('keydown')!({
                key: ' ',
                code: 'Space',
                repeat: false,
                target: element('scene'),
                preventDefault() {},
            }),
        release: () => listeners.get('keyup')!({ key: ' ', code: 'Space', target: element('scene') }),
    };
}

test('a fresh direct press is assigned to the next physics tick in both comparisons', () => {
    const c = client();
    c.press();
    c.advance(17);
    assert.match(c.element('raw-result').textContent, /17ms · 점프 1회/);
    assert.match(c.element('fixed-result').textContent, /17ms · 점프 1회/);
    c.press();
    c.advance(34);
    assert.match(c.element('raw-result').textContent, /점프 1회/);
    assert.match(c.element('fixed-result').textContent, /점프 1회/);
});

test('releasing a queued press before its tick still honors the held-input policy', () => {
    const c = client();
    c.element('require-held').checked = true;
    c.press();
    c.release();
    c.advance(17);
    c.advance(34);
    assert.doesNotMatch(c.element('raw-result').textContent, /점프 1회/);
    assert.doesNotMatch(c.element('fixed-result').textContent, /점프 1회/);
});
