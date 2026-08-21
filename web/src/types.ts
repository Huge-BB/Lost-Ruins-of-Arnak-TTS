export type PlayerId = string;
export type CardId = string;
export type PlayerColor = 'Yellow' | 'Green' | 'Blue' | 'Red';
export type Resource = 'tablet' | 'arrowhead' | 'jewel' | 'coin' | 'compass' | 'fear';
export type SpendableResource = Exclude<Resource, 'fear'>;
export type ResourceCost = Partial<Record<SpendableResource, number>>;
export type CardType = 'Item' | 'Artifact' | 'Fear' | 'Starter' | 'Other';
export type TravelIcon = 'boot' | 'car' | 'boat' | 'plane';
export type TravelCost = Partial<Record<TravelIcon, number>>;
export type ResearchBoardId = 'bird' | 'snake';
export type ResearchToken = 'magnifying' | 'journal';
export type AssistantLevel = 'silver' | 'gold';
export type ResearchNodeId = string;
export type ResearchBridgeId = string;

export interface Resources { tablet:number; arrowhead:number; jewel:number; coin:number; compass:number; fear:number; }
export interface PlayerRules { journalMaxLead:number; }
export type CardEffect = { type:'GAIN_RESOURCE'; resource:Resource; amount:number } | { type:'DRAW_CARD'; amount:number };
export type ResearchReward =
 | { type:'GAIN_RESOURCE'; resource:Resource; amount:number }
 | { type:'CLAIM_ASSISTANT'; level:'silver' }
 | { type:'UPGRADE_ASSISTANT'; level:'gold' }
 | { type:string; [key:string]:unknown };
