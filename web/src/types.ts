export type PlayerId = string;
export type Resource = 'tablet' | 'arrowhead' | 'jewel' | 'coin' | 'compass' | 'fear';

export interface Resources {
  tablet: number;
  arrowhead: number;
  jewel: number;
  coin: number;
  compass: number;
  fear: number;
}

export interface PlayerState {
  id: PlayerId;
  name: string;
  resources: Resources;
  workers: number;
  availableWorkers: number;
  hasPassed: boolean;
  researchMagnifying: number;
  researchJournal: number;
  deck: string[];
  hand: string[];
  discard: string[];
  playedCards: string[];
}

export interface SiteState {
  id: string;
  level: 1 | 2;
  occupiedBy?: PlayerId;
  guardian?: string;
  idolSlots: number;
}

export interface MarketState {
  items: string[];
  artifacts: string[];
}

export interface ResearchState {
  magnifying: Record<PlayerId, number>;
  journal: Record<PlayerId, number>;
}

export interface GameState {
  version: 1;
  phase: 'setup' | 'playing' | 'finished';
  round: number;
  firstPlayer: PlayerId;
  currentPlayer: PlayerId;
  players: Record<PlayerId, PlayerState>;
  playerOrder: PlayerId[];
  sites: Record<string, SiteState>;
  market: MarketState;
  research: ResearchState;
}

export type GameAction =
  | { type: 'START_GAME' }
  | { type: 'END_TURN'; playerId: PlayerId }
  | { type: 'PASS'; playerId: PlayerId }
  | { type: 'PLACE_WORKER'; playerId: PlayerId; siteId: string }
  | { type: 'GAIN_RESOURCE'; playerId: PlayerId; resource: Resource; amount: number }
  | { type: 'SPEND_RESOURCE'; playerId: PlayerId; resource: Resource; amount: number }
  | { type: 'ADVANCE_RESEARCH'; playerId: PlayerId; track: 'magnifying' | 'journal'; amount?: number };
