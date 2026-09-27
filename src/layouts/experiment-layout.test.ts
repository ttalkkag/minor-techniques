import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import ts from 'typescript';

function layout(mobile = false) {
    class Element {
        value = '';
        dataset: Record<string, string> = {};
        events: string[] = [];
        hidden = false;
        inert = false;
        visible = true;
        attributes = new Map<string, string>();
        listeners = new Map<string, () => void>();
        children: Element[] = [];
        setAttribute(name: string, value: string) { this.attributes.set(name, value); }
        getAttribute(name: string) { return this.attributes.get(name) ?? null; }
        removeAttribute(name: string) { this.attributes.delete(name); }
        toggleAttribute(name: string, on: boolean) {
            if (on) this.setAttribute(name, '');
            else this.removeAttribute(name);
        }
        addEventListener(name: string, callback: () => void) { this.listeners.set(name, callback); }
        dispatchEvent(event: { type: string }) {
            this.events.push(event.type);
            this.listeners.get(event.type)?.();
            return true;
        }
        click() { this.listeners.get('click')?.(); }
        focus() { document.activeElement = this; }
        contains(element: Element) { return element === this || this.children.includes(element); }
        getClientRects() { return this.visible ? [{}] : []; }
        querySelectorAll(_selector: string) { return this.children; }
    }
    const settings = new Element(), toggle = new Element(), close = new Element(), backdrop = new Element();
    const resetAll = new Element(), playbackReset = new Element(), help = new Element(), play = new Element();
    let resets = 0, reloads = 0, playClicks = 0;
    playbackReset.addEventListener('click', () => resets++);
    play.setAttribute('aria-pressed', 'false');
    play.addEventListener('click', () => {
        playClicks++;
        play.setAttribute('aria-pressed', String(play.getAttribute('aria-pressed') !== 'true'));
    });
    const viewSelect = new Element(), viewScene = new Element(), viewSection = new Element();
    viewSelect.value = 'scene';
    viewScene.dataset = { viewSelect: 'view', viewValue: 'scene' };
    viewSection.dataset = { viewSelect: 'view', viewValue: 'section' };
    const viewButtons = [viewScene, viewSection];
    const range = new Element(), last = new Element(), hiddenControl = new Element();
    hiddenControl.visible = false;
    settings.children = [close, range, last, hiddenControl];
    const content = new Element(), actions = new Element(), brand = new Element(), outside = new Element();
    const regions = [content, actions, brand];
    const shell = new Element();
    const selectors = new Map([
        ['[data-experiment-region="settings"]', settings], ['[data-settings-toggle]', toggle],
        ['[data-settings-close]', close], ['[data-settings-backdrop]', backdrop],
        ['[data-experiment-reset-all]', resetAll], ['[data-playback-reset]', playbackReset],
        ['[data-experiment-help]', help], ['[data-experiment-play]', play],
    ]);
    Object.assign(shell, {
        querySelector: (selector: string) => selectors.get(selector),
        querySelectorAll: (selector: string) => selector === '[data-view-select]' ? viewButtons : regions,
    });
    const keyListeners: ((event: any) => void)[] = [];
    const resetListeners: ((event: any) => void)[] = [];
    const changes: { open: boolean; overlay: boolean }[] = [];
    let dialogOpen = false;
    const document = {
        activeElement: outside,
        querySelector: (selector: string) => selector === 'dialog[open]' ? (dialogOpen ? {} : null) : shell,
        querySelectorAll: (selector: string) => selector === '[data-view-select]' ? viewButtons : [],
        getElementById: (id: string) => id === 'view' ? viewSelect : null,
        addEventListener(name: string, callback: (event: any) => void) {
            if (name === 'keydown') keyListeners.push(callback);
            if (name === 'experiment:reset-all') resetListeners.push(callback);
        },
        dispatchEvent(event: any) {
            if (event.type === 'experiment:reset-all') {
                for (const callback of resetListeners) callback(event);
            } else changes.push(event.detail);
            return !event.defaultPrevented;
        },
    };
    let breakpointChanged = () => {};
    const media = {
        matches: mobile,
        addEventListener(_name: string, callback: () => void) { breakpointChanged = callback; },
    };
    const exports: { setSettingsOpen?: (open: boolean, focus?: boolean) => void; syncViewControls?: () => void } = {};
    const context = createContext({
        exports, document, window: { matchMedia: () => media, location: { reload() { reloads++; } } },
        Event: class { type: string; constructor(type: string) { this.type = type; } },
        CustomEvent: class {
            detail: unknown;
            type: string;
            defaultPrevented = false;
            constructor(type: string, options: { detail?: unknown }) { this.type = type; this.detail = options.detail; }
            preventDefault() { this.defaultPrevented = true; }
        },
    });
    const source = readFileSync(new URL('./experiment-layout.ts', import.meta.url), 'utf8');
    runInContext(ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText, context);
    return {
        settings, toggle, close, backdrop, range, last, hiddenControl, outside, regions, document, shell, changes,
        viewSelect, viewScene, viewSection,
        resetAll, resetCounts: () => ({ resets, reloads }),
        help, play, playClicks: () => playClicks,
        syncViews: () => exports.syncViewControls!(),
        setOpen: (open: boolean, focus = true) => exports.setSettingsOpen!(open, focus),
        setMobile(value: boolean) { media.matches = value; breakpointChanged(); },
        setDialog(value: boolean) { dialogOpen = value; },
        key(key: string, shiftKey = false) {
            const event = { key, shiftKey, prevented: false, preventDefault() { this.prevented = true; } };
            for (const listener of keyListeners) listener(event);
            return event;
        },
    };
}

