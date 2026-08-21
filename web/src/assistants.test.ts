import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

type AssistantDefinition = {
  id: string;
  expansion: string;
  image: {
    silverUrl: string;
    goldUrl: string;
    sheetWidth: number;
    sheetHeight: number;
    cardIndex: number;
    uniqueBack: boolean;
  };
};

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
