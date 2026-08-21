import type { GameAction, GameState, PlayerId, Resource } from './types.ts';

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

function assertPlayer(state: GameState, playerId: PlayerId) {
  const player = state.players[playerId];
  if (!player) throw new Error(`Unknown player: ${playerId}`);
  return player;
}

function assertCurrentPlayer(state: GameState, playerId: PlayerId) {
  if (state.currentPlayer !== playerId) {
    throw new Error(`It is not ${playerId}'s turn`);
  }
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

export function reduce(state: GameState, action: GameAction): GameState {
  const next = structuredClone(state);

  switch (action.type) {
    case 'START_GAME':
      if (next.phase !== 'setup') throw new Error('Game has already started');
      next.phase = 'playing';
      return next;

    case 'GAIN_RESOURCE':
      addResource(next, action.playerId, action.resource, action.amount);
      return next;

    case 'SPEND_RESOURCE':
      spendResource(next, action.playerId, action.resource, action.amount);
      return next;

    case 'ADVANCE_RESEARCH': {
      const player = assertPlayer(next, action.playerId);
      const amount = action.amount ?? 1;
      if (!Number.isInteger(amount) || amount < 1) throw new Error('Research amount must be positive');
      const key = action.track;
      player[key === 'magnifying' ? 'researchMagnifying' : 'researchJournal'] += amount;
      next.research[key][action.playerId] += amount;
      return next;
    }

    case 'PLACE_WORKER': {
      assertCurrentPlayer(next, action.playerId);
      if (next.phase !== 'playing') throw new Error('Game is not in progress');
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
      assertCurrentPlayer(next, next.currentPlayer);
      const index = next.playerOrder.indexOf(next.currentPlayer);
      const nextIndex = (index + 1) % next.playerOrder.length;
      if (nextIndex === 0) next.round += 1;
      next.currentPlayer = next.playerOrder[nextIndex];
      return next;
    }
  }
}
