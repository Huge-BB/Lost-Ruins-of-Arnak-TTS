import assert from 'node:assert/strict';
import test from 'node:test';
import { buildBaseGameCardPools, cardRecord, validateBaseGameCardPools } from './cards.ts';
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
