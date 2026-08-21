import { claimAssistant, upgradeOwnedAssistant } from './assistant-actions.ts';
import { applyCardEffects, getCardEffects } from './effects.ts';
import { resolveRewardCode } from './site-rewards.ts';
import type { EngineContext, GameState, PlayerId, ResearchReward } from './types.ts';

function pendingAt(state: GameState, index: number) {
  if (!Number.isInteger(index) || index < 0 || index >= state.pendingRewards.length) {
    throw new Error(`Invalid pending reward index: ${index}`);
  }
  return state.pendingRewards[index];
}

function researchRewardPayload(payload: unknown): ResearchReward {
  if (!payload || typeof payload !== 'object' || typeof (payload as Record<string, unknown>).type !== 'string') {
    throw new Error('Pending research reward has no structured payload');
  }
  return payload as ResearchReward;
}

function assertPendingOwner(state: GameState, playerId: PlayerId, index: number) {
  const pending = pendingAt(state, index);
  if (pending.playerId !== playerId) throw new Error(`Pending reward belongs to ${pending.playerId}`);
  return pending;
}

function consumePending(state: GameState, index: number): GameState {
  const next = structuredClone(state);
  next.pendingRewards.splice(index, 1);
  return next;
}

export function resolvePendingAssistantReward(
  state: GameState,
  playerId: PlayerId,
  pendingIndex: number,
  choice: { stackIndex?: number; assistantId?: string },
): GameState {
  const pending = assertPendingOwner(state, playerId, pendingIndex);
  const reward = researchRewardPayload(pending.payload);

  let resolved: GameState;
  if (reward.type === 'CLAIM_ASSISTANT') {
    if (reward.level !== 'silver') throw new Error('CLAIM_ASSISTANT research reward must grant a silver assistant');
    if (!Number.isInteger(choice.stackIndex)) throw new Error('CLAIM_ASSISTANT requires a stackIndex choice');
    resolved = claimAssistant(state, playerId, choice.stackIndex!);
  } else if (reward.type === 'UPGRADE_ASSISTANT') {
    if (reward.level !== 'gold') throw new Error('UPGRADE_ASSISTANT research reward must grant a gold upgrade');
    if (!choice.assistantId) throw new Error('UPGRADE_ASSISTANT requires an assistantId choice');
    resolved = upgradeOwnedAssistant(state, playerId, choice.assistantId);
  } else {
    throw new Error(`Pending research reward is not an assistant choice: ${reward.type}`);
  }

  return consumePending(resolved, pendingIndex);
}

export function resolvePendingFreeArtifact(
  state: GameState,
  playerId: PlayerId,
  pendingIndex: number,
  artifactId: string,
  context: EngineContext,
): GameState {
  const pending = assertPendingOwner(state, playerId, pendingIndex);
  const reward = researchRewardPayload(pending.payload);
  if (reward.type !== 'ACQUIRE_ARTIFACT_FREE') throw new Error(`Pending reward is not a free Artifact choice: ${reward.type}`);
  const card = context.cards[artifactId];
  if (!card || card.type !== 'Artifact') throw new Error(`Invalid Artifact choice: ${artifactId}`);
  const marketIndex = state.market.artifacts.indexOf(artifactId);
  if (marketIndex < 0) throw new Error('Artifact is not available in the market');

  const next = structuredClone(state);
  next.market.artifacts.splice(marketIndex, 1);
  next.players[playerId].playedCards.push(artifactId);
  const refill = next.market.artifactDeck.shift();
  if (refill) next.market.artifacts.unshift(refill);
  applyCardEffects(next, playerId, getCardEffects(artifactId, context));
  next.pendingRewards.splice(pendingIndex, 1);
  return next;
}

export function resolvePendingLevel1SiteActivation(
  state: GameState,
  playerId: PlayerId,
  pendingIndex: number,
  siteId: string,
  context: EngineContext,
): GameState {
  const pending = assertPendingOwner(state, playerId, pendingIndex);
  const reward = researchRewardPayload(pending.payload);
  if (reward.type !== 'ACTIVATE_DISCOVERED_LEVEL1_SITE') throw new Error(`Pending reward is not a Level I site activation: ${reward.type}`);
  const site = state.sites[siteId];
  if (!site || site.level !== 1 || !site.tileId) throw new Error(`Site is not a discovered Level I site: ${siteId}`);
  const definition = context.sites?.[site.tileId];
  if (!definition || definition.level !== 1) throw new Error(`Unknown Level I site tile: ${site.tileId}`);

  const next = structuredClone(state);
  resolveRewardCode(next, playerId, site.tileId, definition.rewardCode, context);
  next.pendingRewards.splice(pendingIndex, 1);
  return next;
}
