import { resolveLeaderPendingChoice, type LeaderPendingChoice } from './leaders/pending.ts';
import {
  resolvePendingAssistantReward,
  resolvePendingFalconerSite,
  resolvePendingFreeArtifact,
  resolvePendingFreeGuardian,
  resolvePendingLevel1SiteActivation,
  resolvePendingMysticArtifact,
  resolvePendingResearchChoice,
  resolvePendingVisibleSilverAssistant,
} from './pending-rewards.ts';
import type { CardId, EngineContext, GameState, PlayerId } from './types.ts';

/** Serializable choice contract exposed to a web client. */
export type PendingChoice =
  | { type:'assistant-stack'; stackIndex:number }
  | { type:'assistant'; assistantId:string }
  | { type:'research-option'; optionIndex:number }
  | { type:'artifact'; artifactId:CardId }
  | { type:'site'; siteId:string }
  | { type:'card'; cardId:CardId }
  | { type:'archive-swap'; archiveCardId:CardId; marketCardId:CardId }
  | { type:'ritual'; fearCount:2|3|4 }
  | { type:'skip' };

function pendingAt(state:GameState,playerId:PlayerId,index:number){
 if(!Number.isInteger(index)||index<0||index>=state.pendingRewards.length)throw new Error(`Invalid pending reward index: ${index}`);
 const pending=state.pendingRewards[index];if(pending.playerId!==playerId)throw new Error(`Pending reward belongs to ${pending.playerId}`);return pending;
}
function leaderChoice(choice:PendingChoice):LeaderPendingChoice{
 switch(choice.type){
  case'assistant':return{type:'assistant',assistantId:choice.assistantId};
  case'card':return{type:'card',cardId:choice.cardId};
  case'site':return{type:'site',siteId:choice.siteId};
  case'archive-swap':return{type:'archiveSwap',archiveCardId:choice.archiveCardId,marketCardId:choice.marketCardId};
  case'ritual':return{type:'ritual',fearCount:choice.fearCount};
  case'skip':return{type:'skip'};
  default:throw new Error(`Choice ${choice.type} is not valid for this leader pending action`);
 }
}

/**
 * Canonical pending resolver for UI/network callers. Internal specialized resolvers remain available,
 * while clients only need pending index + this discriminated choice object.
 */
export function resolvePendingChoice(state:GameState,playerId:PlayerId,pendingIndex:number,choice:PendingChoice,context:EngineContext):GameState{
 const pending=pendingAt(state,playerId,pendingIndex),payload=(pending.payload??{}) as Record<string,unknown>,payloadType=typeof payload.type==='string'?payload.type:undefined;
 if(pending.code.startsWith('leader:')&&pending.code!=='leader:FALCONER_EAGLE_REWARD'&&pending.code!=='leader:MYSTIC_OVERCOME_GUARDIAN_FREE'&&pending.code!=='leader:MYSTIC_BUY_ARTIFACT_DISCOUNT')return resolveLeaderPendingChoice(state,playerId,pendingIndex,leaderChoice(choice),context);
 if(pending.code==='leader:FALCONER_EAGLE_REWARD'){if(choice.type!=='site')throw new Error('Falconer site reward requires a site choice');return resolvePendingFalconerSite(state,playerId,pendingIndex,choice.siteId,context);}
 if(pending.code==='leader:MYSTIC_OVERCOME_GUARDIAN_FREE'||payloadType==='OVERCOME_GUARDIAN_FREE'){if(choice.type!=='site')throw new Error('Free guardian reward requires a site choice');return resolvePendingFreeGuardian(state,playerId,pendingIndex,choice.siteId);}
 if(pending.code==='leader:MYSTIC_BUY_ARTIFACT_DISCOUNT'){if(choice.type!=='artifact')throw new Error('Mystic Artifact reward requires an Artifact choice');return resolvePendingMysticArtifact(state,playerId,pendingIndex,choice.artifactId,context);}
 switch(payloadType){
  case'CLAIM_ASSISTANT':if(choice.type!=='assistant-stack')throw new Error('Assistant claim requires a stack choice');return resolvePendingAssistantReward(state,playerId,pendingIndex,{stackIndex:choice.stackIndex});
  case'UPGRADE_ASSISTANT':if(choice.type!=='assistant')throw new Error('Assistant upgrade requires an assistant choice');return resolvePendingAssistantReward(state,playerId,pendingIndex,{assistantId:choice.assistantId});
  case'CHOOSE':if(choice.type!=='research-option')throw new Error('Research choice requires an option index');return resolvePendingResearchChoice(state,playerId,pendingIndex,choice.optionIndex,context);
  case'ACQUIRE_ARTIFACT_FREE':if(choice.type!=='artifact')throw new Error('Free Artifact reward requires an Artifact choice');return resolvePendingFreeArtifact(state,playerId,pendingIndex,choice.artifactId,context);
  case'ACTIVATE_DISCOVERED_LEVEL1_SITE':if(choice.type!=='site')throw new Error('Level I site reward requires a site choice');return resolvePendingLevel1SiteActivation(state,playerId,pendingIndex,choice.siteId,context);
  case'ACTIVATE_VISIBLE_SILVER_ASSISTANT_THEN_BOTTOM':if(choice.type!=='assistant-stack')throw new Error('Visible assistant reward requires a stack choice');return resolvePendingVisibleSilverAssistant(state,playerId,pendingIndex,choice.stackIndex);
 }
 throw new Error(`Unsupported pending reward: ${pending.code}${payloadType?` (${payloadType})`:''}`);
}
