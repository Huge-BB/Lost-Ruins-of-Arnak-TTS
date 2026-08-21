import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { nextResearchPosition, RESEARCH_START_POSITION, researchRowPoints, rowGrantsAssistant } from './research.ts';
import type { ResearchTrackDefinition } from './types.ts';

async function loadTracks(): Promise<Record<string, ResearchTrackDefinition>> {
  const raw = await readFile(new URL('./generated/research-tracks.json', import.meta.url), 'utf8');
  return JSON.parse(raw);
}

test('extracts the Bird and Snake base-game research tracks', async () => {
  const tracks = await loadTracks();
  assert.deepEqual(Object.keys(tracks).sort(), ['bird', 'snake']);
  assert.equal(tracks.bird.rows.length, 7);
  assert.equal(tracks.snake.rows.length, 7);
  assert.deepEqual(tracks.bird.templePoints, [23, 21, 20, 19]);
  assert.deepEqual(tracks.snake.templePoints, [23, 21, 20, 19]);
});

test('Bird research scoring is preserved from start toward the temple', async () => {
  const { bird } = await loadTracks();
  assert.deepEqual(
    bird.rows.map(row => [row.magnifyingPoints, row.journalPoints]),
    [[1, 0], [2, 1], [4, 2], [6, 4], [9, 6], [12, 8], [16, 10]],
  );
  assert.deepEqual(
    bird.rows.map(row => row.grantsAssistant),
    [true, true, true, true, false, false, false],
  );
});

test('Snake research scoring is preserved from start toward the temple', async () => {
  const { snake } = await loadTracks();
  assert.deepEqual(
    snake.rows.map(row => [row.magnifyingPoints, row.journalPoints]),
    [[1, 0], [2, 3], [3, 4], [4, 5], [5, 8], [10, 12], [15, 15]],
  );
  assert.deepEqual(
    snake.rows.map(row => row.grantsAssistant),
    [true, false, true, true, true, false, false],
  );
});

test('research position keeps the printed starting space separate from row zero', async () => {
  const { bird } = await loadTracks();
  assert.equal(nextResearchPosition(bird, 'magnifying', RESEARCH_START_POSITION), 0);
  assert.equal(nextResearchPosition(bird, 'journal', RESEARCH_START_POSITION), 0);
  assert.equal(researchRowPoints(bird, 'magnifying', RESEARCH_START_POSITION), 0);
  assert.equal(researchRowPoints(bird, 'magnifying', 0), 1);
  assert.equal(researchRowPoints(bird, 'journal', 0), 0);
});

test('only the magnifying glass can enter the temple', async () => {
  const { bird } = await loadTracks();
  const topRow = bird.rows.length - 1;
  assert.equal(nextResearchPosition(bird, 'magnifying', topRow), bird.rows.length);
  assert.throws(() => nextResearchPosition(bird, 'journal', topRow), /cannot advance farther/);
  assert.equal(researchRowPoints(bird, 'magnifying', bird.rows.length), 0);
  assert.throws(() => researchRowPoints(bird, 'journal', bird.rows.length), /Journal cannot enter the temple/);
});

test('assistant-row metadata can be queried independently of TTS coordinates', async () => {
  const { bird } = await loadTracks();
  assert.equal(rowGrantsAssistant(bird, 0), true);
  assert.equal(rowGrantsAssistant(bird, 4), false);
  assert.equal(rowGrantsAssistant(bird, RESEARCH_START_POSITION), false);
});
