import test from 'node:test';
import assert from 'node:assert/strict';
import { applyResearchRewardManualData } from './research-rewards-manual.ts';
import type { ResearchTrackDefinition } from './types.ts';

const track: ResearchTrackDefinition = {
  id: 'bird', name: 'Bird', rows: [{ magnifyingPoints: 1, journalPoints: 0, grantsAssistant: false, nodes: [
    { id: 'bird:r0:p0', rowIndex: 0, pathIndex: 0, researchLevel: 0 },
    { id: 'bird:r0:p1', rowIndex: 0, pathIndex: 1, researchLevel: 0 },
  ] }],
};

test('empty unverified row reward template does not create runtime reward', () => {
  const result = applyResearchRewardManualData(track, {
    $schemaVersion: 2,
    boards: { bird: { rewards: [
      { row: 'bird:r0', token: 'magnifying', rewards: [], verified: false },
    ] } },
  });
  assert.equal(result.rows[0].nodes?.[0].rewards, undefined);
  assert.equal(result.rows[0].nodes?.[1].rewards, undefined);
});

test('verified row reward is attached to every node in the row for that token', () => {
  const result = applyResearchRewardManualData(track, {
    $schemaVersion: 2,
    boards: { bird: { rewards: [
      { row: 'bird:r0', token: 'magnifying', rewards: [{ type: 'GAIN_RESOURCE', resource: 'coin', amount: 1 }], verified: true },
    ] } },
  });
  for (const node of result.rows[0].nodes ?? []) {
    assert.deepEqual(node.rewards, [{
      token: 'magnifying', rewards: [{ type: 'GAIN_RESOURCE', resource: 'coin', amount: 1 }], verified: true,
    }]);
  }
});

test('node reward overrides a row reward for the same token', () => {
  const result = applyResearchRewardManualData(track, {
    $schemaVersion: 2,
    boards: { bird: { rewards: [
      { row: 'bird:r0', token: 'magnifying', rewards: [{ type: 'GAIN_RESOURCE', resource: 'coin', amount: 1 }], verified: true },
      { node: 'bird:r0:p1', token: 'magnifying', rewards: [{ type: 'GAIN_RESOURCE', resource: 'jewel', amount: 1 }], verified: true },
    ] } },
  });
  assert.equal((result.rows[0].nodes?.[0].rewards?.[0].rewards[0] as any).resource, 'coin');
  assert.equal((result.rows[0].nodes?.[1].rewards?.[0].rewards[0] as any).resource, 'jewel');
});

test('reward entry must target exactly one of row or node', () => {
  assert.throws(() => applyResearchRewardManualData(track, {
    $schemaVersion: 2,
    boards: { bird: { rewards: [
      { row: 'bird:r0', node: 'bird:r0:p0', token: 'journal', rewards: [], verified: true },
    ] } },
  }), /exactly one of row or node/);
});
