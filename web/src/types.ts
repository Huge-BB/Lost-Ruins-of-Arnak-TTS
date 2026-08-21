export type PlayerId = string;
export type CardId = string;
export type PlayerColor = 'Yellow' | 'Green' | 'Blue' | 'Red';
export type Resource = 'tablet' | 'arrowhead' | 'jewel' | 'coin' | 'compass' | 'fear';
export type CardType = 'Item' | 'Artifact' | 'Fear' | 'Starter' | 'Other';
export type TravelIcon = 'boot' | 'car' | 'boat' | 'plane';
export type TravelCost = Partial<Record<TravelIcon, number>>;

export interface Resources {
  tablet: number;
  arrowhead: number;
  jewel: number;
  coin: number;
  compass: number;
  fear: number;
}

export type CardEffect =
  | { type: 'GAIN_RESOURCE'; resource: Resource; amount: number }
  | { type: 'DRAW_CARD'; amount: number };

export interface SpriteImage {
  faceUrl: string;
  backUrl?: string;
  sheetWidth?: number;
  sheetHeight?: number;
  cardIndex?: number;
}

export interface CardDefinition {
  id: CardId;
  name: string;
  type: CardType;
  expansion: string;
  color?: string;
  cost?: number;
  points?: number;
  travel?: TravelCost;
  image?: SpriteImage;
}

export interface SiteDefinition {
  id: string;
  level: 1 | 2;
  rewardCode: string;
  expansion: string;
  image?: SpriteImage;
}

export interface IdolDefinition {
  id: string;
  rewardCode: string;
  expansion: string;
  image?: SpriteImage;
}

export interface GuardianDefinition {
  id: string;
  expansion: string;
  image?: SpriteImage;
}

export interface PendingReward {
  playerId: PlayerId;
  sourceId: string;
  code: string;
}

export interface PlayerIdol {
  id: string;
  faceUp: boolean;
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
  idols: PlayerIdol[];
}

export interface SiteState {
  id: string;
  level: 1 | 2;
  tileId?: string;
  occupiedBy?: PlayerId;
  guardian?: string;
  idolSlots: number;
  travelCost?: TravelCost;
}

export interface DiscoveryState {
  level1Deck: string[];
  level2Deck: string[];
  guardianDeck: string[];
  idolDeck: string[];
}

export interface MarketState {
  items: CardId[];
  artifacts: CardId[];
  itemDeck: CardId[];
  artifactDeck: CardId[];
  exiled: CardId[];
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
  discovery: DiscoveryState;
  market: MarketState;
  research: ResearchState;
  pendingRewards: PendingReward[];
}

export interface EngineContext {
  cards: Record<CardId, CardDefinition>;
  cardEffects?: Record<CardId, CardEffect[]>;
  sites?: Record<string, SiteDefinition>;
  idols?: Record<string, IdolDefinition>;
  guardians?: Record<string, GuardianDefinition>;
}

export type GameAction =
  | { type: 'START_GAME'; seed?: string }
  | { type: 'END_TURN'; playerId: PlayerId }
  | { type: 'PASS'; playerId: PlayerId }
  | { type: 'PLAY_CARD'; playerId: PlayerId; cardId: CardId }
  | { type: 'PLACE_WORKER'; playerId: PlayerId; siteId: string; paymentCardIds?: CardId[] }
  | { type: 'DISCOVER_SITE'; playerId: PlayerId; siteId: string; paymentCardIds?: CardId[] }
  | { type: 'GAIN_RESOURCE'; playerId: PlayerId; resource: Resource; amount: number }
  | { type: 'SPEND_RESOURCE'; playerId: PlayerId; resource: Resource; amount: number }
  | { type: 'ADVANCE_RESEARCH'; playerId: PlayerId; track: 'magnifying' | 'journal'; amount?: number }
  | { type: 'BUY_CARD'; playerId: PlayerId; cardId: CardId };
