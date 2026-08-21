import assert from 'node:assert/strict';
import test from 'node:test';
import { assignTempleArrival, emptyTempleArrivalState, templeArrivalPoints } from './temple-arrivals.ts';
import type { ResearchTrackDefinition } from './types.ts';

const track: ResearchTrackDefinition = {
  id: 'bird',
  name: 'Bird',
  rows: [],
  templePoints: [23, 21, 20, 19],
};

test('Lost Temple arrival order awards 23/21/20/19 points', () => {
  let state = emptyTempleArrivalState();
  for (const playerId of ['p1', 'p2', 'p3', 'p4']) {
    state = assignTempleArrival(state, track, playerId);
  }

  assert.deepEqual(state.arrivals, ['p1', 'p2', 'p3', 'p4']);
  assert.equal(templeArrivalPoints(state, 'p1'), 23);
  assert.equal(templeArrivalPoints(state, 'p2'), 21);
  assert.equal(templeArrivalPoints(state, 'p3'), 20);
  assert.equal(templeArrivalPoints(state, 'p4'), 19);
});

test('Lost Temple arrival state rejects duplicate and over-capacity arrivals', () => {
  let state = assignTempleArrival(emptyTempleArrivalState(), track, 'p1');
  assert.throws(() => assignTempleArrival(state, track, 'p1'), /already reached/);

  state = assignTempleArrival(state, track, 'p2');
  state = assignTempleArrival(state, track, 'p3');
  state = assignTempleArrival(state, track, 'p4');
  assert.throws(() => assignTempleArrival(state, track, 'p5'), /No Lost Temple arrival space/);
});
