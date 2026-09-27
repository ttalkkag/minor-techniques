import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import ts from 'typescript';

function catalog(search = '') {
    const items = ['public-a', 'hidden-a', 'public-b', 'hidden-b'].map((id) => {
        const number = { textContent: '' }, image = { loading: '' };
        const description = { id: `${id}-description` };
        const attributes = new Map([['aria-describedby', description.id]]);
        const link = {
            querySelector: () => description,
            setAttribute: (name: string, value: string) => attributes.set(name, value),
            removeAttribute: (name: string) => attributes.delete(name),
        };
        return {
            id, hidden: false, dataset: { listed: String(id.startsWith('public')) },
            number, image, link,
            querySelector: (selector: string) => selector === '.number' ? number : image,
        };
    });
    let children = [...items], random = 0.999, draws = 0;
    const list = {
        dataset: { view: 'thumbnail' },
        querySelectorAll: (selector: string) => selector === '.experiment' ? children.map((item) => item.link) : children,
        append: (...next: typeof items) => { children = [...next]; },
    };
    const buttons = ['thumbnail', 'compact'].map((view) => {
        let click = () => {};
        return {
            dataset: { view },
            setAttribute() {},
            addEventListener: (_name: string, callback: () => void) => { click = callback; },
            click: () => click(),
        };
    });
    const events = new Map<string, (event: { persisted: boolean }) => void>();
    const source = readFileSync(new URL('../pages/index.astro', import.meta.url), 'utf8').match(/<script>([\s\S]*?)<\/script>/)![1]!;
    runInContext(ts.transpileModule(source, {
        compilerOptions: { target: ts.ScriptTarget.ES2022 },
    }).outputText, createContext({
        document: { querySelector: () => list, querySelectorAll: () => buttons },
        window: {
            location: { search },
            addEventListener: (name: string, callback: (event: { persisted: boolean }) => void) => events.set(name, callback),
        },
        URLSearchParams,
        Math: { floor: Math.floor, random: () => { draws++; return random; } },
    }));
    return {
        list, buttons, draws: () => draws,
        visible: () => children.filter((item) => !item.hidden),
        order: () => children.filter((item) => !item.hidden).map((item) => item.id),
        restore(persisted: boolean) { random = 0; events.get('pageshow')?.({ persisted }); },
    };
}

for (const search of ['', '?display=all']) {
    test(`cached catalog return reshuffles ${search || 'listed'} entries and updates numbering`, () => {
        const c = catalog(search), before = c.order(), draws = c.draws();
        c.restore(true);
        assert.ok(c.draws() > draws, 'return from the browser cache must draw a new order');
        assert.notDeepEqual(c.order(), before);
        assert.deepEqual([...c.order()].sort(), [...before].sort());
        assert.deepEqual(c.visible().map((item) => item.number.textContent), search ? ['01', '02', '03', '04'] : ['01', '02']);
        assert.deepEqual(c.visible().map((item) => item.image.loading), search ? ['eager', 'lazy', 'lazy', 'lazy'] : ['eager', 'lazy']);
    });
}

test('initial pageshow and view changes keep the current order without another shuffle', () => {
    const c = catalog('?display=all'), before = c.order(), draws = c.draws();
    c.restore(false);
    c.buttons[1]!.click();
    assert.equal(c.list.dataset.view, 'compact');
    assert.deepEqual(c.order(), before);
    c.buttons[0]!.click();
    assert.equal(c.list.dataset.view, 'thumbnail');
    assert.deepEqual(c.order(), before);
    assert.equal(c.draws(), draws);
});
