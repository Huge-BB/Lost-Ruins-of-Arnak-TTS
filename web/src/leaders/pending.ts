import { refreshOwnedAssistant } from '../assistant-actions.ts';
import type { CardId, EngineContext, GameState, PlayerId } from '../types.ts';
import { activateDiscoveredSiteForLeader, mysticPerformRitual } from './actions.ts';
import { mysticExileFear } from './extra-actions.ts';

export type LeaderPendingChoice =
  | { type:'assistant'; assistantId:string }
  | { type:'card'; cardId:CardId }
  | { type:'site'; siteId:string }
  | { type:'archiveSwap'; archiveCardId:CardId; marketCardId:CardId }
  | { type:'ritual'; fearCount:2|3|4 }
  | { type:'skip' };

function ownedPending(state:GameState,playerId:PlayerId,index:number){
  if(!Number.isInteger(index)||index<0||index>=state.pendingRewards.length)throw new Error(`Invalid pending reward index: ${index}`);
  const pending=state.pendingRewards[index]; if(pending.playerId!==playerId)throw new Error(`Pending reward belongs to ${pending.playerId}`); return pending;
}
function removePending(state:GameState,index:number){const next=structuredClone(state);next.pendingRewards.splice(index,1);return next;}
function removeOwnedCard(state:GameState,playerId:PlayerId,cardId:CardId){
  const next=structuredClone(state),p=next.players[playerId];
  for(const zone of [p.hand,p.playedCards,p.discard,p.deck]){const i=zone.indexOf(cardId);if(i>=0){zone.splice(i,1);next.market.exiled.push(cardId);return next;}}
  throw new Error('Card is not owned by the player');
}
function addCaptainHiddenFearBonus(state:GameState,playerId:PlayerId,context:EngineContext,cardId:CardId){
  const player=state.players[playerId],card=context.cards[cardId];
  if(player.leader?.id!=='captain'||card?.name!=='Hidden Fear')return;
  const fear=Object.values(context.cards).find(candidate=>candidate.type==='Fear'&&candidate.expansion==='Base Game');
  if(fear)player.playedCards.push(fear.id);
  player.resources.compass+=1;
}

/** Resolve pending rewards emitted by Expedition Leaders cards and leader boards. */
export function resolveLeaderPendingChoice(state:GameState,playerId:PlayerId,pendingIndex:number,choice:LeaderPendingChoice,context:EngineContext):GameState{
  const pending=ownedPending(state,playerId,pendingIndex),payload=(pending.payload??{}) as Record<string,unknown>;
  switch(pending.code){
    case 'leader:MYSTIC_RITUAL_CHOICE': {
      if(choice.type!=='ritual')throw new Error('Mystic ritual choice requires a fear count');
      const allowed=(payload.allowedFearCounts??[2,3,4]) as number[]; if(!allowed.includes(choice.fearCount))throw new Error('Ritual fear count is not allowed');
      const without=removePending(state,pendingIndex); return mysticPerformRitual(without,playerId,choice.fearCount);
    }
    case 'leader:REFRESH_OWN_ASSISTANT': {
      if(choice.type!=='assistant')throw new Error('Assistant refresh requires an assistant choice');
      const resolved=refreshOwnedAssistant(state,playerId,choice.assistantId); return removePending(resolved,pendingIndex);
    }
    case 'leader:EXILE_OWN_CARD': {
      if(choice.type!=='card')throw new Error('Exile effect requires a card choice'); const card=context.cards[choice.cardId];
      let resolved:GameState;
      if(state.players[playerId].leader?.id==='mystic'&&card?.type==='Fear')resolved=mysticExileFear(state,playerId,choice.cardId,context); else {resolved=removeOwnedCard(state,playerId,choice.cardId);addCaptainHiddenFearBonus(resolved,playerId,context,choice.cardId);}
      return removePending(resolved,pendingIndex);
    }
    case 'leader:OPTIONAL_EXILE_FAR_LEFT_ITEM': {
      if(choice.type==='skip')return removePending(state,pendingIndex); if(choice.type!=='card')throw new Error('Market exile requires a card choice');
      const farLeft=state.market.items[0]; if(!farLeft||choice.cardId!==farLeft)throw new Error('Only the far-left Item may be exiled');
      const next=structuredClone(state); next.market.items.shift(); next.market.exiled.push(farLeft); if(payload.refill===true){const refill=next.market.itemDeck.shift();if(refill)next.market.items.unshift(refill);} next.pendingRewards.splice(pendingIndex,1); return next;
    }
    case 'leader:OPTIONAL_SWAP_ARCHIVE_ARTIFACT': {
      if(choice.type==='skip')return removePending(state,pendingIndex);
      if(choice.type!=='archiveSwap')throw new Error('Archive swap requires archive and market Artifact choices');
      const leader=state.players[playerId].leader;if(leader?.id!=='professor')throw new Error('Only the Professor can swap archive Artifacts');
      const archive=(leader.data.archive??[]) as CardId[];const archiveIndex=archive.indexOf(choice.archiveCardId);const marketIndex=state.market.artifacts.indexOf(choice.marketCardId);
      if(archiveIndex<0)throw new Error('Chosen Artifact is not in the Professor archive');if(marketIndex<0)throw new Error('Chosen Artifact is not in the market row');
      if(context.cards[choice.archiveCardId]?.type!=='Artifact'||context.cards[choice.marketCardId]?.type!=='Artifact')throw new Error('Archive swap requires Artifact cards');
      const next=structuredClone(state),nextArchive=next.players[playerId].leader!.data.archive as CardId[];
      nextArchive[archiveIndex]=choice.marketCardId;next.market.artifacts[marketIndex]=choice.archiveCardId;next.pendingRewards.splice(pendingIndex,1);return next;
    }
    case 'leader:ACTIVATE_DISCOVERED_SITE': {
      if(choice.type!=='site')throw new Error('Site activation requires a site choice'); const resolved=activateDiscoveredSiteForLeader(state,playerId,choice.siteId,context); return removePending(resolved,pendingIndex);
    }
    default: throw new Error(`Unsupported leader pending reward: ${pending.code}`);
  }
}
