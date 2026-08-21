import assert from 'node:assert/strict';
import test from 'node:test';
import { createGame, reduce } from './engine.ts';
import type { EngineContext } from './types.ts';

const context: EngineContext = {
  cards: {
    funding: { id: 'funding', name: 'Funding', type: 'Starter', expansion: 'Base Game', color: 'Yellow' },
    exploration: { id: 'exploration', name: 'Exploration', type: 'Starter', expansion: 'Base Game', color: 'Yellow' },
    fear: { id: 'fear', name: 'Fear', type: 'Fear', expansion: 'Base Game', points: -1 },
    utility: { id: 'utility', name: 'Utility', type: 'Item', expansion: 'Base Game', cost: 1 },
    drawn: { id: 'drawn', name: 'Drawn Card', type: 'Item', expansion: 'Base Game', cost: 1 },
  },
  cardEffects: {
    utility: [
      { type: 'GAIN_RESOURCE', resource: 'tablet', amount: 1 },
      { type: 'DRAW_CARD', amount: 1 },
    ],
  },
};

function playableState(cardId: string) {
  const state = reduce(createGame(['p1']), { type: 'START_GAME' });
  state.players.p1.hand = [cardId];
  return state;
}

test('Funding gains one coin when played for its effect', () => {
  const state = playableState('funding');
  const next = reduce(state, { type: 'PLAY_CARD', playerId: 'p1', cardId: 'funding' }, context);

  assert.equal(next.players.p1.resources.coin, 3);
  assert.deepEqual(next.players.p1.hand, []);
  assert.deepEqual(next.players.p1.playedCards, ['funding']);
});

test('Exploration gains one compass when played for its effect', () => {
  const state = playableState('exploration');
  const next = reduce(state, { type: 'PLAY_CARD', playerId: 'p1', cardId: 'exploration' }, context);

  assert.equal(next.players.p1.resources.compass, 1);
});

test('Fear can be played and has no resource effect', () => {
  const state = playableState('fear');
  const before = structuredClone(state.players.p1.resources);
  const next = reduce(state, { type: 'PLAY_CARD', playerId: 'p1', cardId: 'fear' }, context);

  assert.deepEqual(next.players.p1.resources, before);
  assert.deepEqual(next.players.p1.playedCards, ['fear']);
});

test('custom effects compose resource gain and card draw', () => {
  const state = playableState('utility');
  state.players.p1.deck = ['drawn'];
  const next = reduce(state, { type: 'PLAY_CARD', playerId: 'p1', cardId: 'utility' }, context);

  assert.equal(next.players.p1.resources.tablet, 1);
  assert.deepEqual(next.players.p1.hand, ['drawn']);
  assert.deepEqual(next.players.p1.deck, []);
});

test('PLAY_CARD rejects cards not in hand and leaves input unchanged', () => {
  const state = playableState('funding');
  assert.throws(
    () => reduce(state, { type: 'PLAY_CARD', playerId: 'p1', cardId: 'exploration' }, context),
    /not in the player hand/,
  );
  assert.deepEqual(state.players.p1.hand, ['funding']);
});
