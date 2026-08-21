import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from './engine.ts';
import { resolvePendingAssistantReward } from './pending-rewards.ts';

test('claim-assistant pending reward consumes only after a valid stack choice', () => {
  const state = createGame(['p1']);
  state.phase = 'playing';
  state.currentPlayer = 'p1';
  state.assistants.stacks = [['a1'], ['a2'], ['a3']];
  state.pendingRewards.push({
    playerId: 'p1',
    sourceId: 'bird:r0:p0',
    code: 'research:CLAIM_ASSISTANT',
    payload: { type: 'CLAIM_ASSISTANT', level: 'silver' },
  });

  const next = resolvePendingAssistantReward(state, 'p1', 0, { stackIndex: 1 });
  assert.equal(next.pendingRewards.length, 0);
  assert.deepEqual(next.players.p1.assistants, [{ id: 'a2', level: 'silver', exhausted: false }]);
  assert.equal(state.pendingRewards.length, 1);
  assert.equal(state.players.p1.assistants.length, 0);
});

test('upgrade-assistant pending reward upgrades one owned silver assistant', () => {
  const state = createGame(['p1']);
  state.phase = 'playing';
  state.currentPlayer = 'p1';
  state.players.p1.assistants = [{ id: 'a1', level: 'silver', exhausted: false }];
  state.pendingRewards.push({
    playerId: 'p1',
    sourceId: 'bird:r1:p0',
    code: 'research:UPGRADE_ASSISTANT',
    payload: { type: 'UPGRADE_ASSISTANT', level: 'gold' },
  });

  const next = resolvePendingAssistantReward(state, 'p1', 0, { assistantId: 'a1' });
  assert.equal(next.pendingRewards.length, 0);
  assert.equal(next.players.p1.assistants[0].level, 'gold');
});

test('invalid assistant choice leaves pending reward and original state unchanged', () => {
  const state = createGame(['p1']);
  state.phase = 'playing';
  state.currentPlayer = 'p1';
  state.pendingRewards.push({
    playerId: 'p1',
    sourceId: 'bird:r0:p0',
    code: 'research:CLAIM_ASSISTANT',
    payload: { type: 'CLAIM_ASSISTANT', level: 'silver' },
  });
  const before = structuredClone(state);

  assert.throws(() => resolvePendingAssistantReward(state, 'p1', 0, { stackIndex: 0 }));
  assert.deepEqual(state, before);
});
