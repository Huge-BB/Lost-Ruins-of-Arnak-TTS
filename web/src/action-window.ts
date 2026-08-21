import type { ActionWindowState, GameState, PlayerId, TravelCost, TravelIcon } from './types.ts';

const ICONS: TravelIcon[] = ['boot','car','boat','plane'];

function windowFor(state:GameState,playerId:PlayerId):ActionWindowState {
  const current=state.actionWindow;
  if(current?.playerId===playerId)return current;
  const created:ActionWindowState={playerId,temporaryTravel:{}};
  state.actionWindow=created;
  return created;
}

/** Add travel icons created by a free/quick action. They live only inside the current action window. */
export function grantTemporaryTravel(state:GameState,playerId:PlayerId,travel:TravelCost):GameState {
  const next=structuredClone(state),window=windowFor(next,playerId);
  for(const icon of ICONS){const amount=travel[icon]??0;if(!Number.isInteger(amount)||amount<0)throw new Error(`Invalid temporary ${icon} amount`);if(amount)window.temporaryTravel[icon]=(window.temporaryTravel[icon]??0)+amount;}
  return next;
}

/** Consume exact icons for a later free/quick action. Main-action payment code must never call this function. */
export function consumeTemporaryTravel(state:GameState,playerId:PlayerId,cost:TravelCost):GameState {
  const next=structuredClone(state),window=windowFor(next,playerId);
  for(const icon of ICONS){const need=cost[icon]??0;if(!Number.isInteger(need)||need<0)throw new Error(`Invalid temporary ${icon} cost`);if((window.temporaryTravel[icon]??0)<need)throw new Error(`Insufficient temporary ${icon}`);}
  for(const icon of ICONS){const need=cost[icon]??0;if(need)window.temporaryTravel[icon]=(window.temporaryTravel[icon]??0)-need;}
  return next;
}

export function clearActionWindow(state:GameState):GameState {
  const next=structuredClone(state);delete next.actionWindow;return next;
}

export function temporaryTravelFor(state:GameState,playerId:PlayerId):TravelCost {
  if(state.actionWindow?.playerId!==playerId)return {};
  return {...state.actionWindow.temporaryTravel};
}
