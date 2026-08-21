import { assertVerifiedResearchBridge, findResearchBridge, findResearchNode, researchTempleNode } from './research-manual.ts';
import { resolveResearchNodeRewards, resolveResearchRewards } from './research-rewards.ts';
import { assertLegalResearchNodeMove, researchStartNode } from './research-topology.ts';
import { templeRulesFor } from './temple-rules.ts';
import { assignTempleArrival } from './temple-arrivals.ts';
import { canPayTravel, hasTravelCost } from './travel.ts';
import type {
  CardId,
  EngineContext,
  GameState,
  PlayerId,
  ResearchNodeId,
  ResearchToken,
  ResearchTrackDefinition,
  ResearchCost,
  SpendableResource,
} from './types.ts';

const COST_RESOURCES: SpendableResource[] = ['coin', 'compass', 'tablet', 'arrowhead', 'jewel'];
const EMPTY_CONTEXT: EngineContext = { cards: {} };

function availableIdolCount(state: GameState, playerId: PlayerId) {
  const player = state.players[playerId];
  if (!player) throw new Error(`Unknown player: ${playerId}`);
  return player.idols.filter(idol => !idol.inSlot).length;
}

function assertTravelPayment(state: GameState, playerId: PlayerId, cost: ResearchCost, cardIds: CardId[], context: EngineContext) {
  const travel = cost.travel ?? {};
  if (!hasTravelCost(travel)) {
    if (cardIds.length > 0) throw new Error('Research bridge does not require travel payment');
    return;
  }
  const player = state.players[playerId];
  if (cardIds.length === 0) throw new Error('Research travel payment is required');
  if (new Set(cardIds).size !== cardIds.length) throw new Error('Research travel payment contains duplicate cards');
  for (const cardId of cardIds) if (!player.hand.includes(cardId)) throw new Error(`Research travel card is not in hand: ${cardId}`);
  if (!canPayTravel(travel, cardIds, context)) throw new Error('Research travel payment does not satisfy bridge cost');
}

function assertCanPay(state: GameState, playerId: PlayerId, cost: ResearchCost, cardIds: CardId[], context: EngineContext) {
  const player = state.players[playerId];
  if (!player) throw new Error(`Unknown player: ${playerId}`);
  for (const resource of COST_RESOURCES) {
    const amount = cost[resource] ?? 0;
    if (player.resources[resource] < amount) throw new Error(`Insufficient ${resource}`);
  }
  if (availableIdolCount(state, playerId) < (cost.usableIdol ?? 0)) throw new Error('Insufficient usable idol');
  assertTravelPayment(state, playerId, cost, cardIds, context);
}

function pay(state: GameState, playerId: PlayerId, cost: ResearchCost, cardIds: CardId[]) {
  const player = state.players[playerId];
  for (const resource of COST_RESOURCES) player.resources[resource] -= cost[resource] ?? 0;
  let idolsToPay = cost.usableIdol ?? 0;
  if (idolsToPay > 0) {
    player.idols = player.idols.filter(idol => {
      if (idolsToPay > 0 && !idol.inSlot) { idolsToPay -= 1; return false; }
      return true;
    });
  }
  for (const cardId of cardIds) {
    player.hand.splice(player.hand.indexOf(cardId), 1);
    player.playedCards.push(cardId);
  }
}

export interface NodeResearchMove { playerId: PlayerId; token: ResearchToken; toNodeId: ResearchNodeId; paymentCardIds?: CardId[]; }

export function advanceResearchByNode(
  state: GameState,
  track: ResearchTrackDefinition,
  move: NodeResearchMove,
  context: EngineContext = EMPTY_CONTEXT,
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

  assertLegalResearchNodeMove(track, move.token, from, move.toNodeId, magnifyingNode, journalNode, player.rules.journalMaxLead);
  const bridge = findResearchBridge(track, from, move.toNodeId);
  assertVerifiedResearchBridge(bridge);
  const rules = templeRulesFor(track.id);
  const moveContext = { state, track, playerId: move.playerId, token: move.token, from, to: move.toNodeId, bridge };
  rules.validateMove?.(moveContext);
  const cost = bridge.cost ?? {};
  const paymentCardIds = move.paymentCardIds ?? [];
  assertCanPay(state, move.playerId, cost, paymentCardIds, context);

  rules.beforeMove?.(moveContext);
  pay(state, move.playerId, cost, paymentCardIds);
  nodeRecord[move.playerId] = move.toNodeId;

  if (move.toNodeId === researchTempleNode(track.id)) {
    const arrival = assignTempleArrival({ arrivals: state.research.templeArrivals, points: state.research.templeArrivalPoints }, track, move.playerId);
    state.research.templeArrivals = arrival.arrivals;
    state.research.templeArrivalPoints = arrival.points;
    state.research.magnifying[move.playerId] = track.rows.length;
    player.researchMagnifying = track.rows.length;
    resolveResearchRewards(state, move.playerId, bridge.id, bridge.rewards, context);
    rules.afterMove?.(moveContext);
    return bridge;
  }

  const node = findResearchNode(track, move.toNodeId);
  state.research[move.token][move.playerId] = node.rowIndex;
  if (move.token === 'magnifying') player.researchMagnifying = node.rowIndex;
  else player.researchJournal = node.rowIndex;
  resolveResearchRewards(state, move.playerId, bridge.id, bridge.rewards, context);
  resolveResearchNodeRewards(state, move.playerId, move.token, node, context);
  rules.afterMove?.(moveContext);
  return bridge;
}
