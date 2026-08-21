import { claimAssistant, upgradeOwnedAssistant } from './assistant-actions.ts';
import type { GameState, PlayerId, ResearchReward } from './types.ts';

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
  const pending = pendingAt(state, pendingIndex);
  if (pending.playerId !== playerId) throw new Error(`Pending reward belongs to ${pending.playerId}`);
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
