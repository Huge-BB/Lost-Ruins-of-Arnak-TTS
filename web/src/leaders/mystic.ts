import { setLeaderState } from './utils.ts';
import type { LeaderRules } from './types.ts';

export const mysticLeader: LeaderRules = {
  id: 'mystic',
  name: 'Mystic',
  expansion: 'Expedition Leaders',
  startingCardNames: ['Divine Guidance', 'Meditation', 'Worldly Goods', 'Blindsight'],
  setup({ state, playerId }) {
    setLeaderState(state, playerId, 'mystic', {
      ritualPile: [],
      idolSlotCount: 5,
    });
  },
  onRoundStart({ state, playerId, context }) {
    const fear = Object.values(context.cards).find(card => card.type === 'Fear' && card.expansion === 'Base Game');
    if (fear) state.players[playerId].hand.push(fear.id);
  },
};
