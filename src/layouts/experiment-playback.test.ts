import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import ts from 'typescript';

function playback(limit = Infinity) {
    const elements = new Map<string, any>();
    const element = (id: string) => {
        if (!elements.has(id)) {
            const events = new Map<string, (() => void)[]>();
            elements.set(id, {
                textContent: '', attributes: new Map<string, string>(),
                setAttribute(name: string, value: string) { this.attributes.set(name, value); },
                addEventListener(name: string, callback: () => void) { events.set(name, [...events.get(name) ?? [], callback]); },
                click() { for (const callback of events.get('click') ?? []) callback(); },
            });
        }
        return elements.get(id)!;
    };
    const timers = new Map<number, () => void>();
    const windowEvents = new Map<string, () => void>();
    let timerId = 0, steps = 0;
    const exports: { createPlayback?: (options: any) => { pause(): void } } = {};
    const context = createContext({
        exports, document: { getElementById: element },
        window: { addEventListener: (name: string, callback: () => void) => windowEvents.set(name, callback) },
        setInterval(callback: () => void) { timers.set(++timerId, callback); return timerId; },
        clearInterval: (id: number) => timers.delete(id),
    });
    runInContext(ts.transpileModule(readFileSync(new URL('../components/experiment-playback.ts', import.meta.url), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText, context);
    const controller = exports.createPlayback!({ advance: () => ++steps < limit });
    return {
        element, timers, controller, steps: () => steps,
        frame() { for (const callback of [...timers.values()]) callback(); },
        pagehide() { windowEvents.get('pagehide')!(); },
    };
}

test('play starts stopped and pause retains the completed work without a second timer', () => {
    const p = playback();
    assert.equal(p.steps(), 0);
    assert.equal(p.element('play').attributes.get('aria-pressed'), 'false');
    p.element('play').click();
    assert.equal(p.steps(), 1);
    assert.equal(p.timers.size, 1);
    assert.equal(p.element('play').attributes.get('aria-pressed'), 'true');
    p.frame();
    p.element('play').click();
    p.frame();
    assert.equal(p.steps(), 2);
    assert.equal(p.timers.size, 0);
    p.element('play').click();
    assert.equal(p.steps(), 3);
    assert.equal(p.timers.size, 1);
});

test('step pauses playback and advances exactly once', () => {
    const p = playback();
    p.element('play').click();
    p.element('step').click();
    p.frame();
    assert.equal(p.steps(), 2);
    assert.equal(p.timers.size, 0);
    assert.equal(p.element('play').attributes.get('aria-pressed'), 'false');
});

test('a completed advance stops its timer and restores the play button', () => {
    const p = playback(2);
    p.element('play').click();
    p.frame();
    p.frame();
    assert.equal(p.steps(), 2);
    assert.equal(p.timers.size, 0);
    assert.equal(p.element('play').textContent, '실험 재생');
    assert.equal(p.element('play').attributes.get('aria-pressed'), 'false');
});

test('reset and page exit cancel automatic work without performing another step', () => {
    const p = playback();
    p.element('play').click();
    p.element('reset').click();
    p.frame();
    assert.equal(p.steps(), 1);
    assert.equal(p.timers.size, 0);
    p.element('play').click();
    p.pagehide();
    p.frame();
    assert.equal(p.steps(), 2);
    assert.equal(p.timers.size, 0);
});
