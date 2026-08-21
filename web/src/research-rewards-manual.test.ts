import test from 'node:test';
import assert from 'node:assert/strict';
import { applyResearchRewardManualData } from './research-rewards-manual.ts';
import type { ResearchTrackDefinition } from './types.ts';

const track: ResearchTrackDefinition = {
  id: 'bird', name: 'Bird', rows: [{ magnifyingPoints: 1, journalPoints: 0, grantsAssistant: false, nodes: [
    { id: 'bird:r0:p0', rowIndex: 0, pathIndex: 0, researchLevel: 0 },
  ] }],
};

test('empty unverified reward template does not create runtime reward', () => {
  const result = applyResearchRewardManualData(track, {
    $schemaVersion: 1,
    boards: { bird: { nodeRewards: [
      { node: 'bird:r0:p0', token: 'magnifying', rewards: [], verified: false },
    ] } },
  });
  assert.equal(result.rows[0].nodes?.[0].rewards, undefined);
});

test('verified reward is attached to the exact node and token', () => {
  const result = applyResearchRewardManualData(track, {
    $schemaVersion: 1,
    boards: { bird: { nodeRewards: [
      { node: 'bird:r0:p0', token: 'magnifying', rewards: [{ type: 'GAIN_RESOURCE', resource: 'coin', amount: 1 }], verified: true },
    ] } },
  });
  assert.deepEqual(result.rows[0].nodes?.[0].rewards, [{
    token: 'magnifying', rewards: [{ type: 'GAIN_RESOURCE', resource: 'coin', amount: 1 }], verified: true,
  }]);
});
