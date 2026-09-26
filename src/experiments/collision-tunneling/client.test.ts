import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import ts from 'typescript';
import * as physics from './physics.ts';

async function client(compact = false, webgl = true) {
    const elements = new Map<string, Record<string, any>>();
    const values: Record<string, string> = {
        speed: '90', thickness: '0.3', hz: '10', radius: '0.16', 'playback-speed': '0.1',
    };
    let frame: (time: number) => void = () => {};
    let cameraResets = 0;
    const documentListeners = new Map<string, (event: any) => void>();
    const element = (id: string) => {
        if (!elements.has(id)) {
            const attributes = new Map<string, string>();
            const classes = new Set<string>();
            const listeners = new Map<string, (event: any) => void>();
            elements.set(id, {
                value: values[id] ?? '', defaultValue: values[id] ?? '',
                checked: id === 'show-path', defaultChecked: id === 'show-path',
                hidden: true, disabled: false, open: false, textContent: '',
                min: '0', max: '240', clientWidth: 1000, clientHeight: 700,
                style: { setProperty() {} },
                classList: {
                    add: (name: string) => classes.add(name),
                    remove: (name: string) => classes.delete(name),
                    toggle(name: string, on: boolean) { if (on) classes.add(name); else classes.delete(name); },
                    contains: (name: string) => classes.has(name),
                },
                setAttribute: (name: string, value: string) => attributes.set(name, value),
                getAttribute: (name: string) => attributes.get(name),
                addEventListener: (name: string, callback: (event: any) => void) => listeners.set(name, callback),
                emit(name: string) { listeners.get(name)?.({ currentTarget: this, target: this }); },
                focus() {}, querySelectorAll: () => [],
                showModal() { this.open = true; }, close() { this.open = false; },
            });
        }
        return elements.get(id)!;
    };
    const setSettingsOpen = (open: boolean) => {
        element('settings').hidden = !open;
        element('menu-toggle').setAttribute('aria-expanded', String(open));
    };
    setSettingsOpen(!compact);
    element('menu-toggle').addEventListener('click', () => setSettingsOpen(element('settings').hidden));
    element('close-settings').addEventListener('click', () => setSettingsOpen(false));
    element('reset-all').addEventListener('click', () => documentListeners.get('experiment:reset-all')?.({ preventDefault() {} }));
    const scene = {
        update() {},
        resetCamera() { cameraResets++; }, resize() {}, render() {}, dispose() {},
    };
    const context = createContext({
        exports: {},
        require(name: string) {
            if (name === '../../layouts/experiment-layout') return { setSettingsOpen };
            if (name === './physics') return physics;
            if (name === './render-2d') return { createSection: () => ({ update() {}, resize() {} }) };
            if (name === './render-3d') return { createScene() { if (!webgl) throw new Error('WebGL unavailable'); return scene; } };
            throw new Error(`Unexpected import ${name}`);
        },
        document: {
            hidden: false, addEventListener: (name: string, callback: (event: any) => void) => documentListeners.set(name, callback), querySelector: () => element('lab'),
            getElementById: (id: string) => id === 'explain-quick' ? null : element(id),
        },
        window: { addEventListener() {}, matchMedia: () => ({ matches: compact, addEventListener() {} }) },
        ResizeObserver: class { observe() {} disconnect() {} },
        requestAnimationFrame: (callback: (time: number) => void) => { frame = callback; return 1; },
        cancelAnimationFrame() {},
    });
    runInContext(ts.transpileModule(readFileSync(new URL('./client.ts', import.meta.url), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText, context);
    await new Promise<void>((resolve) => setImmediate(resolve));
    return {
        element,
        click: (id: string) => element(id).emit('click'),
        input(id: string, value: string) { element(id).value = value; element(id).emit('input'); },
        path(checked: boolean) { element('show-path').checked = checked; element('show-path').emit('change'); },
        frame: (time: number) => frame(time),
        state: () => runInContext('simulation', context) as physics.Simulation,
        playing: () => runInContext('playing', context) as boolean,
        view: () => runInContext('view', context) as string,
        camera: () => ({ resets: cameraResets }),
    };
}

function assertDefaultSettings(c: Awaited<ReturnType<typeof client>>) {
    for (const field of ['speed', 'thickness', 'hz', 'radius'] as const) {
        assert.equal(Number(c.element(field).value), physics.DEFAULTS[field]);
    }
    assert.equal(c.element('playback-speed').value, '0.1');
    assert.equal(c.element('show-path').checked, true);
    assert.equal(c.element('preset-miss').getAttribute('aria-pressed'), 'true');
    assert.equal(c.element('preset-fix').getAttribute('aria-pressed'), 'false');
}

for (const [compact, webgl] of [[false, true], [true, true], [true, false]] as const) {
    test(`full reset restores settings, stopped origin, available view and default menu (compact=${compact}, webgl=${webgl})`, async () => {
        const c = await client(compact, webgl);
        c.input('speed', '5');
        c.input('hz', '120');
        c.path(false);
        c.element('playback-speed').value = '1';
        c.click('view-2d');
        c.click('menu-toggle');
        c.click('play');
        c.frame(0);
        c.frame(250);
        const resets = c.camera().resets;
        c.click('reset-all');
        assertDefaultSettings(c);
        assert.deepEqual(c.state(), physics.createSimulation());
        assert.equal(c.playing(), false);
        assert.equal(c.view(), webgl ? '3d' : '2d');
        assert.equal(c.element('settings').hidden, compact);
        assert.equal(c.element('menu-toggle').getAttribute('aria-expanded'), String(!compact));
        assert.equal(c.camera().resets, resets + (webgl ? 1 : 0));
        assert.equal(c.element('reset-all').disabled, false);
    });
}

test('playback reset returns to zero without resetting settings, view or menu', async () => {
    const c = await client();
    c.input('speed', '5');
    c.input('hz', '120');
    c.path(false);
    c.element('playback-speed').value = '1';
    c.click('view-2d');
    c.click('close-settings');
    c.click('play');
    c.frame(0);
    c.frame(250);
    const config = { ...c.state().config };
    const resets = c.camera().resets;
    c.click('reset');
    assert.deepEqual(c.state(), physics.createSimulation(config));
    assert.equal(c.playing(), false);
    assert.equal(c.element('speed').value, '5');
    assert.equal(c.element('hz').value, '120');
    assert.equal(c.element('show-path').checked, false);
    assert.equal(c.element('playback-speed').value, '1');
    assert.equal(c.view(), '2d');
    assert.equal(c.element('settings').hidden, true);
    assert.equal(c.camera().resets, resets);
});
