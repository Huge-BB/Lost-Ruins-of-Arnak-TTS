import assert from 'node:assert/strict';
import test from 'node:test';
import { buildBaseGameCardPools, cardRecord, dealMarketForRound, validateBaseGameCardPools } from './cards.ts';
import type { CardDefinition } from './types.ts';

function starter(id: string, color: string): CardDefinition {
  return { id, name: id, type: 'Starter', expansion: 'Base Game', color };
}

const baseCards: CardDefinition[] = [
  { id: 'item-1', name: 'Item', type: 'Item', expansion: 'Base Game', cost: 1 },
  { id: 'artifact-1', name: 'Artifact', type: 'Artifact', expansion: 'Base Game', cost: 1 },
  { id: 'fear', name: 'Fear', type: 'Fear', expansion: 'Base Game', points: -1 },
  ...['Yellow', 'Green', 'Blue', 'Red'].flatMap((color, colorIndex) =>
    Array.from({ length: 4 }, (_, index) => starter(`${colorIndex}-${index}`, color)),
  ),
  { id: 'exp-item', name: 'Expansion Item', type: 'Item', expansion: 'Expedition Leaders', cost: 1 },
];

test('buildBaseGameCardPools separates base-game market, starter, and fear cards', () => {
  const pools = buildBaseGameCardPools({ cards: cardRecord(baseCards) });

  assert.deepEqual(pools.items, ['item-1']);
  assert.deepEqual(pools.artifacts, ['artifact-1']);
  assert.deepEqual(pools.fear, ['fear']);
  assert.equal(pools.startersByColor.Yellow.length, 4);
  assert.equal(pools.startersByColor.Red.length, 4);
  assert.ok(!pools.items.includes('exp-item'));
  assert.doesNotThrow(() => validateBaseGameCardPools(pools));
});

test('base-game starter cards require color metadata', () => {
  const broken: CardDefinition[] = [
    ...baseCards,
    { id: 'broken', name: 'Broken Starter', type: 'Starter', expansion: 'Base Game' },
  ];
  assert.throws(
    () => buildBaseGameCardPools({ cards: cardRecord(broken) }),
    /missing color metadata/,
  );
});

test('validation requires exactly four starter cards for each base color', () => {
  const pools = buildBaseGameCardPools({ cards: cardRecord(baseCards.filter(card => card.id !== '0-0')) });
  assert.throws(() => validateBaseGameCardPools(pools), /Expected 4 base-game starter cards for Yellow, found 3/);
});

test('round 1 market contains one artifact and five items', () => {
  const market = dealMarketForRound(
    1,
    ['i1', 'i2', 'i3', 'i4', 'i5', 'i6'],
    ['a1', 'a2', 'a3'],
  );

  assert.deepEqual(market.artifacts, ['a1']);
  assert.deepEqual(market.items, ['i1', 'i2', 'i3', 'i4', 'i5']);
  assert.deepEqual(market.artifactDeck, ['a2', 'a3']);
  assert.deepEqual(market.itemDeck, ['i6']);
});

test('market composition follows the moon staff split for later rounds', () => {
  const market = dealMarketForRound(
    4,
    ['i1', 'i2', 'i3'],
    ['a1', 'a2', 'a3', 'a4', 'a5'],
  );

  assert.deepEqual(market.artifacts, ['a1', 'a2', 'a3', 'a4']);
  assert.deepEqual(market.items, ['i1', 'i2']);
  assert.deepEqual(market.artifactDeck, ['a5']);
  assert.deepEqual(market.itemDeck, ['i3']);
});
