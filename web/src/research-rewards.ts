import type { GameState, PlayerId, ResearchNodeDefinition, ResearchReward, ResearchToken, Resource } from './types.ts';

function isGainResourceReward(reward: ResearchReward): reward is { type: 'GAIN_RESOURCE'; resource: Resource; amount: number } {
  return reward.type === 'GAIN_RESOURCE'
    && typeof reward.resource === 'string'
    && Number.isInteger(reward.amount)
    && Number(reward.amount) >= 0;
}

function enqueuePending(state: GameState, playerId: PlayerId, sourceId: string, reward: ResearchReward) {
  state.pendingRewards.push({
    playerId,
    sourceId,
    code: `research:${reward.type}`,
    payload: structuredClone(reward),
  });
}

export function resolveResearchReward(
  state: GameState,
  playerId: PlayerId,
  sourceId: string,
  reward: ResearchReward | undefined,
) {
  if (!reward) return;
  if (isGainResourceReward(reward)) {
    const player = state.players[playerId];
    if (!player) throw new Error(`Unknown player: ${playerId}`);
    player.resources[reward.resource] += reward.amount;
    return;
  }
  enqueuePending(state, playerId, sourceId, reward);
}

export function resolveResearchNodeRewards(
  state: GameState,
  playerId: PlayerId,
  token: ResearchToken,
  node: ResearchNodeDefinition,
) {
  for (const entry of node.rewards ?? []) {
    if (!entry.verified) continue;
    if (entry.token && entry.token !== token) continue;
    resolveResearchReward(state, playerId, node.id, entry.reward);
  }
}
