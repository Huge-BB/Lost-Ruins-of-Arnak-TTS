import { reduce } from './engine.ts';
import { reduceExpeditionLeaderAction, type ExpeditionLeaderAction } from './leaders/reducer.ts';
import type { EngineContext, GameAction, GameState } from './types.ts';

type DiscoverAction=Extract<GameAction,{type:'DISCOVER_SITE'}>;
export type LeaderAwareDiscoverAction=DiscoverAction&{
  useScouting?:boolean; siteChoiceIndex?:0|1;
  useTracking?:boolean; guardianChoiceIndex?:0|1;
};
export type LeaderAwareGameAction=Exclude<GameAction,DiscoverAction>|LeaderAwareDiscoverAction|ExpeditionLeaderAction;

function chooseTopTwo(deck:string[],choice:0|1,label:string){
  if(deck.length<2)throw new Error(`${label} requires at least two tiles in the stack`);
  const [first,second,...rest]=deck; const chosen=choice===0?first:second,other=choice===0?second:first;
  return [chosen,...rest,other];
}

/**
 * Canonical reducer facade when Expedition Leaders are enabled.
 * It delegates base-game actions to the core reducer and intercepts only leader-specific actions/hooks.
 */
export function reduceWithLeaders(state:GameState,action:LeaderAwareGameAction,context:EngineContext):GameState{
  if(action.type.startsWith('LEADER_'))return reduceExpeditionLeaderAction(state,action as ExpeditionLeaderAction,context);
  if(action.type!=='DISCOVER_SITE')return reduce(state,action as GameAction,context);

  const next=structuredClone(state),player=next.players[action.playerId],leader=player?.leader;
  if(!player)throw new Error(`Unknown player: ${action.playerId}`);

  if(leader?.id==='explorer'&&leader.data.scoutingSiteChoiceThisTurn===true){
    if(action.useScouting){
      if(action.siteChoiceIndex!==0&&action.siteChoiceIndex!==1)throw new Error('Scouting requires siteChoiceIndex 0 or 1');
      const site=next.sites[action.siteId]; if(!site)throw new Error(`Unknown site: ${action.siteId}`);
      const deck=site.level===1?next.discovery.level1Deck:next.discovery.level2Deck;
      const reordered=chooseTopTwo(deck,action.siteChoiceIndex,'Scouting');
      if(site.level===1)next.discovery.level1Deck=reordered; else next.discovery.level2Deck=reordered;
    }
    leader.data.scoutingSiteChoiceThisTurn=false;
  }

  if(leader?.id==='falconer'&&leader.data.trackingGuardianChoiceThisTurn===true){
    if(action.useTracking){
      if(action.guardianChoiceIndex!==0&&action.guardianChoiceIndex!==1)throw new Error('Tracking requires guardianChoiceIndex 0 or 1');
      next.discovery.guardianDeck=chooseTopTwo(next.discovery.guardianDeck,action.guardianChoiceIndex,'Tracking');
    }
    leader.data.trackingGuardianChoiceThisTurn=false;
  }

  return reduce(next,action as DiscoverAction,context);
}
