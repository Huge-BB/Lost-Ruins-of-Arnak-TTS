import type { PlayerState } from './types.ts';

export const GUARDIAN_POINTS = 5;

export function guardianScore(player: Pick<PlayerState, 'defeatedGuardians'>): number {
  return player.defeatedGuardians.length * GUARDIAN_POINTS;
}
