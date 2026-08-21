import assert from 'node:assert/strict';
import test from 'node:test';
import { createGame, reduce } from './engine.ts';
import { canPayTravel } from './travel.ts';
import type { EngineContext } from './types.ts';

const context: EngineContext = {
  cards: {
    boot: { id: 'boot', name: 'Boot', type: 'Starter', expansion: 'Base Game', travel: { boot: 1 } },
    car: { id: 'car', name: 'Car', type: 'Starter', expansion: 'Base Game', travel: { car: 1 } },
    boat: { id: 'boat', name: 'Boat', type: 'Starter', expansion: 'Base Game', travel: { boat: 1 } },
    plane: { id: 'plane', name: 'Plane', type: 'Item', expansion: 'Base Game', travel: { plane: 1 } },
    doubleCar: { id: 'doubleCar', name: 'Double Car', type: 'Item', expansion: 'Base Game', travel: { car: 2 } },
  },
};

test('travel substitution follows the Arnak hierarchy', () => {
  assert.equal(canPayTravel({ boot: 1 }, ['car'], context), true);
  assert.equal(canPayTravel({ boot: 1 }, ['boat'], context), true);
  assert.equal(canPayTravel({ boat: 1 }, ['car'], context), false);
  assert.equal(canPayTravel({ car: 1 }, ['boat'], context), false);
  assert.equal(canPayTravel({ boat: 1 }, ['plane'], context), true);
  assert.equal(canPayTravel({ plane: 1 }, ['car'], context), false);
  assert.equal(canPayTravel({ car: 2 }, ['doubleCar'], context), true);
});

test('PLACE_WORKER consumes travel cards atomically', () => {
  const state = reduce(createGame(['p1']), { type: 'START_GAME' });
  state.sites.temple = { id: 'temple', level: 1, idolSlots: 0, travelCost: { boat: 1 } };
  state.players.p1.hand = ['plane'];

  const next = reduce(state, { type: 'PLACE_WORKER', playerId: 'p1', siteId: 'temple', paymentCardIds: ['plane'] }, context);
  assert.deepEqual(next.players.p1.hand, []);
  assert.deepEqual(next.players.p1.playedCards, ['plane']);
  assert.equal(next.players.p1.availableWorkers, 1);
  assert.equal(next.sites.temple.occupiedBy, 'p1');
});

test('invalid travel payment leaves the input state untouched', () => {
  const state = reduce(createGame(['p1']), { type: 'START_GAME' });
  state.sites.temple = { id: 'temple', level: 1, idolSlots: 0, travelCost: { boat: 1 } };
  state.players.p1.hand = ['car'];

  assert.throws(
    () => reduce(state, { type: 'PLACE_WORKER', playerId: 'p1', siteId: 'temple', paymentCardIds: ['car'] }, context),
    /does not satisfy site cost/,
  );
  assert.deepEqual(state.players.p1.hand, ['car']);
  assert.equal(state.players.p1.availableWorkers, 2);
  assert.equal(state.sites.temple.occupiedBy, undefined);
});
