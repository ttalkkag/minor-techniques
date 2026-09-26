import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import ts from 'typescript';
import * as channelModel from './model.ts';
import * as musicModel from '../adaptive-music/model.ts';

function experiment(id: 'audio-channel-budget' | 'adaptive-music') {
    const values: Record<string, string> = {
        bpm: '120', lead: '.15', volume: '12', structure: 'layer', timing: 'bar', visual: '60',
        'effect-channel': '3', priority: '2', duration: '1.5', budget: '4', seconds: '60',
        rate: '48000', outputs: '2', bank: '200', semitones: '0',
    };
    const elements = new Map<string, any>();
    const element = (name: string) => {
        if (!elements.has(name)) elements.set(name, {
            value: values[name] ?? '', checked: ['cancel', 'replace'].includes(name),
            textContent: '', dataset: {}, attributes: new Map(), onclick: undefined,
            setAttribute(key: string, value: string) { this.attributes.set(key, value); },
            getAttribute(key: string) { return this.attributes.get(key); },
            addEventListener() {}, querySelectorAll: () => [],
            getBoundingClientRect: () => ({ width: 800, height: 450 }),
            getContext: () => new Proxy({}, { get: () => () => {} }),
        });
        return elements.get(name)!;
    };
    const parameter = () => ({ value: 0, setValueAtTime() {}, setTargetAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} });
    const node = () => ({
        gain: parameter(), frequency: parameter(), playbackRate: parameter(),
        connect(target: unknown) { return target; }, start() {}, stop() {}, disconnect() {},
    });
    const contexts: { currentTime: number }[] = [];
    class AudioContext {
        currentTime = 0;
        sampleRate = 100;
        destination = {};
        constructor() { contexts.push(this); }
        async resume() {}
        async close() {}
        createGain = node;
        createOscillator = node;
        createBufferSource = node;
        createBuffer(_channels: number, length: number) {
            const samples = new Float32Array(length);
            return { getChannelData: () => samples };
        }
    }
    const context = createContext({
        exports: {}, AudioContext, devicePixelRatio: 1,
        document: { getElementById: element },
        window: { setInterval: () => 1, addEventListener() {} },
        clearInterval() {}, requestAnimationFrame: () => 1, cancelAnimationFrame() {},
        ResizeObserver: class { observe() {} disconnect() {} },
    });
    const compile = (path: URL) => ts.transpileModule(readFileSync(path, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const playback = runInContext(`(() => { const exports = {}; ${compile(new URL('../../components/experiment-playback.ts', import.meta.url))}; return exports; })()`, context);
    context.require = (path: string) => path.includes('experiment-playback') ? playback : id === 'adaptive-music' ? musicModel : channelModel;
    runInContext(compile(new URL(`../${id}/client.ts`, import.meta.url)), context);
    return {
        element,
        async click(name: string) {
            element(name).onclick();
            for (let i = 0; i < 4; i++) await Promise.resolve();
        },
        advance(seconds: number) { contexts.at(-1)!.currentTime += seconds; },
        read(expression: string) { return runInContext(expression, context); },
    };
}

for (const id of ['adaptive-music', 'audio-channel-budget'] as const) {
    test(`${id}: pause and resume preserve the experiment clock`, async () => {
        const e = experiment(id);
        await e.click('play');
        e.advance(1);
        await e.click('play');
        const paused = e.read('time');
        assert.ok(paused > .9);
        assert.equal(e.read('running'), false);
        assert.equal(e.element('play').getAttribute('aria-pressed'), 'false');
        await e.click('play');
        assert.equal(e.read('time'), paused);
        e.advance(.5);
        await e.click('play');
        assert.ok(e.read('time') > paused + .4);
        await e.click('reset');
        assert.equal(e.read('time'), 0);
    });
}

test('adaptive music keeps a pending transition while pausing and single-stepping', async () => {
    const e = experiment('adaptive-music');
    await e.click('combat');
    const reservation = e.read('pending.at');
    await e.click('play');
    e.advance(.5);
    await e.click('step');
    assert.equal(e.read('running'), false);
    assert.equal(e.read('pending.at'), reservation);
    assert.ok(e.read('time') > .5);
    await e.click('play');
    e.advance(1.5);
    e.read('scheduler()');
    assert.equal(e.read('pending'), null);
    assert.equal(e.read('segments.length'), 2);
    assert.equal(e.read('events.filter(event => event.includes("실행")).length'), 1);
    const scheduled = e.read('scheduled.size');
    e.read('scheduler()');
    assert.equal(e.read('scheduled.size'), scheduled);
    await e.click('reset');
    assert.equal(e.read('pending'), null);
});

test('audio channel pause retains ownership and a step advances the same expiry clock', async () => {
    const e = experiment('audio-channel-budget');
    await e.click('effect');
    await e.click('play');
    e.advance(.5);
    await e.click('play');
    assert.equal(e.read('owners[3].kind'), 'effect');
    assert.equal(e.read('time'), .5);
    await e.click('step');
    assert.equal(e.read('time'), 1);
    assert.equal(e.read('owners[3].kind'), 'effect');
    await e.click('step');
    assert.equal(e.read('time'), 1.5);
    assert.equal(e.read('owners[3].kind'), 'music');
});
