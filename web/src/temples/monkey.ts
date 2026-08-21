import type { TempleRules } from './types.ts';

export const monkeyTempleRules: TempleRules = {
  id: 'monkey',
  validateMove({ token, bridge }) {
    if (bridge.allowedTokens && !bridge.allowedTokens.includes(token)) {
      throw new Error(`${token} cannot use research bridge ${bridge.id}`);
    }
  },
};
