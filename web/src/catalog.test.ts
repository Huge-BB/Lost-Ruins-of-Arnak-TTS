import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { buildBaseGameCardPools, prepareBaseGameSetup, validateBaseGameCardPools } from './cards.ts';
import type { EngineContext } from './types.ts';

async function loadExtractedContext(): Promise<EngineContext> {
  const raw = await readFile(new URL('./generated/cards.json', import.meta.url), 'utf8');
  return { cards: JSON.parse(raw) };
}

test('extracted TTS catalog contains a playable base-game card pool', async () => {
  const context = await loadExtractedContext();
  const pools = buildBaseGameCardPools(context);

  assert.doesNotThrow(() => validateBaseGameCardPools(pools));
  assert.ok(pools.items.length >= 5);
  assert.ok(pools.artifacts.length >= 1);
  assert.ok(pools.fear.length >= 1);
  assert.equal(pools.startersByColor.Yellow.length, 4);
  assert.equal(pools.startersByColor.Green.length, 4);
  assert.equal(pools.startersByColor.Blue.length, 4);
  assert.equal(pools.startersByColor.Red.length, 4);
});

test('extracted TTS catalog can produce a four-player round-one setup', async () => {
  const context = await loadExtractedContext();
  const setup = prepareBaseGameSetup(context, 4, 'catalog-smoke-test');

  assert.equal(setup.market.items.length, 5);
  assert.equal(setup.market.artifacts.length, 1);
  assert.equal(setup.playerDecks.length, 4);
  for (const player of setup.playerDecks) {
    assert.equal(player.hand.length, 5);
    assert.equal(player.deck.length, 1);
  }
});
