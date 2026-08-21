import { baseTempleRules } from './temples/base.ts';
import { lizardTempleRules } from './temples/lizard.ts';
import { monkeyTempleRules } from './temples/monkey.ts';
import type { TempleRules } from './temples/types.ts';

export type { TempleMoveContext, TempleRules } from './temples/types.ts';

const registry: Record<string, TempleRules> = {
  bird: baseTempleRules,
  snake: baseTempleRules,
  monkey: monkeyTempleRules,
  lizard: lizardTempleRules,
};

export function templeRulesFor(boardId: string): TempleRules {
  return registry[boardId] ?? baseTempleRules;
}
