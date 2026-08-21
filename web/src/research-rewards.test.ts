import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from './engine.ts';
import { advanceResearchByNode } from './research-action.ts';
import type { ResearchTrackDefinition } from './types.ts';

function state() {
  const game = createGame(['p1']);
  game.phase = 'playing';
  game.currentPlayer = 'p1';
  game.research.board = 'bird';
  game.research.magnifyingNode.p1 = 'bird:start';
  game.research.journalNode.p1 = 'bird:start';
  return game;
}

const track: ResearchTrackDefinition = {
  id: 'bird',
  name: 'Bird',
  rows: [{
    magnifyingPoints: 1,
    journalPoints: 0,
    grantsAssistant: false,
    nodes: [{
      id: 'bird:r0:p0', rowIndex: 0, pathIndex: 0, researchLevel: 0,
      rewards: [
        { token: 'magnifying', rewards: [{ type: 'GAIN_RESOURCE', resource: 'coin', amount: 2 }], verified: true },
        { token: 'journal', rewards: [{ type: 'CLAIM_ASSISTANT', level: 'silver' }], verified: true },
      ],
    }],
  }],
  bridges: [{
    id: 'bird:start->bird:r0:p0',
    from: 'bird:start',
    to: 'bird:r0:p0',
    cost: {},
    rewards: [{ type: 'GAIN_RESOURCE', resource: 'compass', amount: 1 }],
    verified: true,
  }],
};

test('verified bridge and matching node resource reward arrays resolve immediately', () => {
  const game = state();
  advanceResearchByNode(game, track, { playerId: 'p1', token: 'magnifying', toNodeId: 'bird:r0:p0' });
  assert.equal(game.players.p1.resources.compass, 1);
  assert.equal(game.players.p1.resources.coin, 2);
  assert.equal(game.pendingRewards.length, 0);
});

test('assistant research reward is exposed as a structured pending choice', () => {
  const game = state();
  game.players.p1.rules.journalMaxLead = 1;
  advanceResearchByNode(game, track, { playerId: 'p1', token: 'journal', toNodeId: 'bird:r0:p0' });
  assert.equal(game.players.p1.resources.coin, 0);
  assert.equal(game.players.p1.resources.compass, 1);
  assert.equal(game.pendingRewards.length, 1);
  assert.equal(game.pendingRewards[0].code, 'research:CLAIM_ASSISTANT');
  assert.deepEqual(game.pendingRewards[0].payload, { type: 'CLAIM_ASSISTANT', level: 'silver' });
});

test('SEQUENCE resolves deterministic children and leaves choices pending', () => {
  const game = state();
  game.players.p1.deck = ['card-a'];
  track.bridges![0].rewards = [{
    type: 'SEQUENCE',
    rewards: [
      { type: 'GAIN_RESOURCE', resource: 'coin', amount: 1 },
      { type: 'DRAW_CARD', amount: 1 },
      { type: 'CHOOSE', count: 1, options: [
        { type: 'GAIN_RESOURCE', resource: 'tablet', amount: 1 },
        { type: 'GAIN_RESOURCE', resource: 'arrowhead', amount: 1 },
      ] },
    ],
  }];
  advanceResearchByNode(game, track, { playerId: 'p1', token: 'magnifying', toNodeId: 'bird:r0:p0' });
  assert.equal(game.players.p1.resources.coin, 3);
  assert.deepEqual(game.players.p1.hand, ['card-a']);
  assert.equal(game.pendingRewards[0].code, 'research:CHOOSE');
});
