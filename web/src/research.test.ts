import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

type ResearchRow = {
  magnifyingPoints: number;
  journalPoints: number;
  grantsAssistant: boolean;
};

type ResearchTrack = {
  id: string;
  name: string;
  rows: ResearchRow[];
  templePoints: number[];
};

async function loadTracks(): Promise<Record<string, ResearchTrack>> {
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
