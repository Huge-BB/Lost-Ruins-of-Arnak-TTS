import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const generated = JSON.parse(await readFile(resolve(root, 'src/generated/research-tracks.json'), 'utf8'));
const manual = JSON.parse(await readFile(resolve(root, 'data/research-manual-data.json'), 'utf8'));

const costKeys = new Set(['coin', 'compass', 'tablet', 'arrowhead', 'jewel', 'usableIdol']);

function allNodes(track) { return track.rows.flatMap(row => row.nodes ?? []); }
function validateCost(cost, label) {
  for (const [key, value] of Object.entries(cost ?? {})) {
    if (!costKeys.has(key)) throw new Error(`${label}: unsupported cost key ${key}`);
    if (!Number.isInteger(value) || value < 0) throw new Error(`${label}: invalid ${key} cost`);
  }
}

function validateReward(reward, label) {
  if (reward == null) return;
  if (typeof reward !== 'object' || typeof reward.type !== 'string') throw new Error(`${label}: reward must have a string type`);
  if (reward.type === 'CLAIM_ASSISTANT' && reward.level !== 'silver') throw new Error(`${label}: CLAIM_ASSISTANT level must be silver`);
  if (reward.type === 'UPGRADE_ASSISTANT' && reward.level !== 'gold') throw new Error(`${label}: UPGRADE_ASSISTANT level must be gold`);
  if (reward.type === 'GAIN_RESOURCE') {
    if (!['coin', 'compass', 'tablet', 'arrowhead', 'jewel', 'fear'].includes(reward.resource)) throw new Error(`${label}: unsupported GAIN_RESOURCE resource`);
    if (!Number.isInteger(reward.amount) || reward.amount < 0) throw new Error(`${label}: invalid GAIN_RESOURCE amount`);
  }
}

let verifiedBridgeCount = 0;
let totalBridgeCount = 0;
for (const boardId of ['bird', 'snake']) {
  const track = generated[boardId];
  const overlay = manual.boards?.[boardId] ?? { bridges: [], nodeOverrides: [], nodeRewards: [] };
  if (!track) throw new Error(`Missing generated research track: ${boardId}`);
  if (overlay.templeArrivalPoints !== undefined) {
    if (!Array.isArray(overlay.templeArrivalPoints) || overlay.templeArrivalPoints.length !== 4 || overlay.templeArrivalPoints.some(value => !Number.isInteger(value) || value < 0)) {
      throw new Error(`${boardId}: templeArrivalPoints must contain four non-negative integers`);
    }
  }
  const nodeIds = new Set(allNodes(track).map(node => node.id));
  const bridgeIds = new Set((track.bridges ?? []).map(bridge => `${bridge.from}->${bridge.to}`));
  totalBridgeCount += bridgeIds.size;
  const templeNode = `${boardId}:temple`;
  const seenBridges = new Set();
  for (const bridge of overlay.bridges ?? []) {
    const id = `${bridge.from}->${bridge.to}`;
    if (seenBridges.has(id)) throw new Error(`${boardId}: duplicate manual bridge ${id}`);
    seenBridges.add(id);
    const isTempleEntry = bridge.to === templeNode && nodeIds.has(bridge.from);
    if (!bridgeIds.has(id) && !isTempleEntry) throw new Error(`${boardId}: manual bridge not found in generated topology: ${id}`);
    if (isTempleEntry && !bridgeIds.has(id)) totalBridgeCount += 1;
    validateCost(bridge.cost, `${boardId}:${id}`);
    validateReward(bridge.reward, `${boardId}:${id}`);
    if (bridge.verified === true) verifiedBridgeCount += 1;
  }
  const seenOverrides = new Set();
  for (const override of overlay.nodeOverrides ?? []) {
    if (seenOverrides.has(override.node)) throw new Error(`${boardId}: duplicate node override ${override.node}`);
    seenOverrides.add(override.node);
    if (!nodeIds.has(override.node)) throw new Error(`${boardId}: unknown node override ${override.node}`);
    if (override.researchLevel !== undefined && (!Number.isInteger(override.researchLevel) || override.researchLevel < 0)) throw new Error(`${boardId}:${override.node}: invalid researchLevel`);
    if (override.spansLevels !== undefined) {
      if (!Array.isArray(override.spansLevels) || override.spansLevels.length === 0) throw new Error(`${boardId}:${override.node}: spansLevels must be a non-empty array`);
      for (const level of override.spansLevels) if (!Number.isInteger(level) || level < 0) throw new Error(`${boardId}:${override.node}: invalid spansLevels entry`);
    }
  }
  const seenRewards = new Set();
  for (const reward of overlay.nodeRewards ?? []) {
    if (!nodeIds.has(reward.node)) throw new Error(`${boardId}: unknown reward node ${reward.node}`);
    const id = `${reward.node}:${reward.token ?? 'any'}`;
    if (seenRewards.has(id)) throw new Error(`${boardId}: duplicate node reward ${id}`);
    seenRewards.add(id);
    if (reward.token !== undefined && !['magnifying', 'journal'].includes(reward.token)) throw new Error(`${boardId}:${id}: invalid research token`);
    validateReward(reward.reward, `${boardId}:${id}`);
  }
}
console.log(`Research manual data valid: ${verifiedBridgeCount}/${totalBridgeCount} bridges verified.`);
