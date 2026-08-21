import type { ResearchBoardId, ResearchReward, ResearchToken, ResearchTrackDefinition } from './types.ts';

export interface ResearchRewardManualEntry {
  node: string;
  token: ResearchToken;
  rewards: ResearchReward[];
  verified: boolean;
  needsTokenAccessCheck?: boolean;
  comment?: string;
}

export interface ResearchRewardManualData {
  $schemaVersion: 1;
  boards: Partial<Record<ResearchBoardId, { nodeRewards: ResearchRewardManualEntry[] }>>;
}

function nodeMap(track: ResearchTrackDefinition) {
  return new Map(track.rows.flatMap(row => row.nodes ?? []).map(node => [node.id, node]));
}

export function applyResearchRewardManualData(
  track: ResearchTrackDefinition,
  manual: ResearchRewardManualData | undefined,
  options: { requireVerified?: boolean } = {},
): ResearchTrackDefinition {
  if (!manual) return track;
  const board = manual.boards[track.id];
  if (!board) return track;
  const next = structuredClone(track);
  const nodes = nodeMap(next);
  const seen = new Set<string>();
  for (const entry of board.nodeRewards) {
    const key = `${entry.node}:${entry.token}`;
    if (seen.has(key)) throw new Error(`Duplicate research reward entry: ${key}`);
    seen.add(key);
    const node = nodes.get(entry.node);
    if (!node) throw new Error(`Research reward node does not exist in ${track.id} topology: ${entry.node}`);
    if (options.requireVerified && !entry.verified) throw new Error(`Research reward is not verified: ${key}`);
    if (!entry.verified && entry.rewards.length === 0) continue;
    node.rewards ??= [];
    const existing = node.rewards.find(reward => reward.token === entry.token);
    if (existing) {
      existing.rewards = structuredClone(entry.rewards);
      existing.verified = entry.verified;
    } else {
      node.rewards.push({ token: entry.token, rewards: structuredClone(entry.rewards), verified: entry.verified });
    }
  }
  return next;
}
