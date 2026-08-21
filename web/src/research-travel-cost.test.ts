import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, reduce } from './engine.ts';
import { advanceResearchByNode } from './research-action.ts';
import type { EngineContext, ResearchTrackDefinition } from './types.ts';

const track: ResearchTrackDefinition = {
  id: 'monkey',
  name: 'Monkey',
  rows: [{ magnifyingPoints: 1, journalPoints: 0, grantsAssistant: false, nodes: [
    { id: 'monkey:r0:p0', rowIndex: 0, pathIndex: 0, researchLevel: 0 },
  ] }],
  bridges: [{
    id: 'monkey:start->monkey:r0:p0',
    from: 'monkey:start',
    to: 'monkey:r0:p0',
    cost: { travel: { car: 1 } },
    verified: true,
    allowedTokens: ['magnifying'],
  }],
};

const context: EngineContext = {
  cards: {
    car: { id: 'car', name: 'Car', type: 'Starter', expansion: 'test', travel: { car: 1 } },
    plane: { id: 'plane', name: 'Plane', type: 'Starter', expansion: 'test', travel: { plane: 1 } },
    boot: { id: 'boot', name: 'Boot', type: 'Starter', expansion: 'test', travel: { boot: 1 } },
  },
  researchTracks: { monkey: track },
};

function game() {
  const state = createGame(['p1']);
  state.phase = 'playing';
  state.currentPlayer = 'p1';
  state.research.board = 'monkey';
  state.research.magnifyingNode.p1 = 'monkey:start';
  state.research.journalNode.p1 = 'monkey:start';
  return state;
}

test('Monkey research travel cost consumes a matching card from hand', () => {
  const state = game();
  state.players.p1.hand = ['car'];
  advanceResearchByNode(state, track, { playerId: 'p1', token: 'magnifying', toNodeId: 'monkey:r0:p0', paymentCardIds: ['car'] }, context);
  assert.deepEqual(state.players.p1.hand, []);
  assert.deepEqual(state.players.p1.playedCards, ['car']);
  assert.equal(state.research.magnifyingNode.p1, 'monkey:r0:p0');
});

test('plane can satisfy Monkey research car cost', () => {
  const state = game();
  state.players.p1.hand = ['plane'];
  advanceResearchByNode(state, track, { playerId: 'p1', token: 'magnifying', toNodeId: 'monkey:r0:p0', paymentCardIds: ['plane'] }, context);
  assert.deepEqual(state.players.p1.playedCards, ['plane']);
});

test('invalid Monkey research travel payment leaves state unchanged', () => {
  const state = game();
  state.players.p1.hand = ['boot'];
  const before = structuredClone(state);
  assert.throws(
    () => advanceResearchByNode(state, track, { playerId: 'p1', token: 'magnifying', toNodeId: 'monkey:r0:p0', paymentCardIds: ['boot'] }, context),
    /does not satisfy bridge cost/,
  );
  assert.deepEqual(state, before);
});

test('ADVANCE_RESEARCH reducer forwards Monkey travel payment cards and context', () => {
  const state = game();
  state.players.p1.hand = ['car'];
  const next = reduce(state, {
    type: 'ADVANCE_RESEARCH',
    playerId: 'p1',
    track: 'magnifying',
    toNodeId: 'monkey:r0:p0',
    paymentCardIds: ['car'],
  }, context);
  assert.deepEqual(next.players.p1.hand, []);
  assert.deepEqual(next.players.p1.playedCards, ['car']);
  assert.equal(next.research.magnifyingNode.p1, 'monkey:r0:p0');
});
