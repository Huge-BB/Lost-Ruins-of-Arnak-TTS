import type { CardDefinition, CardId, EngineContext } from './types.ts';

export interface BaseGameCardPools {
  items: CardId[];
  artifacts: CardId[];
  startersByColor: Record<string, CardId[]>;
  fear: CardId[];
}

export function buildBaseGameCardPools(context: EngineContext): BaseGameCardPools {
  const items: CardId[] = [];
  const artifacts: CardId[] = [];
  const startersByColor: Record<string, CardId[]> = {};
  const fear: CardId[] = [];

  for (const card of Object.values(context.cards)) {
    if (card.expansion !== 'Base Game') continue;

    switch (card.type) {
      case 'Item':
        items.push(card.id);
        break;
      case 'Artifact':
        artifacts.push(card.id);
        break;
      case 'Fear':
        fear.push(card.id);
        break;
      case 'Starter': {
        if (!card.color) throw new Error(`Base-game starter ${card.id} is missing color metadata`);
        (startersByColor[card.color] ??= []).push(card.id);
        break;
      }
    }
  }

  items.sort();
  artifacts.sort();
  fear.sort();
  for (const cards of Object.values(startersByColor)) cards.sort();

  return { items, artifacts, startersByColor, fear };
}

export function validateBaseGameCardPools(pools: BaseGameCardPools) {
  if (pools.items.length === 0) throw new Error('No base-game item cards found');
  if (pools.artifacts.length === 0) throw new Error('No base-game artifact cards found');
  if (pools.fear.length === 0) throw new Error('No base-game fear card found');

  for (const color of ['Yellow', 'Green', 'Blue', 'Red']) {
    const starters = pools.startersByColor[color] ?? [];
    if (starters.length !== 4) {
      throw new Error(`Expected 4 base-game starter cards for ${color}, found ${starters.length}`);
    }
  }
}

export function cardRecord(cards: CardDefinition[]): EngineContext['cards'] {
  return Object.fromEntries(cards.map(card => [card.id, card]));
}
