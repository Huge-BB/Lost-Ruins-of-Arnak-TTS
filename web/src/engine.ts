import { prepareBaseGameSetup } from './cards.ts';
import { applyCardEffects, getCardEffects } from './effects.ts';
import { nextResearchPosition, RESEARCH_START_POSITION } from './research.ts';
import { shuffleWithSeed } from './rng.ts';
import { addGuardianFear, resolveRewardCode } from './site-rewards.ts';
import { canPayTravel, hasTravelCost } from './travel.ts';
import type { EngineContext, GameAction, GameState, PlayerColor, PlayerId, Resource } from './types.ts';

const MAX_ROUNDS = 5;
const PLAYER_COLORS: PlayerColor[] = ['Yellow', 'Green', 'Blue', 'Red'];
const DISCOVERY_COMPASS_COST = { 1: 3, 2: 6 } as const;

const STARTING_RESOURCES = [
  { coin: 2, compass: 0 },
  { coin: 1, compass: 1 },
  { coin: 2, compass: 1 },
  { coin: 1, compass: 2 },
] as const;

const EMPTY_CONTEXT: EngineContext = { cards: {} };
const emptyResources = () => ({ tablet: 0, arrowhead: 0, jewel: 0, coin: 0, compass: 0, fear: 0 });

export function createGame(playerIds: PlayerId[]): GameState {
  if (playerIds.length < 1 || playerIds.length > 4) throw new Error('Arnak supports 1-4 players');
  const players = Object.fromEntries(playerIds.map((id, index) => [id, {
    id,
    name: `Player ${index + 1}`,
    color: PLAYER_COLORS[index],
    resources: emptyResources(),
    workers: 2,
    availableWorkers: 2,
    hasPassed: false,
    researchMagnifying: RESEARCH_START_POSITION,
    researchJournal: RESEARCH_START_POSITION,
    deck: [], hand: [], discard: [], playedCards: [], idols: [],
  }]));
  return {
    version: 1, phase: 'setup', round: 1,
    firstPlayer: playerIds[0], currentPlayer: playerIds[0],
    players, playerOrder: [...playerIds], sites: {},
    discovery: { level1Deck: [], level2Deck: [], guardianDeck: [], idolDeck: [] },
    market: { items: [], artifacts: [], itemDeck: [], artifactDeck: [], exiled: [] },
    research: {
      board: 'bird',
      magnifying: Object.fromEntries(playerIds.map(id => [id, RESEARCH_START_POSITION])),
      journal: Object.fromEntries(playerIds.map(id => [id, RESEARCH_START_POSITION])),
    },
    pendingRewards: [],
  };
}

