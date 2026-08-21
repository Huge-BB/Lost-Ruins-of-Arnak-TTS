import assert from 'node:assert/strict';
import test from 'node:test';
import { createGame, reduce } from './engine.ts';

test('START_GAME assigns base-game starting resources by player order', () => {
  const state = reduce(createGame(['p1', 'p2', 'p3', 'p4']), { type: 'START_GAME' });

  assert.deepEqual(
    state.playerOrder.map(id => ({
      coin: state.players[id].resources.coin,
      compass: state.players[id].resources.compass,
    })),
    [
      { coin: 2, compass: 0 },
      { coin: 1, compass: 1 },
      { coin: 2, compass: 1 },
      { coin: 1, compass: 2 },
    ],
  );
});

test('END_TURN does not advance the round', () => {
  let state = reduce(createGame(['p1', 'p2']), { type: 'START_GAME' });
  state = reduce(state, { type: 'END_TURN', playerId: 'p1' });
  state = reduce(state, { type: 'END_TURN', playerId: 'p2' });

  assert.equal(state.round, 1);
  assert.equal(state.currentPlayer, 'p1');
});

test('passed players are skipped until all players pass', () => {
  let state = reduce(createGame(['p1', 'p2', 'p3']), { type: 'START_GAME' });
  state = reduce(state, { type: 'PASS', playerId: 'p1' });
  assert.equal(state.currentPlayer, 'p2');

  state = reduce(state, { type: 'END_TURN', playerId: 'p2' });
  assert.equal(state.currentPlayer, 'p3');

  state = reduce(state, { type: 'END_TURN', playerId: 'p3' });
  assert.equal(state.currentPlayer, 'p2');
});

test('all players passing starts the next round and rotates first player', () => {
  let state = reduce(createGame(['p1', 'p2']), { type: 'START_GAME' });
  state.sites.campsite = { id: 'campsite', level: 1, idolSlots: 0 };
  state = reduce(state, { type: 'PLACE_WORKER', playerId: 'p1', siteId: 'campsite' });
  state = reduce(state, { type: 'PASS', playerId: 'p1' });
  state = reduce(state, { type: 'PASS', playerId: 'p2' });

  assert.equal(state.round, 2);
  assert.equal(state.firstPlayer, 'p2');
  assert.equal(state.currentPlayer, 'p2');
  assert.equal(state.sites.campsite.occupiedBy, undefined);
  assert.equal(state.players.p1.availableWorkers, 2);
  assert.equal(state.players.p1.hasPassed, false);
});

test('the fifth round finishes the game after everyone passes', () => {
  let state = reduce(createGame(['p1']), { type: 'START_GAME' });

  for (let round = 1; round <= 5; round += 1) {
    state = reduce(state, { type: 'PASS', playerId: 'p1' });
  }

  assert.equal(state.phase, 'finished');
  assert.equal(state.round, 5);
});

test('resource spending rejects insufficient resources without mutating input state', () => {
  const state = reduce(createGame(['p1']), { type: 'START_GAME' });

  assert.throws(
    () => reduce(state, { type: 'SPEND_RESOURCE', playerId: 'p1', resource: 'compass', amount: 1 }),
    /Insufficient compass/,
  );
  assert.equal(state.players.p1.resources.compass, 0);
});
