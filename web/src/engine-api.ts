import { reduceWithLeaders, type LeaderAwareGameAction } from './engine-with-leaders.ts';
import { resolvePendingChoice, type PendingChoice } from './pending-choice.ts';
import type { EngineContext, GameState, PlayerId } from './types.ts';

/**
 * Public command surface for the web/network layer.
 *
 * UI code should use this facade instead of importing reduce(),
 * reduceWithActionWindow(), reduceWithLeaders(), or specialized pending
 * resolvers directly. This keeps leader hooks, action-window travel, and
 * pending-choice ownership validation on every client-driven transition.
 */
export type EngineCommand =
  | { type:'action'; action:LeaderAwareGameAction }
  | { type:'pending-choice'; playerId:PlayerId; pendingIndex:number; choice:PendingChoice };

export function applyEngineCommand(
  state:GameState,
  command:EngineCommand,
  context:EngineContext,
):GameState {
  switch(command.type){
    case'action':
      return reduceWithLeaders(state,command.action,context);
    case'pending-choice':
      return resolvePendingChoice(state,command.playerId,command.pendingIndex,command.choice,context);
  }
}
