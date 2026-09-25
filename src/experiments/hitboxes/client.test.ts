import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import ts from 'typescript';
import * as model from './model.ts';

test('a hit stops the rest of the accumulated ticks and resumes only after the stop ends', () => {
    const elements = new Map<string, Record<string, any>>();
    const values: Record<string, string> = { distance: '110', reach: '120', hitstop: '150' };
    let frame: (now: number) => void = () => {};
    const element = (id: string) => {
        if (!elements.has(id))
            elements.set(id, {
                value: values[id] ?? '',
                checked: id === 'areas' || id === 'shapes',
                hidden: true,
                textContent: '',
                setAttribute() {},
                focus() {},
                getContext: () => new Proxy({}, { get: () => () => {} }),
            });
        return elements.get(id)!;
    };
    const context = createContext({
        exports: {},
        require: () => model,
        document: { getElementById: element, addEventListener() {} },
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
    for (let i = 0; i < 5; i++) element('step').onclick();
    element('play').onclick();
    frame(100);
    assert.equal(runInContext('tick', context), 6);
    assert.equal(element('naive-result').textContent, '2 회 · 20 피해');
    assert.equal(element('dedupe-result').textContent, '1 회 · 10 피해');
    frame(200);
    assert.equal(runInContext('tick', context), 6);
    frame(260);
    assert.equal(runInContext('tick', context), 6);
    frame(310);
    assert.equal(runInContext('tick', context), 7);
});