export interface SpriteImage { faceUrl:string; backUrl?:string; sheetWidth?:number; sheetHeight?:number; cardIndex?:number; }
export interface AssistantImage { silverUrl:string; goldUrl:string; sheetWidth:number; sheetHeight:number; cardIndex:number; uniqueBack:boolean; }
export interface CardDefinition { id:CardId; name:string; type:CardType; expansion:string; color?:string; cost?:number; points?:number; travel?:TravelCost; image?:SpriteImage; }
export interface SiteDefinition { id:string; level:1|2; rewardCode:string; expansion:string; image?:SpriteImage; }
export interface IdolDefinition { id:string; rewardCode:string; expansion:string; image?:SpriteImage; }
export interface GuardianDefinition { id:string; expansion:string; image?:SpriteImage; }
export interface AssistantDefinition { id:string; expansion:string; image:AssistantImage; }
export interface ResearchNodeRewardDefinition { token?:ResearchToken; reward:ResearchReward; verified:boolean; }
export interface ResearchNodeDefinition { id:ResearchNodeId; rowIndex:number; pathIndex:number; researchLevel:number; spansLevels?:number[]; rewards?:ResearchNodeRewardDefinition[]; }
export interface ResearchBridgeDefinition { id:ResearchBridgeId; from:ResearchNodeId; to:ResearchNodeId; cost?:ResourceCost; reward?:ResearchReward; verified?:boolean; }
export interface ResearchRowDefinition { magnifyingPoints:number; journalPoints:number; grantsAssistant:boolean; nodes?:ResearchNodeDefinition[]; }
export interface ResearchTrackDefinition { id:ResearchBoardId; name:string; rows:ResearchRowDefinition[]; bridges?:ResearchBridgeDefinition[]; templeArrivalPoints?: [number, number, number, number]; }
export interface ResearchManualNodeOverride { node:ResearchNodeId; researchLevel?:number; spansLevels?:number[]; verified:boolean; comment?:string; }
export interface ResearchManualNodeReward { node:ResearchNodeId; token?:ResearchToken; reward:ResearchReward; verified:boolean; comment?:string; }
export interface ResearchManualBridge { from:ResearchNodeId; to:ResearchNodeId; cost:ResourceCost; reward?:ResearchReward; verified:boolean; comment?:string; }
export interface ResearchManualBoardData { bridges:ResearchManualBridge[]; nodeOverrides?:ResearchManualNodeOverride[]; nodeRewards:ResearchManualNodeReward[]; templeArrivalPoints?: [number, number, number, number]; }
export interface ResearchManualData { $schemaVersion:1|2; boards:Partial<Record<ResearchBoardId, ResearchManualBoardData>>; }
export interface PendingReward { playerId:PlayerId; sourceId:string; code:string; payload?:unknown; }
export interface PlayerIdol { id:string; faceUp:boolean; }
export interface PlayerAssistant { id:string; level:AssistantLevel; exhausted:boolean; }
export interface PlayerState { id:PlayerId; name:string; color:PlayerColor; rules:PlayerRules; resources:Resources; workers:number; availableWorkers:number; hasPassed:boolean; researchMagnifying:number; researchJournal:number; deck:CardId[]; hand:CardId[]; discard:CardId[]; playedCards:CardId[]; idols:PlayerIdol[]; assistants:PlayerAssistant[]; defeatedGuardians:string[]; }
export interface SiteState { id:string; level:1|2; tileId?:string; occupiedBy?:PlayerId; guardian?:string; idolSlots:number; travelCost?:TravelCost; }
export interface DiscoveryState { level1Deck:string[]; level2Deck:string[]; guardianDeck:string[]; idolDeck:string[]; }
export interface AssistantSupplyState { stacks:string[][]; specialStack:string[]; }
export interface MarketState { items:CardId[]; artifacts:CardId[]; itemDeck:CardId[]; artifactDeck:CardId[]; exiled:CardId[]; }
export interface ResearchState { board:ResearchBoardId; magnifying:Record<PlayerId,number>; journal:Record<PlayerId,number>; magnifyingNode:Record<PlayerId,ResearchNodeId>; journalNode:Record<PlayerId,ResearchNodeId>; templeArrivals:PlayerId[]; templeArrivalPoints:Record<PlayerId,number>; }
export interface GameState { version:1; phase:'setup'|'playing'|'finished'; round:number; setupSeed?:string; firstPlayer:PlayerId; currentPlayer:PlayerId; players:Record<PlayerId,PlayerState>; playerOrder:PlayerId[]; sites:Record<string,SiteState>; discovery:DiscoveryState; assistants:AssistantSupplyState; market:MarketState; research:ResearchState; pendingRewards:PendingReward[]; }
export interface EngineContext { cards:Record<CardId,CardDefinition>; cardEffects?:Record<CardId,CardEffect[]>; sites?:Record<string,SiteDefinition>; idols?:Record<string,IdolDefinition>; guardians?:Record<string,GuardianDefinition>; assistants?:Record<string,AssistantDefinition>; researchTracks?:Partial<Record<ResearchBoardId,ResearchTrackDefinition>>; }
export type GameAction =
 | { type:'START_GAME'; seed?:string; researchBoard?:ResearchBoardId }
 | { type:'END_TURN'; playerId:PlayerId }
 | { type:'PASS'; playerId:PlayerId }
 | { type:'PLAY_CARD'; playerId:PlayerId; cardId:CardId }
 | { type:'PLACE_WORKER'; playerId:PlayerId; siteId:string; paymentCardIds?:CardId[] }
 | { type:'DISCOVER_SITE'; playerId:PlayerId; siteId:string; paymentCardIds?:CardId[] }
 | { type:'GAIN_RESOURCE'; playerId:PlayerId; resource:Resource; amount:number }
 | { type:'SPEND_RESOURCE'; playerId:PlayerId; resource:Resource; amount:number }
 | { type:'ADVANCE_RESEARCH'; playerId:PlayerId; track:ResearchToken; toNodeId?:ResearchNodeId; amount?:number }
 | { type:'CLAIM_ASSISTANT'; playerId:PlayerId; stackIndex:number }
 | { type:'UPGRADE_ASSISTANT'; playerId:PlayerId; assistantId:string }
 | { type:'EXHAUST_ASSISTANT'; playerId:PlayerId; assistantId:string }
 | { type:'REFRESH_ASSISTANT'; playerId:PlayerId; assistantId:string }
 | { type:'BUY_CARD'; playerId:PlayerId; cardId:CardId };
