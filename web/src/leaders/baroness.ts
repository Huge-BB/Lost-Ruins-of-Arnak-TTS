import { setLeaderState } from './utils.ts';
import type { LeaderRules } from './types.ts';

export const baronessLeader: LeaderRules = {
  id: 'baroness',
  name: 'Baroness',
  expansion: 'Expedition Leaders',
  startingCardNames: ['Connections', 'Research Notes', 'Resourcefulness', 'Special Delivery'],
  setup({ state, playerId }) {
    setLeaderState(state, playerId, 'baroness', {
      incomeRoundsRemaining: [2, 3, 4, 5],
    });
  },
  onRoundStart({ state, playerId, round }) {
    const leader = (state.players[playerId] as any).leader;
    if (leader?.id !== 'baroness') return;
    const remaining: number[] = leader.data.incomeRoundsRemaining ?? [];
    if (!remaining.includes(round)) return;
    state.players[playerId].resources.coin += 1;
    leader.data.incomeRoundsRemaining = remaining.filter(value => value !== round);
  },
};
