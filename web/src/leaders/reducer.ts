import type { CardId, EngineContext, GameState, PlayerId } from '../types.ts';
import { baronessPlaySpecialDelivery, captainCallSpecialist, explorerSpendSnack, falconerReturnEagle, mysticPerformRitual, professorBuyArchiveArtifact } from './actions.ts';
import { resolveLeaderStartingCard, type LeaderCardChoice } from './card-rules.ts';
import { falconerUseGuardianBoonForFlight, mysticExileFear, mysticExileStartingCardForRitual } from './extra-actions.ts';

export type ExpeditionLeaderAction =
  | { type:'LEADER_STARTING_CARD_EFFECT'; playerId:PlayerId; cardId:CardId; choice:LeaderCardChoice; snackId?:'free'|'coin'|'compass' }
  | { type:'LEADER_BARONESS_SPECIAL_DELIVERY'; playerId:PlayerId }
  | { type:'LEADER_CAPTAIN_SPECIALIST'; playerId:PlayerId; stackIndex:number }
  | { type:'LEADER_FALCONER_RETURN_EAGLE'; playerId:PlayerId; rewardPosition:number }
  | { type:'LEADER_FALCONER_GUARDIAN_BOON'; playerId:PlayerId; guardianId:string }
  | { type:'LEADER_PROFESSOR_BUY_ARCHIVE'; playerId:PlayerId; cardId:CardId; suitcaseCompass?:number }
  | { type:'LEADER_EXPLORER_SPEND_SNACK'; playerId:PlayerId; snackId:'free'|'coin'|'compass'; siteId:string }
  | { type:'LEADER_MYSTIC_EXILE_FEAR'; playerId:PlayerId; cardId:CardId }
  | { type:'LEADER_MYSTIC_EXILE_STARTING_CARD'; playerId:PlayerId; cardId:CardId }
  | { type:'LEADER_MYSTIC_RITUAL'; playerId:PlayerId; fearCount:2|3|4 };

function assertLeaderTurn(state:GameState,playerId:PlayerId){
  if(state.phase!=='playing')throw new Error('Game is not in progress');
  const player=state.players[playerId];
  if(!player)throw new Error(`Unknown player: ${playerId}`);
  if(state.currentPlayer!==playerId)throw new Error(`It is not ${playerId}'s turn`);
  if(player.hasPassed)throw new Error(`${playerId} has already passed`);
}

function moveStartingCardToPlayArea(state:GameState,playerId:PlayerId,cardId:CardId){
  const next=structuredClone(state),player=next.players[playerId],index=player.hand.indexOf(cardId);
  if(index<0)throw new Error('Leader starting card is not in hand');
  player.hand.splice(index,1); player.playedCards.push(cardId); return next;
}

/** Public reducer for every Expedition Leaders player action. Core/UI code should use this instead of leader helpers. */
export function reduceExpeditionLeaderAction(state:GameState,action:ExpeditionLeaderAction,context:EngineContext):GameState{
  assertLeaderTurn(state,action.playerId);
  switch(action.type){
    case 'LEADER_STARTING_CARD_EFFECT': {
      const next=moveStartingCardToPlayArea(state,action.playerId,action.cardId);
      return resolveLeaderStartingCard(next,action.playerId,action.cardId,action.choice,context,{snackId:action.snackId});
    }
    case 'LEADER_BARONESS_SPECIAL_DELIVERY': return baronessPlaySpecialDelivery(state,action.playerId);
    case 'LEADER_CAPTAIN_SPECIALIST': return captainCallSpecialist(state,action.playerId,action.stackIndex);
    case 'LEADER_FALCONER_RETURN_EAGLE': return falconerReturnEagle(state,action.playerId,action.rewardPosition);
    case 'LEADER_FALCONER_GUARDIAN_BOON': return falconerUseGuardianBoonForFlight(state,action.playerId,action.guardianId);
    case 'LEADER_PROFESSOR_BUY_ARCHIVE': return professorBuyArchiveArtifact(state,action.playerId,action.cardId,context,action.suitcaseCompass??0);
    case 'LEADER_EXPLORER_SPEND_SNACK': return explorerSpendSnack(state,action.playerId,action.snackId,action.siteId);
    case 'LEADER_MYSTIC_EXILE_FEAR': return mysticExileFear(state,action.playerId,action.cardId,context);
    case 'LEADER_MYSTIC_EXILE_STARTING_CARD': return mysticExileStartingCardForRitual(state,action.playerId,action.cardId,context);
    case 'LEADER_MYSTIC_RITUAL': return mysticPerformRitual(state,action.playerId,action.fearCount);
  }
}
