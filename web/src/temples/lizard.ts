import type { TempleRules } from './types.ts';

export const lizardTempleRules: TempleRules = {
  id: 'lizard',
  validateMove({ state, to }) {
    const blockers = state.research.templeData?.lizardBlockers;
    if (Array.isArray(blockers) && blockers.includes(to)) {
      throw new Error(`Research path is blocked at ${to}`);
    }
  },
};
