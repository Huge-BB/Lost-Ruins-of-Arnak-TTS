import { shuffleWithSeed } from './rng.ts';
import type { AssistantDefinition, AssistantSupplyState, ResearchBoardId } from './types.ts';

export function buildBaseAssistantPool(assistants: Record<string, AssistantDefinition>): string[] {
  const ids = Object.values(assistants)
    .filter(assistant => assistant.expansion === 'Base Game')
    .map(assistant => assistant.id)
    .sort();
  if (ids.length !== 12) throw new Error(`Expected 12 base-game assistants, found ${ids.length}`);
  return ids;
}

export function prepareAssistantSupply(
  assistants: Record<string, AssistantDefinition>,
  board: ResearchBoardId,
  playerCount: number,
  seed: string,
): AssistantSupplyState {
  if (!Number.isInteger(playerCount) || playerCount < 1 || playerCount > 4) {
    throw new Error('Arnak supports 1-4 players');
  }

  const shuffled = shuffleWithSeed(buildBaseAssistantPool(assistants), `${seed}:assistants`);

  if (board === 'bird') {
    return {
      stacks: [shuffled.slice(0, 4), shuffled.slice(4, 8), shuffled.slice(8, 12)],
      specialStack: [],
    };
  }

  // The Snake board removes one assistant per player into its special area before
  // the normal supply stacks are formed. Exact remainder distribution stays
  // intentionally unimplemented until TTS Deck.cut behavior is mirrored.
  return {
    stacks: [],
    specialStack: shuffled.slice(0, playerCount),
  };
}

export function availableAssistantIds(supply: AssistantSupplyState): string[] {
  return supply.stacks.flatMap(stack => stack.length > 0 ? [stack[0]] : []);
}
