import type { GameState, PlayerId, ResearchNodeDefinition, ResearchToken, Resource } from './types.ts';

function isGainResourceReward(reward: unknown): reward is { type: 'GAIN_RESOURCE'; resource: Resource; amount: number } {
  if (!reward || typeof reward !== 'object') return false;
  const value = reward as Record<string, unknown>;
  return value.type === 'GAIN_RESOURCE'
    && typeof value.resource === 'string'
    && Number.isInteger(value.amount)
    && Number(value.amount) >= 0;
}

function enqueuePending(state: GameState, playerId: PlayerId, sourceId: string, reward: unknown) {
  state.pendingRewards.push({
    playerId,
    sourceId,
    code: `research:${JSON.stringify(reward)}`,
  });
}

export function resolveResearchReward(
  state: GameState,
  playerId: PlayerId,
  sourceId: string,
  reward: unknown,
) {
  if (reward == null) return;
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
