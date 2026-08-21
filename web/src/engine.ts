import type { GameAction, GameState, PlayerId, Resource } from './types.ts';

const MAX_ROUNDS = 5;

const STARTING_RESOURCES = [
  { coin: 2, compass: 0 },
  { coin: 1, compass: 1 },
  { coin: 2, compass: 1 },
  { coin: 1, compass: 2 },
] as const;

const emptyResources = () => ({
  tablet: 0,
  arrowhead: 0,
  jewel: 0,
  coin: 0,
  compass: 0,
  fear: 0,
});

export function createGame(playerIds: PlayerId[]): GameState {
  if (playerIds.length < 1 || playerIds.length > 4) {
    throw new Error('Arnak supports 1-4 players');
  }

  const players = Object.fromEntries(
    playerIds.map((id, index) => [id, {
      id,
      name: `Player ${index + 1}`,
      resources: emptyResources(),
      workers: 2,
      availableWorkers: 2,
      hasPassed: false,
      researchMagnifying: 0,
      researchJournal: 0,
      deck: [],
      hand: [],
      discard: [],
      playedCards: [],
    }]),
  );

  return {
    version: 1,
    phase: 'setup',
    round: 1,
    firstPlayer: playerIds[0],
    currentPlayer: playerIds[0],
    players,
    playerOrder: [...playerIds],
    sites: {},
    market: { items: [], artifacts: [] },
    research: {
      magnifying: Object.fromEntries(playerIds.map(id => [id, 0])),
      journal: Object.fromEntries(playerIds.map(id => [id, 0])),
    },
  };
}

function assertPlaying(state: GameState) {
  if (state.phase !== 'playing') throw new Error('Game is not in progress');
}

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

function finishRound(state: GameState) {
  for (const site of Object.values(state.sites)) delete site.occupiedBy;
  for (const player of Object.values(state.players)) {
    player.availableWorkers = player.workers;
    player.hasPassed = false;
    player.discard.push(...player.playedCards);
    player.playedCards = [];
  }

  if (state.round >= MAX_ROUNDS) {
    state.phase = 'finished';
    return;
  }

  state.round += 1;
  state.firstPlayer = rotateFirstPlayer(state);
  state.currentPlayer = state.firstPlayer;
}

export function reduce(state: GameState, action: GameAction): GameState {
  const next = structuredClone(state);

  switch (action.type) {
    case 'START_GAME': {
      if (next.phase !== 'setup') throw new Error('Game has already started');
      next.playerOrder.forEach((playerId, index) => {
        const starting = STARTING_RESOURCES[index];
        next.players[playerId].resources.coin = starting.coin;
        next.players[playerId].resources.compass = starting.compass;
      });
      next.phase = 'playing';
      return next;
    }

    case 'GAIN_RESOURCE':
      addResource(next, action.playerId, action.resource, action.amount);
      return next;

    case 'SPEND_RESOURCE':
      spendResource(next, action.playerId, action.resource, action.amount);
      return next;

    case 'ADVANCE_RESEARCH': {
      assertPlaying(next);
      const player = assertPlayer(next, action.playerId);
      const amount = action.amount ?? 1;
      if (!Number.isInteger(amount) || amount < 1) throw new Error('Research amount must be positive');
      const key = action.track;
      player[key === 'magnifying' ? 'researchMagnifying' : 'researchJournal'] += amount;
      next.research[key][action.playerId] += amount;
      return next;
    }

    case 'PLACE_WORKER': {
      assertPlaying(next);
      assertCurrentPlayer(next, action.playerId);
      const player = assertPlayer(next, action.playerId);
      const site = next.sites[action.siteId];
      if (!site) throw new Error(`Unknown site: ${action.siteId}`);
      if (site.occupiedBy) throw new Error('Site is occupied');
      if (player.availableWorkers < 1) throw new Error('No available worker');
      player.availableWorkers -= 1;
      site.occupiedBy = action.playerId;
      return next;
    }

    case 'END_TURN': {
      assertPlaying(next);
      assertCurrentPlayer(next, action.playerId);
      const following = nextActivePlayer(next, action.playerId);
      if (!following) throw new Error('All players have passed; round should already be finished');
      next.currentPlayer = following;
      return next;
    }

    case 'PASS': {
      assertPlaying(next);
      assertCurrentPlayer(next, action.playerId);
      next.players[action.playerId].hasPassed = true;
      const following = nextActivePlayer(next, action.playerId);
      if (following) {
        next.currentPlayer = following;
      } else {
        finishRound(next);
      }
      return next;
    }
  }
}