test('opening help pauses a running experiment without starting an idle experiment', () => {
    const l = layout();
    l.help.click();
    assert.equal(l.playClicks(), 0);
    l.play.click();
    l.help.click();
    assert.equal(l.play.getAttribute('aria-pressed'), 'false');
    assert.equal(l.playClicks(), 2);
    l.help.click();
    assert.equal(l.playClicks(), 2);
});

test('full reset clears the current experiment before reloading all page state', () => {
    const l = layout();
    l.resetAll.click();
    assert.deepEqual(l.resetCounts(), { resets: 1, reloads: 1 });
});

test('an experiment can restore its complete state without a page reload', () => {
    const l = layout();
    let customResets = 0;
    l.document.addEventListener('experiment:reset-all', (event) => {
        event.preventDefault();
        customResets++;
    });
    l.resetAll.click();
    assert.equal(customResets, 1);
    assert.deepEqual(l.resetCounts(), { resets: 0, reloads: 0 });
});

test('desktop starts with a complementary settings column and can collapse and reopen it', () => {
    const l = layout();
    assert.equal(l.settings.hidden, false);
    assert.equal(l.settings.getAttribute('role'), 'complementary');
    assert.equal(l.settings.getAttribute('aria-modal'), null);
    assert.equal(l.backdrop.hidden, true);
    assert.ok(l.regions.every((region) => !region.inert));
    assert.equal(l.document.activeElement, l.outside);
    l.close.click();
    assert.equal(l.settings.hidden, true);
    assert.equal(l.toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(l.document.activeElement, l.toggle);
    l.toggle.click();
    assert.equal(l.settings.hidden, false);
    assert.equal(l.toggle.getAttribute('aria-expanded'), 'true');
    assert.equal(l.document.activeElement, l.close);
});

test('view buttons update the selected view through native input and change events', () => {
    const l = layout();
    assert.equal(l.viewScene.getAttribute('aria-pressed'), 'true');
    assert.equal(l.viewSection.getAttribute('aria-pressed'), 'false');
    l.viewSection.click();
    assert.equal(l.viewSelect.value, 'section');
    assert.deepEqual(l.viewSelect.events, ['input', 'change']);
    assert.equal(l.viewScene.getAttribute('aria-pressed'), 'false');
    assert.equal(l.viewSection.getAttribute('aria-pressed'), 'true');
    l.viewSection.click();
    assert.deepEqual(l.viewSelect.events, ['input', 'change']);
});

test('view buttons can synchronize programmatic resets without replaying the change handlers', () => {
    const l = layout();
    l.viewSection.click();
    l.viewSelect.value = 'scene';
    l.syncViews();
    assert.equal(l.viewScene.getAttribute('aria-pressed'), 'true');
    assert.equal(l.viewSection.getAttribute('aria-pressed'), 'false');
    assert.deepEqual(l.viewSelect.events, ['input', 'change']);
});

test('mobile menu makes background regions inert and backdrop restores them and focus', () => {
    const l = layout(true);
    assert.equal(l.settings.hidden, true);
    l.toggle.click();
    assert.equal(l.settings.getAttribute('role'), 'dialog');
    assert.equal(l.settings.getAttribute('aria-modal'), 'true');
    assert.equal(l.backdrop.hidden, false);
    assert.ok(l.regions.every((region) => region.inert));
    assert.equal(l.document.activeElement, l.close);
    assert.equal(l.changes.at(-1)?.open, true);
    assert.equal(l.changes.at(-1)?.overlay, true);
    l.backdrop.click();
    assert.equal(l.settings.hidden, true);
    assert.equal(l.settings.getAttribute('aria-modal'), null);
    assert.ok(l.regions.every((region) => !region.inert));
    assert.equal(l.document.activeElement, l.toggle);
});

test('Escape closes settings and returns focus but leaves native dialog keyboard handling alone', () => {
    const l = layout(true);
    l.toggle.click();
    l.setDialog(true);
    assert.equal(l.key('Escape').prevented, false);
    assert.equal(l.key('Tab', true).prevented, false);
    assert.equal(l.settings.hidden, false);
    l.setDialog(false);
    assert.equal(l.key('Escape').prevented, true);
    assert.equal(l.settings.hidden, true);
    assert.equal(l.document.activeElement, l.toggle);
    assert.equal(l.key('Escape').prevented, false);
});

test('mobile Tab wraps between hamburger and the last visible settings control', () => {
    const l = layout(true);
    l.toggle.click();
    l.toggle.focus();
    assert.equal(l.key('Tab', true).prevented, true);
    assert.equal(l.document.activeElement, l.last);
    assert.equal(l.key('Tab').prevented, true);
    assert.equal(l.document.activeElement, l.toggle);
    l.range.focus();
    assert.equal(l.key('Tab').prevented, false);
    l.setMobile(false);
    l.last.focus();
    assert.equal(l.key('Tab').prevented, false);
});

test('breakpoints close mobile settings and return focus from the panel, then restore desktop column', () => {
    const l = layout();
    l.range.focus();
    l.setMobile(true);
    assert.equal(l.settings.hidden, true);
    assert.equal(l.document.activeElement, l.toggle);
    l.toggle.click();
    assert.ok(l.regions.every((region) => region.inert));
    l.setMobile(false);
    assert.equal(l.settings.hidden, false);
    assert.equal(l.settings.getAttribute('role'), 'complementary');
    assert.equal(l.settings.getAttribute('aria-modal'), null);
    assert.equal(l.backdrop.hidden, true);
    assert.ok(l.regions.every((region) => !region.inert));
});

test('reset integration changes menu state without stealing focus when requested', () => {
    const l = layout();
    l.outside.focus();
    l.setOpen(false, false);
    assert.equal(l.settings.hidden, true);
    assert.equal(l.document.activeElement, l.outside);
    l.setOpen(true, false);
    assert.equal(l.settings.hidden, false);
    assert.equal(l.document.activeElement, l.outside);
});

test('mobile Tab recovers focus into the overlay if focus was moved outside it', () => {
    const l = layout(true);
    l.toggle.click();
    l.outside.focus();
    assert.equal(l.key('Tab').prevented, true);
    assert.equal(l.document.activeElement, l.toggle);
    l.outside.focus();
    assert.equal(l.key('Tab', true).prevented, true);
    assert.equal(l.document.activeElement, l.last);
});
