import { assertVerifiedResearchBridge, findResearchBridge, findResearchNode } from './research-manual.ts';
import { assertLegalResearchNodeMove, researchStartNode } from './research-topology.ts';
import type {
  GameState,
  PlayerId,
  ResearchNodeId,
  ResearchToken,
  ResearchTrackDefinition,
  ResourceCost,
  SpendableResource,
} from './types.ts';

const COST_RESOURCES: SpendableResource[] = ['coin', 'compass', 'tablet', 'arrowhead', 'jewel'];

function assertCanPay(state: GameState, playerId: PlayerId, cost: ResourceCost) {
  const player = state.players[playerId];
  if (!player) throw new Error(`Unknown player: ${playerId}`);
  for (const resource of COST_RESOURCES) {
    const amount = cost[resource] ?? 0;
    if (player.resources[resource] < amount) throw new Error(`Insufficient ${resource}`);
  }
}

function pay(state: GameState, playerId: PlayerId, cost: ResourceCost) {
  const player = state.players[playerId];
  for (const resource of COST_RESOURCES) {
    player.resources[resource] -= cost[resource] ?? 0;
  }
}

export interface NodeResearchMove {
  playerId: PlayerId;
  token: ResearchToken;
  toNodeId: ResearchNodeId;
}

/**
 * Applies one physical research move. The generated TTS topology decides whether
 * the move exists; the human-maintained overlay decides its verified cost.
 *
 * This mutates `state` only after every validation and payment check succeeds.
 */
export function advanceResearchByNode(
  state: GameState,
  track: ResearchTrackDefinition,
  move: NodeResearchMove,
) {
  if (state.phase !== 'playing') throw new Error('Game is not in progress');
  if (state.currentPlayer !== move.playerId) throw new Error(`It is not ${move.playerId}'s turn`);
  const player = state.players[move.playerId];
  if (!player) throw new Error(`Unknown player: ${move.playerId}`);
  if (player.hasPassed) throw new Error(`${move.playerId} has already passed`);

  const nodeRecord = move.token === 'magnifying' ? state.research.magnifyingNode : state.research.journalNode;
  const from = nodeRecord[move.playerId] ?? researchStartNode(track.id);
  const magnifyingNode = state.research.magnifyingNode[move.playerId] ?? researchStartNode(track.id);
  const journalNode = state.research.journalNode[move.playerId] ?? researchStartNode(track.id);

  assertLegalResearchNodeMove(
    track,
    move.token,
    from,
    move.toNodeId,
    magnifyingNode,
    journalNode,
    player.rules.journalMaxLead,
  );

  const bridge = findResearchBridge(track, from, move.toNodeId);
  assertVerifiedResearchBridge(bridge);
  const cost = bridge.cost ?? {};
  assertCanPay(state, move.playerId, cost);

  // All validation happens above. Mutations begin here.
  pay(state, move.playerId, cost);
  nodeRecord[move.playerId] = move.toNodeId;

  const node = findResearchNode(track, move.toNodeId);
  state.research[move.token][move.playerId] = node.rowIndex;
  if (move.token === 'magnifying') player.researchMagnifying = node.rowIndex;
  else player.researchJournal = node.rowIndex;

  return bridge;
}
