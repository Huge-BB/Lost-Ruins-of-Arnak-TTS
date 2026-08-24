import { resolveRewardCode } from './site-rewards.ts';
import type { EngineContext, GameState, PlayerId } from './types.ts';

type SiteWithAssignedIdols = GameState['sites'][string] & { faceUpIdolId?:string; faceDownIdolIds?:string[] };

export function assignedFaceUpIdol(state:GameState,siteId:string):string|undefined {
  return (state.sites[siteId] as SiteWithAssignedIdols|undefined)?.faceUpIdolId;
}

/** Make the core discovery reducer take the idols physically assigned to this site. Legacy sites without assignments keep deck-top behavior. */
export function prepareAssignedSiteIdols(state:GameState,siteId:string):GameState {
  const next=structuredClone(state),site=next.sites[siteId] as SiteWithAssignedIdols|undefined;
  if(!site?.faceUpIdolId)return next;
  const assigned=[site.faceUpIdolId,...(site.faceDownIdolIds??[])];
  next.discovery.idolDeck=next.discovery.idolDeck.filter(id=>!assigned.includes(id));
  next.discovery.idolDeck.unshift(...assigned);
  return next;
}

export function clearAssignedSiteIdols(state:GameState,siteId:string):GameState {
  const next=structuredClone(state),site=next.sites[siteId] as SiteWithAssignedIdols|undefined;
  if(site){delete site.faceUpIdolId;delete site.faceDownIdolIds;}
  return next;
}

/** Cartography activates the visible idol on an undiscovered site without taking or flipping it. */
export function activateFaceUpUndiscoveredIdol(state:GameState,playerId:PlayerId,siteId:string,context:EngineContext):GameState {
  const next=structuredClone(state),site=next.sites[siteId] as SiteWithAssignedIdols|undefined;
  if(!site)throw new Error(`Unknown site: ${siteId}`);
  if(site.tileId)throw new Error('Cartography requires an undiscovered site');
  const idolId=site.faceUpIdolId;if(!idolId)throw new Error('Site has no face-up idol to activate');
  const idol=context.idols?.[idolId];if(!idol)throw new Error(`Unknown idol: ${idolId}`);
  resolveRewardCode(next,playerId,idolId,idol.rewardCode,context);
  return next;
}
