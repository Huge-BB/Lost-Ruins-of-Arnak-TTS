import { activeLizardBlockerNodes } from './lizard-state.ts';
import type { TempleRules } from './types.ts';

export const lizardTempleRules: TempleRules = {
  id: 'lizard',
  validateMove({ state, to }) {
    if (activeLizardBlockerNodes(state).includes(to)) {
      throw new Error(`Research path is blocked at ${to}`);
    }
  },
};
