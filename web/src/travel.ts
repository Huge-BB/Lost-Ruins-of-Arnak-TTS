import type { CardId, EngineContext, TravelCost, TravelIcon } from './types.ts';

const ICONS: TravelIcon[] = ['boot', 'car', 'boat', 'plane'];

function totalTravel(cardIds: CardId[], context: EngineContext): Record<TravelIcon, number> {
  const total = { boot: 0, car: 0, boat: 0, plane: 0 };
  for (const cardId of cardIds) {
    const card = context.cards[cardId];
    if (!card) throw new Error(`Unknown travel card: ${cardId}`);
    for (const icon of ICONS) total[icon] += card.travel?.[icon] ?? 0;
  }
  return total;
}

export function canPayTravel(cost: TravelCost = {}, cardIds: CardId[], context: EngineContext): boolean {
  const available = totalTravel(cardIds, context);

  const planeNeed = cost.plane ?? 0;
  if (available.plane < planeNeed) return false;
  available.plane -= planeNeed;

  const carNeed = cost.car ?? 0;
  const carUse = Math.min(available.car, carNeed);
  available.car -= carUse;
  let remainingCar = carNeed - carUse;
  if (available.plane < remainingCar) return false;
  available.plane -= remainingCar;

  const boatNeed = cost.boat ?? 0;
  const boatUse = Math.min(available.boat, boatNeed);
  available.boat -= boatUse;
  let remainingBoat = boatNeed - boatUse;
  if (available.plane < remainingBoat) return false;
  available.plane -= remainingBoat;

  let bootNeed = cost.boot ?? 0;
  const bootUse = Math.min(available.boot, bootNeed);
  available.boot -= bootUse;
  bootNeed -= bootUse;

  const groundUse = Math.min(available.car + available.boat, bootNeed);
  bootNeed -= groundUse;
  if (bootNeed > available.plane) return false;

  return true;
}

export function hasTravelCost(cost: TravelCost = {}): boolean {
  return ICONS.some(icon => (cost[icon] ?? 0) > 0);
}
