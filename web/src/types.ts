export type PlayerId = string;
export type CardId = string;
export type PlayerColor = 'Yellow' | 'Green' | 'Blue' | 'Red';
export type Resource = 'tablet' | 'arrowhead' | 'jewel' | 'coin' | 'compass' | 'fear';
export type CardType = 'Item' | 'Artifact' | 'Fear' | 'Starter' | 'Other';
export type TravelIcon = 'boot' | 'car' | 'boat' | 'plane';

export interface Resources {
  tablet: number;
  arrowhead: number;
  jewel: number;
  coin: number;
  compass: number;
  fear: number;
}

export interface CardDefinition {
  id: CardId;
  name: string;
  type: CardType;
  expansion: string;
  color?: string;
  cost?: number;
  points?: number;
  travel?: Partial<Record<TravelIcon, number>>;
  image?: {
    faceUrl: string;
    backUrl?: string;
    sheetWidth?: number;
    sheetHeight?: number;
    cardIndex?: number;
  };
}

export interface PlayerState {
  id: PlayerId;
  name: string;
  color: PlayerColor;
  resources: Resources;
  workers: number;
  availableWorkers: number;
  hasPassed: boolean;
  researchMagnifying: number;
  researchJournal: number;
  deck: CardId[];
  hand: CardId[];
  discard: CardId[];
  playedCards: CardId[];
}

export interface SiteState {
  id: string;
  level: 1 | 2;
  occupiedBy?: PlayerId;
  guardian?: string;
  idolSlots: number;
}

export interface MarketState {
  items: CardId[];
  artifacts: CardId[];
  itemDeck: CardId[];
  artifactDeck: CardId[];
}

export interface ResearchState {
  magnifying: Record<PlayerId, number>;
  journal: Record<PlayerId, number>;
}

export interface GameState {
  version: 1;
  phase: 'setup' | 'playing' | 'finished';
  round: number;
  setupSeed?: string;
  firstPlayer: PlayerId;
  currentPlayer: PlayerId;
  players: Record<PlayerId, PlayerState>;
  playerOrder: PlayerId[];
  sites: Record<string, SiteState>;
  market: MarketState;
  research: ResearchState;
}

export interface EngineContext {
  cards: Record<CardId, CardDefinition>;
}

export type GameAction =
  | { type: 'START_GAME'; seed?: string }
  | { type: 'END_TURN'; playerId: PlayerId }
  | { type: 'PASS'; playerId: PlayerId }
  | { type: 'PLACE_WORKER'; playerId: PlayerId; siteId: string }
  | { type: 'GAIN_RESOURCE'; playerId: PlayerId; resource: Resource; amount: number }
  | { type: 'SPEND_RESOURCE'; playerId: PlayerId; resource: Resource; amount: number }
  | { type: 'ADVANCE_RESEARCH'; playerId: PlayerId; track: 'magnifying' | 'journal'; amount?: number }
  | { type: 'BUY_CARD'; playerId: PlayerId; cardId: CardId };
