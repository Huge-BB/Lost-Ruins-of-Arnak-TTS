import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { availableAssistantIds, prepareAssistantSupply } from './assistants.ts';
import type { AssistantDefinition } from './types.ts';

async function loadAssistants(): Promise<Record<string, AssistantDefinition>> {
  const raw = await readFile(new URL('./generated/assistants.json', import.meta.url), 'utf8');
  return JSON.parse(raw);
}

test('extracts all twelve base-game assistants with silver and gold artwork', async () => {
  const assistants = await loadAssistants();
  const all = Object.values(assistants);
  assert.equal(all.length, 12);
  for (const assistant of all) {
    assert.equal(assistant.expansion, 'Base Game');
    assert.ok(assistant.image.silverUrl);
    assert.ok(assistant.image.goldUrl);
    assert.equal(assistant.image.uniqueBack, true);
    assert.ok(assistant.image.cardIndex >= 0);
    assert.ok(assistant.image.cardIndex < assistant.image.sheetWidth * assistant.image.sheetHeight);
  }
});

test('known base assistant GUID keeps its TTS sprite identity', async () => {
  const assistants = await loadAssistants();
  assert.equal(assistants['224d5d']?.image.cardIndex, 9);
  assert.equal(assistants['224d5d']?.image.sheetWidth, 4);
  assert.equal(assistants['224d5d']?.image.sheetHeight, 3);
});

test('Bird board creates three deterministic stacks of four assistants', async () => {
  const assistants = await loadAssistants();
  const first = prepareAssistantSupply(assistants, 'bird', 4, 'assistant-seed');
  const second = prepareAssistantSupply(assistants, 'bird', 4, 'assistant-seed');

  assert.deepEqual(first, second);
  assert.deepEqual(first.stacks.map(stack => stack.length), [4, 4, 4]);
  assert.deepEqual(first.specialStack, []);
  assert.equal(new Set(first.stacks.flat()).size, 12);
  assert.equal(availableAssistantIds(first).length, 3);
});

test('Snake board separates one special assistant per player before splitting the remainder', async () => {
  const assistants = await loadAssistants();
  const expectedStackSizes: Record<number, number[]> = {
    1: [4, 4, 3],
    2: [3, 3, 4],
    3: [3, 3, 3],
    4: [3, 3, 2],
  };

  for (const playerCount of [1, 2, 3, 4]) {
    const supply = prepareAssistantSupply(assistants, 'snake', playerCount, `snake-${playerCount}`);
    assert.equal(supply.specialStack.length, playerCount);
    assert.deepEqual(supply.stacks.map(stack => stack.length), expectedStackSizes[playerCount]);
    assert.equal(new Set([...supply.specialStack, ...supply.stacks.flat()]).size, 12);
    assert.equal(availableAssistantIds(supply).length, 3);
  }
});
