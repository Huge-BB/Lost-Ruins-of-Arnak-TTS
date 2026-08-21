import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../engine.ts';
import type { EngineContext } from '../types.ts';
import { addFearToHand, setupLeader, runLeaderRoundStart, runLeaderRoundEnd } from './index.ts';
import {
  captainCallSpecialist,
  explorerSpendSnack,
  falconerAdvanceEagle,
  falconerReturnEagle,
  mysticPerformRitual,
  professorBuyArchiveArtifact,
} from './actions.ts';

const leaderNames = [
  'Funding', 'Piloting', 'Transmission', 'Hidden Fear',
  'Falconry', 'Animal Bond', 'Tracking',
  'Connections', 'Research Notes', 'Resourcefulness', 'Special Delivery',
  'Preservation', 'Arnakology', 'Linguistics',
  'Hike', 'Cartography', 'Scouting',
  'Divine Guidance', 'Meditation', 'Worldly Goods', 'Blindsight',
];

const cards: EngineContext['cards'] = {
  fear1: { id: 'fear1', name: 'Fear', type: 'Fear', expansion: 'Base Game' },
  fear2: { id: 'fear2', name: 'Fear', type: 'Fear', expansion: 'Base Game' },
  a1: { id: 'a1', name: 'Archive A', type: 'Artifact', expansion: 'Base Game', cost: 3 },
  a2: { id: 'a2', name: 'Archive B', type: 'Artifact', expansion: 'Base Game', cost: 2 },
  a3: { id: 'a3', name: 'Archive C', type: 'Artifact', expansion: 'Base Game', cost: 1 },
  a4: { id: 'a4', name: 'Archive D', type: 'Artifact', expansion: 'Base Game', cost: 3 },
  a5: { id: 'a5', name: 'Archive E', type: 'Artifact', expansion: 'Base Game', cost: 3 },
  a6: { id: 'a6', name: 'Archive F', type: 'Artifact', expansion: 'Base Game', cost: 3 },
};
for (const name of leaderNames) cards[`leader:${name}`] = { id: `leader:${name}`, name, type: 'Starter', expansion: 'Expedition Leaders' };
const context: EngineContext = { cards };

function baseState() {
  const state = createGame(['p1']);
  state.phase = 'playing';
  state.setupSeed = 'test';
  state.players.p1.hand = ['fear1'];
  state.players.p1.deck = ['fear2'];
  state.market.artifactDeck = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'];
  return state;
}

test('Captain setup has three archaeologists and specialist is once per round', () => {
  let state = baseState();
  setupLeader(state, 'p1', 'captain', context, 'seed');
  assert.equal(state.players.p1.workers, 3);
  assert.equal(state.players.p1.hand.length, 5);
  state.assistants.stacks = [['assistant-a']];
  state = captainCallSpecialist(state, 'p1', 0);
  assert.equal(state.players.p1.availableWorkers, 2);
  assert.equal(state.pendingRewards[0].code, 'assistant:ACTIVATE_SILVER');
  assert.throws(() => captainCallSpecialist(state, 'p1', 0), /already been used/);
  runLeaderRoundEnd(state, 'p1', context);
  assert.equal(state.players.p1.leader!.data.specialistUsedThisRound, false);
});

test('Falconer eagle advances at round start, caps, and returns for a chosen reached reward', () => {
  let state = baseState();
  setupLeader(state, 'p1', 'falconer', context, 'seed');
  runLeaderRoundStart(state, 'p1', context);
  assert.equal(state.players.p1.leader!.data.eaglePosition, 1);
  state = falconerAdvanceEagle(state, 'p1', 10);
  assert.equal(state.players.p1.leader!.data.eaglePosition, 4);
  state = falconerReturnEagle(state, 'p1', 3);
  assert.equal(state.players.p1.leader!.data.eaglePosition, 0);
  assert.deepEqual(state.pendingRewards[0].payload, { rewardPosition: 3, mainAction: true });
});

test('Baroness starts with Special Delivery, gains II-V income, and retrieves Special Delivery at round end', () => {
  const state = baseState();
  setupLeader(state, 'p1', 'baroness', context, 'seed');
  const delivery = state.players.p1.hand[0];
  assert.equal(context.cards[delivery].name, 'Special Delivery');
  state.players.p1.hand.splice(0, 1);
  state.players.p1.playedCards.push(delivery);
  runLeaderRoundEnd(state, 'p1', context);
  assert.ok(state.players.p1.hand.includes(delivery));
  assert.ok(!state.players.p1.playedCards.includes(delivery));
  state.round = 2;
  runLeaderRoundStart(state, 'p1', context);
  assert.equal(state.players.p1.resources.coin, 1);
  runLeaderRoundStart(state, 'p1', context);
  assert.equal(state.players.p1.resources.coin, 1);
});

test('Professor creates a three-card archive and receives suitcase bonuses', () => {
  let state = baseState();
  setupLeader(state, 'p1', 'professor', context, 'seed');
  assert.deepEqual(state.players.p1.leader!.data.archive, ['a1', 'a2', 'a3']);
  state.round = 2;
  runLeaderRoundStart(state, 'p1', context);
  assert.equal((state.players.p1.leader!.data.suitcase as any).compass, 1);
  state.players.p1.resources.compass = 2;
  state = professorBuyArchiveArtifact(state, 'p1', 'a1', context, 1);
  assert.equal(state.players.p1.resources.compass, 0);
});

test('Explorer has one archaeologist and snack availability/cost rules', () => {
  let state = baseState();
  setupLeader(state, 'p1', 'explorer', context, 'seed');
  assert.equal(state.players.p1.workers, 1);
  state = explorerSpendSnack(state, 'p1', 'free', 'site-a');
  assert.throws(() => explorerSpendSnack(state, 'p1', 'free', 'site-b'), /already been used/);
  assert.throws(() => explorerSpendSnack(state, 'p1', 'compass', 'site-b'), /round 3/);
  state.round = 3;
  state.players.p1.resources.compass = 1;
  state = explorerSpendSnack(state, 'p1', 'compass', 'site-b');
  assert.equal(state.players.p1.resources.compass, 0);
});

test('Mystic adds Fear after drawing a full hand and supports all three ritual tiers', () => {
  let state = baseState();
  setupLeader(state, 'p1', 'mystic', context, 'seed');
  assert.equal(state.players.p1.hand.length, 5);
  const fear = addFearToHand(state, 'p1', context);
  assert.ok(fear);
  assert.equal(state.players.p1.hand.length, 6);
  state.players.p1.leader!.data.ritualPile = ['fear1', 'fear1', 'fear1', 'fear1'];
  state = mysticPerformRitual(state, 'p1', 2);
  assert.equal(state.players.p1.resources.coin, 1);
  assert.equal(state.players.p1.resources.compass, 1);
  state.players.p1.leader!.data.ritualPile = ['fear1', 'fear1', 'fear1'];
  state = mysticPerformRitual(state, 'p1', 3);
  assert.equal(state.pendingRewards.at(-1)?.code, 'leader:MYSTIC_BUY_ARTIFACT_DISCOUNT');
  state.players.p1.leader!.data.ritualPile = ['fear1', 'fear1', 'fear1', 'fear1'];
  state = mysticPerformRitual(state, 'p1', 4);
  assert.equal(state.pendingRewards.at(-1)?.code, 'leader:MYSTIC_OVERCOME_GUARDIAN_FREE');
});
