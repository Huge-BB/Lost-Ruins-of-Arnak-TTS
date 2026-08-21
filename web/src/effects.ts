import type { CardEffect, CardId, EngineContext, GameState, PlayerId, Resource } from './types.ts';

function gainResource(state: GameState, playerId: PlayerId, resource: Resource, amount: number) {
  if (!Number.isInteger(amount) || amount < 0) throw new Error('Effect amount must be a non-negative integer');
  state.players[playerId].resources[resource] += amount;
}

function drawCards(state: GameState, playerId: PlayerId, amount: number) {
  if (!Number.isInteger(amount) || amount < 0) throw new Error('Draw amount must be a non-negative integer');
  const player = state.players[playerId];
  for (let i = 0; i < amount; i += 1) {
    const card = player.deck.shift();
    if (!card) break;
    player.hand.push(card);
  }
}

export function inferBaseStarterEffects(cardId: CardId, context: EngineContext): CardEffect[] {
  const card = context.cards[cardId];
  if (!card || card.expansion !== 'Base Game' || card.type !== 'Starter') return [];
  if (card.name === 'Funding') return [{ type: 'GAIN_RESOURCE', resource: 'coin', amount: 1 }];
  if (card.name === 'Exploration') return [{ type: 'GAIN_RESOURCE', resource: 'compass', amount: 1 }];
  return [];
}

export function getCardEffects(cardId: CardId, context: EngineContext): CardEffect[] {
  return context.cardEffects?.[cardId] ?? inferBaseStarterEffects(cardId, context);
}

export function applyCardEffects(state: GameState, playerId: PlayerId, effects: CardEffect[]) {
  for (const effect of effects) {
    switch (effect.type) {
      case 'GAIN_RESOURCE':
        gainResource(state, playerId, effect.resource, effect.amount);
        break;
      case 'DRAW_CARD':
        drawCards(state, playerId, effect.amount);
        break;
    }
  }
}
