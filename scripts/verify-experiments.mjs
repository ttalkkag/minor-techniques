import assert from 'node:assert/strict';
import { readFile, readdir, access } from 'node:fs/promises';
import { resolve, dirname, relative, sep } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const tasks = JSON.parse(await readFile(resolve(root, 'tasks/experiments.json'), 'utf8'));
const ids = new Set(tasks.map((task) => task.id));
assert.equal(ids.size, tasks.length, 'Task IDs must be unique');

async function files(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    return (
        await Promise.all(
            entries.map((entry) => {
                const path = resolve(directory, entry.name);
                return entry.isDirectory() ? files(path) : [path];
            }),
        )
    ).flat();
}

const analyses = (await files(resolve(root, 'docs'))).filter((path) => path.endsWith(`${sep}analysis.md`));
assert.deepEqual(
    tasks.map((task) => task.source).sort(),
    analyses.map((path) => relative(root, path).split(sep).join('/')).sort(),
    'Every analysis topic must have exactly one task',
);

for (const task of tasks) {
    const ownDirectory = resolve(root, 'src/experiments', task.id);
    const page = resolve(root, 'src/pages/experiments', `${task.id}.astro`);
    const entry = JSON.parse(await readFile(resolve(ownDirectory, 'entry.json'), 'utf8'));
    assert.equal(entry.id, task.id);
    assert.equal(entry.href, task.route);
    assert.equal(entry.href, `/experiments/${task.id}/`);
    for (const field of ['title', 'description', 'thumbnail'])
        assert.ok(entry[field]?.length, `${task.id}: missing ${field}`);
    assert.ok(Array.isArray(entry.tags) && entry.tags.length > 0, `${task.id}: missing tags`);
    assert.equal(entry.thumbnail, `/images/${task.id}.svg`);
    await access(resolve(root, 'public', entry.thumbnail.slice(1)));
    const source = await readFile(page, 'utf8');
    assert.match(source, /<script(?:\s|>)/, `${task.id}: interactive script missing`);
    for (const path of [page, ...(await files(ownDirectory))]) {
        if (!/\.(astro|[cm]?[jt]s)$/.test(path)) continue;
        const text = await readFile(path, 'utf8');
        assert.ok(!text.includes('.docs/'), `${task.id}: temporary documentation dependency`);
        for (const match of text.matchAll(/(?:from\s*|import\s*\(\s*|import\s*)['"]([^'"]+)['"]/g)) {
            const specifier = match[1];
            if (!specifier.startsWith('.')) continue;
            const target = resolve(dirname(path), specifier);
            if (!target.startsWith(resolve(root, 'src/experiments') + sep)) continue;
            assert.ok(
                target.startsWith(ownDirectory + sep),
                `${task.id}: cross-experiment import ${specifier}`,
            );
        }
    }
}

const registered = (await readdir(resolve(root, 'src/experiments'), { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
assert.deepEqual(registered, [...ids].sort(), 'Task and experiment directories must match');
console.log(
    `${tasks.length} independent experiments: documentation coverage, routes, metadata, thumbnails and import boundaries verified.`,
);
