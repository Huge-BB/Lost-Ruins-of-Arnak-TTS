import type {
  ResearchBoardId,
  ResearchBridgeDefinition,
  ResearchManualData,
  ResearchTrackDefinition,
  ResourceCost,
} from './types.ts';

const COST_KEYS = ['coin', 'compass', 'tablet', 'arrowhead', 'jewel'] as const;

function validateCost(cost: ResourceCost, label: string) {
  for (const key of COST_KEYS) {
    const value = cost[key];
    if (value === undefined) continue;
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`${label} has invalid ${key} cost`);
    }
  }
}

function bridgeKey(from: string, to: string) {
  return `${from}->${to}`;
}

export function applyResearchManualData(
  track: ResearchTrackDefinition,
  manualData: ResearchManualData,
  options: { requireVerified?: boolean } = {},
): ResearchTrackDefinition {
  const boardId = track.id as ResearchBoardId;
  const overlay = manualData.boards[boardId];
  if (!overlay) return structuredClone(track);

  const requireVerified = options.requireVerified ?? false;
  const next = structuredClone(track);
  const bridges = next.bridges ?? [];
  const topology = new Map(bridges.map(bridge => [bridgeKey(bridge.from, bridge.to), bridge]));
  const seen = new Set<string>();

  for (const manualBridge of overlay.bridges) {
    const key = bridgeKey(manualBridge.from, manualBridge.to);
    if (seen.has(key)) throw new Error(`Duplicate manual research bridge: ${key}`);
    seen.add(key);

    const target = topology.get(key);
    if (!target) throw new Error(`Manual research bridge does not exist in ${boardId} topology: ${key}`);
    validateCost(manualBridge.cost, key);
    if (requireVerified && !manualBridge.verified) throw new Error(`Research bridge is not verified: ${key}`);

    target.cost = { ...manualBridge.cost };
    target.reward = manualBridge.reward;
    target.verified = manualBridge.verified;
  }

  return next;
}

export function findResearchBridge(
  track: ResearchTrackDefinition,
  from: string,
  to: string,
): ResearchBridgeDefinition {
  const bridge = (track.bridges ?? []).find(candidate => candidate.from === from && candidate.to === to);
  if (!bridge) throw new Error(`Illegal research bridge: ${from}->${to}`);
  return bridge;
}

export function assertVerifiedResearchBridge(bridge: ResearchBridgeDefinition) {
  if (!bridge.verified) throw new Error(`Research bridge has not been verified: ${bridge.id}`);
  validateCost(bridge.cost ?? {}, bridge.id);
}