function assertPlaying(state: GameState) { if (state.phase !== 'playing') throw new Error('Game is not in progress'); }
function assertPlayer(state: GameState, playerId: PlayerId) {
  const player = state.players[playerId];
  if (!player) throw new Error(`Unknown player: ${playerId}`);
  return player;
}
function assertCurrentPlayer(state: GameState, playerId: PlayerId) {
  if (state.currentPlayer !== playerId) throw new Error(`It is not ${playerId}'s turn`);
  const player = assertPlayer(state, playerId);
  if (player.hasPassed) throw new Error(`${playerId} has already passed`);
}
function addResource(state: GameState, playerId: PlayerId, resource: Resource, amount: number) {
  const player = assertPlayer(state, playerId);
  if (!Number.isInteger(amount) || amount < 0) throw new Error('Amount must be a non-negative integer');
  player.resources[resource] += amount;
}
function spendResource(state: GameState, playerId: PlayerId, resource: Resource, amount: number) {
  const player = assertPlayer(state, playerId);
  if (!Number.isInteger(amount) || amount < 0) throw new Error('Amount must be a non-negative integer');
  if (player.resources[resource] < amount) throw new Error(`Insufficient ${resource}`);
  player.resources[resource] -= amount;
}
function nextActivePlayer(state: GameState, from: PlayerId): PlayerId | undefined {
  const startIndex = state.playerOrder.indexOf(from);
  for (let offset = 1; offset <= state.playerOrder.length; offset += 1) {
    const candidate = state.playerOrder[(startIndex + offset) % state.playerOrder.length];
    if (!state.players[candidate].hasPassed) return candidate;
  }
  return undefined;
}
function rotateFirstPlayer(state: GameState): PlayerId {
  const index = state.playerOrder.indexOf(state.firstPlayer);
  return state.playerOrder[(index + 1) % state.playerOrder.length];
}
function refillMarketSlot(state: GameState, type: 'Item' | 'Artifact') {
  const deck = type === 'Item' ? state.market.itemDeck : state.market.artifactDeck;
  const nextCard = deck.shift();
  if (!nextCard) return;
  if (type === 'Item') state.market.items.push(nextCard); else state.market.artifacts.unshift(nextCard);
}
function refillMarketForRound(state: GameState) {
  const artifactTarget = state.round;
  const itemTarget = 6 - state.round;
  const drawnArtifacts = state.market.artifactDeck.splice(0, Math.max(0, artifactTarget - state.market.artifacts.length));
  if (drawnArtifacts.length > 0) state.market.artifacts.unshift(...drawnArtifacts);
  const drawnItems = state.market.itemDeck.splice(0, Math.max(0, itemTarget - state.market.items.length));
  state.market.items.push(...drawnItems);
}
function advanceMarketToNextRound(state: GameState) {
  const nearestArtifact = state.market.artifacts.pop();
  const nearestItem = state.market.items.shift();
  if (nearestArtifact) state.market.exiled.push(nearestArtifact);
  if (nearestItem) state.market.exiled.push(nearestItem);
  state.round += 1;
  refillMarketForRound(state);
}
function setupDiscoveryDecks(state: GameState, context: EngineContext, seed: string) {
  const sites = Object.values(context.sites ?? {}).filter(site => site.expansion === 'Base Game');
  const level1 = sites.filter(site => site.level === 1).map(site => site.id).sort();
  const level2 = sites.filter(site => site.level === 2).map(site => site.id).sort();
  const guardians = Object.values(context.guardians ?? {}).filter(x => x.expansion === 'Base Game').map(x => x.id).sort();
  const idols = Object.values(context.idols ?? {}).filter(x => x.expansion === 'Base Game').map(x => x.id).sort();
  state.discovery.level1Deck = shuffleWithSeed(level1, `${seed}:sites:1`);
  state.discovery.level2Deck = shuffleWithSeed(level2, `${seed}:sites:2`);
  state.discovery.guardianDeck = shuffleWithSeed(guardians, `${seed}:guardians`);
  state.discovery.idolDeck = shuffleWithSeed(idols, `${seed}:idols`);
}
function playCard(state: GameState, action: Extract<GameAction, { type: 'PLAY_CARD' }>, context: EngineContext) {
  assertPlaying(state); assertCurrentPlayer(state, action.playerId);
  const player = assertPlayer(state, action.playerId);
  const handIndex = player.hand.indexOf(action.cardId);
  if (handIndex < 0) throw new Error('Card is not in the player hand');
  const card = context.cards[action.cardId];
  if (!card) throw new Error(`Unknown card: ${action.cardId}`);
  player.hand.splice(handIndex, 1);
  player.playedCards.push(action.cardId);
  applyCardEffects(state, action.playerId, getCardEffects(action.cardId, context));
}
function payTravelFromHand(state: GameState, playerId: PlayerId, cardIds: string[], context: EngineContext, siteId: string) {
  const player = assertPlayer(state, playerId);
  const site = state.sites[siteId];
  const cost = site.travelCost ?? {};
  if (!hasTravelCost(cost)) {
    if (cardIds.length > 0) throw new Error('Site does not require travel payment');
    return;
  }
  if (cardIds.length === 0) throw new Error('Travel payment is required');
  if (new Set(cardIds).size !== cardIds.length) throw new Error('Travel payment contains duplicate cards');
  for (const cardId of cardIds) if (!player.hand.includes(cardId)) throw new Error(`Travel card is not in hand: ${cardId}`);
  if (!canPayTravel(cost, cardIds, context)) throw new Error('Travel payment does not satisfy site cost');
  for (const cardId of cardIds) {
    player.hand.splice(player.hand.indexOf(cardId), 1);
    player.playedCards.push(cardId);
  }
}
function resolveSite(state: GameState, playerId: PlayerId, siteId: string, context: EngineContext) {
  const site = state.sites[siteId];
  if (!site.tileId) return;
  const definition = context.sites?.[site.tileId];
  if (!definition) throw new Error(`Unknown site tile: ${site.tileId}`);
  if (definition.level !== site.level) throw new Error(`Site tile level mismatch: ${site.tileId}`);
  resolveRewardCode(state, playerId, site.tileId, definition.rewardCode, context);
}
function takeIdol(state: GameState, playerId: PlayerId, faceUp: boolean, context: EngineContext) {
  const idolId = state.discovery.idolDeck.shift();
  if (!idolId) throw new Error('Idol deck is empty');
  const idol = context.idols?.[idolId];
  if (!idol) throw new Error(`Unknown idol: ${idolId}`);
  state.players[playerId].idols.push({ id: idolId, faceUp });
  if (faceUp) resolveRewardCode(state, playerId, idolId, idol.rewardCode, context);
}
function discoverSite(state: GameState, action: Extract<GameAction, { type: 'DISCOVER_SITE' }>, context: EngineContext) {
  assertPlaying(state); assertCurrentPlayer(state, action.playerId);
  const player = assertPlayer(state, action.playerId);
  const site = state.sites[action.siteId];
  if (!site) throw new Error(`Unknown site: ${action.siteId}`);
  if (site.tileId) throw new Error('Site has already been discovered');
  if (site.occupiedBy) throw new Error('Site is occupied');
  if (player.availableWorkers < 1) throw new Error('No available worker');

  const tileDeck = site.level === 1 ? state.discovery.level1Deck : state.discovery.level2Deck;
  if (tileDeck.length === 0) throw new Error(`Level ${site.level} site deck is empty`);
  if (state.discovery.guardianDeck.length === 0) throw new Error('Guardian deck is empty');
  const requiredIdols = site.level === 2 ? 2 : 1;
  if (state.discovery.idolDeck.length < requiredIdols) throw new Error('Not enough idols to discover site');

  payTravelFromHand(state, action.playerId, action.paymentCardIds ?? [], context, action.siteId);
  spendResource(state, action.playerId, 'compass', DISCOVERY_COMPASS_COST[site.level]);
  player.availableWorkers -= 1;
  site.occupiedBy = action.playerId;

  takeIdol(state, action.playerId, true, context);
  if (site.level === 2) takeIdol(state, action.playerId, false, context);

  site.tileId = tileDeck.shift()!;
  resolveSite(state, action.playerId, action.siteId, context);
  site.guardian = state.discovery.guardianDeck.shift()!;
}
function buyCard(state: GameState, action: Extract<GameAction, { type: 'BUY_CARD' }>, context: EngineContext) {
  assertPlaying(state); assertCurrentPlayer(state, action.playerId);
  const card = context.cards[action.cardId];
  if (!card) throw new Error(`Unknown card: ${action.cardId}`);
  if (card.type !== 'Item' && card.type !== 'Artifact') throw new Error('Card cannot be bought from the market');
  const row = card.type === 'Item' ? state.market.items : state.market.artifacts;
  const index = row.indexOf(action.cardId);
  if (index < 0) throw new Error('Card is not available in the market');
  const cost = card.cost ?? 0;
  spendResource(state, action.playerId, card.type === 'Item' ? 'coin' : 'compass', cost);
  row.splice(index, 1);
  const player = assertPlayer(state, action.playerId);
  if (card.type === 'Item') player.deck.push(card.id); else player.playedCards.push(card.id);
  refillMarketSlot(state, card.type);
}
function advanceResearch(state: GameState, action: Extract<GameAction, { type: 'ADVANCE_RESEARCH' }>, context: EngineContext) {
  assertPlaying(state); assertCurrentPlayer(state, action.playerId);
  const player = assertPlayer(state, action.playerId);
  const definition = context.researchTracks?.[state.research.board];
  if (!definition) throw new Error(`Research track data required for ${state.research.board}`);
  const amount = action.amount ?? 1;
  if (!Number.isInteger(amount) || amount < 1) throw new Error('Research amount must be positive');

  let position = state.research[action.track][action.playerId];
  for (let step = 0; step < amount; step += 1) {
    position = nextResearchPosition(definition, action.track, position);
  }
  state.research[action.track][action.playerId] = position;
  if (action.track === 'magnifying') player.researchMagnifying = position;
  else player.researchJournal = position;
}
function cleanupPlayerForNextRound(state: GameState, playerId: PlayerId) {
  const player = state.players[playerId];
  player.availableWorkers = player.workers; player.hasPassed = false;
  if (player.playedCards.length > 0) {
    const seed = `${state.setupSeed ?? 'default'}:round:${state.round}:cleanup:${playerId}`;
    player.deck.push(...shuffleWithSeed(player.playedCards, seed));
    player.playedCards = [];
  }
  while (player.hand.length < 5 && player.deck.length > 0) player.hand.push(player.deck.shift()!);
}
function resolveGuardianFear(state: GameState, context: EngineContext) {
  for (const site of Object.values(state.sites)) {
    if (site.guardian && site.occupiedBy) addGuardianFear(state, site.occupiedBy, context);
  }
}
function finishRound(state: GameState, context: EngineContext) {
  resolveGuardianFear(state, context);
  for (const playerId of state.playerOrder) cleanupPlayerForNextRound(state, playerId);
  for (const site of Object.values(state.sites)) delete site.occupiedBy;
  if (state.round >= MAX_ROUNDS) { state.phase = 'finished'; return; }
  advanceMarketToNextRound(state);
  state.firstPlayer = rotateFirstPlayer(state); state.currentPlayer = state.firstPlayer;
}

