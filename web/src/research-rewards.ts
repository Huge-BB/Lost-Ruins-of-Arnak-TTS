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

function drawCards(state: GameState, playerId: PlayerId, amount: number) {
  if (!Number.isInteger(amount) || amount < 0) throw new Error('Draw amount must be a non-negative integer');
  const player = state.players[playerId];
  if (!player) throw new Error(`Unknown player: ${playerId}`);
  for (let i = 0; i < amount; i += 1) {
    const card = player.deck.shift();
    if (!card) break;
    player.hand.push(card);
  }
}

export function resolveResearchReward(state: GameState, playerId: PlayerId, sourceId: string, reward: ResearchReward | undefined) {
  if (!reward) return;
  if (isGainResourceReward(reward)) {
    const player = state.players[playerId];
    if (!player) throw new Error(`Unknown player: ${playerId}`);
    player.resources[reward.resource] += reward.amount;
    return;
  }
  if (reward.type === 'DRAW_CARD' && Number.isInteger(reward.amount) && Number(reward.amount) >= 0) {
    drawCards(state, playerId, Number(reward.amount));
    return;
  }
  if (reward.type === 'SEQUENCE' && Array.isArray(reward.rewards)) {
    for (const child of reward.rewards) resolveResearchReward(state, playerId, sourceId, child);
    return;
  }
  enqueuePending(state, playerId, sourceId, reward);
}

export function resolveResearchRewards(state: GameState, playerId: PlayerId, sourceId: string, rewards: ResearchReward[] | undefined) {
  for (const reward of rewards ?? []) resolveResearchReward(state, playerId, sourceId, reward);
}

export function resolveResearchNodeRewards(state: GameState, playerId: PlayerId, token: ResearchToken, node: ResearchNodeDefinition) {
  for (const entry of node.rewards ?? []) {
    if (!entry.verified) continue;
    if (entry.token && entry.token !== token) continue;
    resolveResearchRewards(state, playerId, node.id, entry.rewards);
  }
}
