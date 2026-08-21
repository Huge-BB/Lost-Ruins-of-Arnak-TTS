import type { PlayerId, ResearchTrackDefinition } from './types.ts';

export interface TempleArrivalState {
  arrivals: PlayerId[];
  points: Record<PlayerId, number>;
}

export function emptyTempleArrivalState(): TempleArrivalState {
  return { arrivals: [], points: {} };
}

export function assignTempleArrival(
  state: TempleArrivalState,
  track: ResearchTrackDefinition,
  playerId: PlayerId,
): TempleArrivalState {
  if (state.arrivals.includes(playerId)) {
    throw new Error(`${playerId} has already reached the Lost Temple`);
  }

  const points = track.templePoints[state.arrivals.length];
  if (points === undefined) {
    throw new Error('No Lost Temple arrival space remains');
  }

  return {
    arrivals: [...state.arrivals, playerId],
    points: { ...state.points, [playerId]: points },
  };
}

export function templeArrivalPoints(state: TempleArrivalState, playerId: PlayerId): number {
  return state.points[playerId] ?? 0;
}