export function reduce(state: GameState, action: GameAction, context: EngineContext = EMPTY_CONTEXT): GameState {
  const next = structuredClone(state);
  switch (action.type) {
    case 'START_GAME': {
      if (next.phase !== 'setup') throw new Error('Game has already started');
      next.playerOrder.forEach((playerId, index) => {
        const starting = STARTING_RESOURCES[index];
        next.players[playerId].resources.coin = starting.coin;
        next.players[playerId].resources.compass = starting.compass;
      });
      const seed = action.seed ?? 'default';
      next.setupSeed = seed;
      next.research.board = action.researchBoard ?? 'bird';
      setupDiscoveryDecks(next, context, seed);
      if (Object.keys(context.cards).length > 0) {
        const setup = prepareBaseGameSetup(context, next.playerOrder.length, seed);
        next.market = setup.market;
        next.playerOrder.forEach((playerId, index) => {
          const playerSetup = setup.playerDecks[index];
          next.players[playerId].color = playerSetup.color;
          next.players[playerId].hand = playerSetup.hand;
          next.players[playerId].deck = playerSetup.deck;
        });
      }
      next.phase = 'playing'; return next;
    }
    case 'GAIN_RESOURCE': addResource(next, action.playerId, action.resource, action.amount); return next;
    case 'SPEND_RESOURCE': spendResource(next, action.playerId, action.resource, action.amount); return next;
    case 'ADVANCE_RESEARCH': advanceResearch(next, action, context); return next;
    case 'PLAY_CARD': playCard(next, action, context); return next;
    case 'PLACE_WORKER': {
      assertPlaying(next); assertCurrentPlayer(next, action.playerId);
      const player = assertPlayer(next, action.playerId);
      const site = next.sites[action.siteId];
      if (!site) throw new Error(`Unknown site: ${action.siteId}`);
      if (site.occupiedBy) throw new Error('Site is occupied');
      if (player.availableWorkers < 1) throw new Error('No available worker');
      payTravelFromHand(next, action.playerId, action.paymentCardIds ?? [], context, action.siteId);
      player.availableWorkers -= 1;
      site.occupiedBy = action.playerId;
      resolveSite(next, action.playerId, action.siteId, context);
      return next;
    }
    case 'DISCOVER_SITE': discoverSite(next, action, context); return next;
    case 'BUY_CARD': buyCard(next, action, context); return next;
    case 'END_TURN': {
      assertPlaying(next); assertCurrentPlayer(next, action.playerId);
      const following = nextActivePlayer(next, action.playerId);
      if (!following) throw new Error('All players have passed; round should already be finished');
      next.currentPlayer = following; return next;
    }
    case 'PASS': {
      assertPlaying(next); assertCurrentPlayer(next, action.playerId);
      next.players[action.playerId].hasPassed = true;
      const following = nextActivePlayer(next, action.playerId);
      if (following) next.currentPlayer = following; else finishRound(next, context);
      return next;
    }
  }
}
