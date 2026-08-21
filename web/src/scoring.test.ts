import assert from 'node:assert/strict';
import test from 'node:test';
import { GUARDIAN_POINTS, guardianScore } from './scoring.ts';

test('each defeated guardian is worth five points', () => {
  assert.equal(GUARDIAN_POINTS, 5);
  assert.equal(guardianScore({ defeatedGuardians: [] }), 0);
  assert.equal(guardianScore({ defeatedGuardians: ['g1'] }), 5);
  assert.equal(guardianScore({ defeatedGuardians: ['g1', 'g2', 'g3'] }), 15);
});
