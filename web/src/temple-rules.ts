import type {
  GameState,
  PlayerId,
  ResearchBridgeDefinition,
  ResearchNodeId,
  ResearchToken,
  ResearchTrackDefinition,
} from './types.ts';

export interface TempleMoveContext {
  state: GameState;
  track: ResearchTrackDefinition;
  playerId: PlayerId;
  token: ResearchToken;
  from: ResearchNodeId;
  to: ResearchNodeId;
  bridge: ResearchBridgeDefinition;
}

export interface TempleRules {
  id: string;
  validateMove?(context: TempleMoveContext): void;
  beforeMove?(context: TempleMoveContext): void;
  afterMove?(context: TempleMoveContext): void;
}

const baseRules: TempleRules = { id: 'base' };

const monkeyRules: TempleRules = {
  id: 'monkey',
  validateMove({ token, bridge }) {
    if (bridge.allowedTokens && !bridge.allowedTokens.includes(token)) {
      throw new Error(`${token} cannot use research bridge ${bridge.id}`);
    }
  },
};

const lizardRules: TempleRules = {
  id: 'lizard',
  validateMove({ state, to }) {
    const blockers = state.research.templeData?.lizardBlockers;
    if (Array.isArray(blockers) && blockers.includes(to)) {
      throw new Error(`Research path is blocked at ${to}`);
    }
  },
};

const registry: Record<string, TempleRules> = {
  bird: baseRules,
  snake: baseRules,
  monkey: monkeyRules,
  lizard: lizardRules,
};

export function templeRulesFor(boardId: string): TempleRules {
  return registry[boardId] ?? baseRules;
}
