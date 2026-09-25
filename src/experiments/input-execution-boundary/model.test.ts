import test from 'node:test';
import assert from 'node:assert/strict';
import { createMachine, writeInput, movePc, step, run, guards } from './model.ts';
test('writing data alone never executes its numeric meaning', () => {
    const s = writeInput(createMachine(), 8, 3, guards);
    assert.equal(s.scene, false);
    assert.equal(s.pc, 0);
    assert.equal(s.memory[8], 3);
    const t = step(movePc(s, 8, guards), guards);
    assert.equal(t.scene, true);
});
test('write and execution guards are independent boundaries', () => {
    const g = { ...guards, write: true };
    const s = writeInput(createMachine(), 0, 3, g);
    assert.equal(s.memory[0], 1);
    const data = writeInput(s, 8, 3, g);
    assert.equal(step(movePc(data, 8, g), g).scene, true);
    assert.equal(movePc(data, 8, { ...g, execute: true }).pc, 0);
});
test('allowlisted looping instruction is still stopped by the step budget', () => {
    const s = movePc(writeInput(createMachine(), 8, 4, guards), 8, guards);
    const result = run(s, { ...guards, budget: 7 });
    assert.equal(result.steps, 7);
    assert.equal(result.halted, true);
});
test('invalid opcodes are rejected without incrementing the execution counter', () => {
    const s = movePc(writeInput(createMachine(), 8, 99, guards), 8, guards);
    assert.equal(step(s, guards).steps, 0);
    assert.equal(step(s, { ...guards, opcode: false }).steps, 1);
});
