import { assertVerifiedResearchBridge, findResearchBridge, findResearchNode, researchTempleNode } from './research-manual.ts';
import { resolveResearchNodeRewards, resolveResearchReward } from './research-rewards.ts';
import { assertLegalResearchNodeMove, researchStartNode } from './research-topology.ts';
import { assignTempleArrival } from './temple-arrivals.ts';
import type {
  GameState,
  PlayerId,
  ResearchCost,
  ResearchNodeId,
  ResearchToken,
  ResearchTrackDefinition,
  SpendableResource,
} from './types.ts';

const COST_RESOURCES: SpendableResource[] = ['coin', 'compass', 'tablet', 'arrowhead', 'jewel'];

function usableIdolCount(state: GameState, playerId: PlayerId) {
  return state.players[playerId].idols.filter(idol => !idol.inSlot).length;
}

function assertCanPay(state: GameState, playerId: PlayerId, cost: ResearchCost) {
  const player = state.players[playerId];
  if (!player) throw new Error(`Unknown player: ${playerId}`);
  for (const resource of COST_RESOURCES) {
    const amount = cost[resource] ?? 0;
    if (player.resources[resource] < amount) throw new Error(`Insufficient ${resource}`);
  }
  const idolAmount = cost.usableIdol ?? 0;
  if (usableIdolCount(state, playerId) < idolAmount) throw new Error('Insufficient usable idol');
}

function pay(state: GameState, playerId: PlayerId, cost: ResearchCost) {
  const player = state.players[playerId];
  for (const resource of COST_RESOURCES) player.resources[resource] -= cost[resource] ?? 0;
  let idolsToPay = cost.usableIdol ?? 0;
  if (idolsToPay > 0) {
    player.idols = player.idols.filter((idol) => {
      if (idolsToPay > 0 && !idol.inSlot) {
        idolsToPay -= 1;
        return false;
      }
      return true;
    });
  }
}

export interface NodeResearchMove {
  playerId: PlayerId;
  token: ResearchToken;
  toNodeId: ResearchNodeId;
}

export function advanceResearchByNode(state: GameState, track: ResearchTrackDefinition, move: NodeResearchMove) {
  if (state.phase !== 'playing') throw new Error('Game is not in progress');
  if (state.currentPlayer !== move.playerId) throw new Error(`It is not ${move.playerId}'s turn`);
  const player = state.players[move.playerId];
  if (!player) throw new Error(`Unknown player: ${move.playerId}`);
  if (player.hasPassed) throw new Error(`${move.playerId} has already passed`);

  const nodeRecord = move.token === 'magnifying' ? state.research.magnifyingNode : state.research.journalNode;
  const from = nodeRecord[move.playerId] ?? researchStartNode(track.id);
  const magnifyingNode = state.research.magnifyingNode[move.playerId] ?? researchStartNode(track.id);
  const journalNode = state.research.journalNode[move.playerId] ?? researchStartNode(track.id);

  assertLegalResearchNodeMove(track, move.token, from, move.toNodeId, magnifyingNode, journalNode, player.rules.journalMaxLead);
  const bridge = findResearchBridge(track, from, move.toNodeId);
  assertVerifiedResearchBridge(bridge);
  const cost = bridge.cost ?? {};
  assertCanPay(state, move.playerId, cost);

  pay(state, move.playerId, cost);
  nodeRecord[move.playerId] = move.toNodeId;

  if (move.toNodeId === researchTempleNode(track.id)) {
    const arrival = assignTempleArrival(
      { arrivals: state.research.templeArrivals, points: state.research.templeArrivalPoints },
      track,
      move.playerId,
    );
    state.research.templeArrivals = arrival.arrivals;
    state.research.templeArrivalPoints = arrival.points;
    state.research.magnifying[move.playerId] = track.rows.length;
    player.researchMagnifying = track.rows.length;
    resolveResearchReward(state, move.playerId, bridge.id, bridge.reward);
    return bridge;
  }

  const node = findResearchNode(track, move.toNodeId);
  state.research[move.token][move.playerId] = node.rowIndex;
  if (move.token === 'magnifying') player.researchMagnifying = node.rowIndex;
  else player.researchJournal = node.rowIndex;

  resolveResearchReward(state, move.playerId, bridge.id, bridge.reward);
  resolveResearchNodeRewards(state, move.playerId, move.token, node);
  return bridge;
}
