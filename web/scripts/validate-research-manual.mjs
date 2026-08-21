import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const generated = JSON.parse(await readFile(resolve(root, 'src/generated/research-tracks.json'), 'utf8'));
const manual = JSON.parse(await readFile(resolve(root, 'data/research-manual-data.json'), 'utf8'));
const costKeys = new Set(['coin', 'compass', 'tablet', 'arrowhead', 'jewel', 'usableIdol', 'travel']);
const travelKeys = new Set(['boot', 'car', 'boat', 'plane']);
const resources = new Set(['coin', 'compass', 'tablet', 'arrowhead', 'jewel', 'fear']);
const boardIds = ['bird', 'snake', 'monkey', 'lizard'];

function allNodes(track) { return track.rows.flatMap(row => row.nodes ?? []); }
function validateTravel(travel, label) {
  if (!travel || typeof travel !== 'object' || Array.isArray(travel)) throw new Error(`${label}: travel cost must be an object`);
  for (const [key, value] of Object.entries(travel)) {
    if (!travelKeys.has(key)) throw new Error(`${label}: unsupported travel key ${key}`);
    if (!Number.isInteger(value) || value < 0) throw new Error(`${label}: invalid ${key} travel cost`);
  }
}
function validateCost(cost, label) {
  for (const [key, value] of Object.entries(cost ?? {})) {
    if (!costKeys.has(key)) throw new Error(`${label}: unsupported cost key ${key}`);
    if (key === 'travel') validateTravel(value, `${label}.travel`);
    else if (!Number.isInteger(value) || value < 0) throw new Error(`${label}: invalid ${key} cost`);
  }
}
function validateReward(reward, label) {
  if (!reward || typeof reward !== 'object' || typeof reward.type !== 'string') throw new Error(`${label}: reward must have a string type`);
  if (reward.type === 'GAIN_RESOURCE') {
    if (!resources.has(reward.resource)) throw new Error(`${label}: unsupported GAIN_RESOURCE resource`);
    if (!Number.isInteger(reward.amount) || reward.amount < 0) throw new Error(`${label}: invalid GAIN_RESOURCE amount`);
  } else if (reward.type === 'DRAW_CARD' || reward.type === 'GAIN_FEAR_CARD') {
    if (!Number.isInteger(reward.amount) || reward.amount < 0) throw new Error(`${label}: invalid ${reward.type} amount`);
  } else if (reward.type === 'REFRESH_ASSISTANTS') {
    if (reward.amount !== 'all' && (!Number.isInteger(reward.amount) || reward.amount < 0)) throw new Error(`${label}: invalid REFRESH_ASSISTANTS amount`);
  } else if (reward.type === 'CLAIM_ASSISTANT') {
    if (reward.level !== 'silver') throw new Error(`${label}: CLAIM_ASSISTANT level must be silver`);
  } else if (reward.type === 'UPGRADE_ASSISTANT') {
    if (reward.level !== 'gold') throw new Error(`${label}: UPGRADE_ASSISTANT level must be gold`);
  } else if (reward.type === 'BONUS_TILE' || reward.type === 'ACQUIRE_ARTIFACT_FREE'
    || reward.type === 'ACTIVATE_DISCOVERED_LEVEL1_SITE'
    || reward.type === 'ACTIVATE_VISIBLE_SILVER_ASSISTANT_THEN_BOTTOM') {
    // Structured choice/marker effects are resolved by their temple/action handler.
  } else if (reward.type === 'SEQUENCE') {
    if (!Array.isArray(reward.rewards) || reward.rewards.length === 0) throw new Error(`${label}: SEQUENCE rewards must be non-empty`);
    reward.rewards.forEach((child, index) => validateReward(child, `${label}.rewards[${index}]`));
  } else if (reward.type === 'CHOOSE') {
    if (!Number.isInteger(reward.count) || reward.count <= 0) throw new Error(`${label}: CHOOSE count must be a positive integer`);
    if (!Array.isArray(reward.options) || reward.options.length < reward.count) throw new Error(`${label}: CHOOSE options must cover count`);
    reward.options.forEach((child, index) => validateReward(child, `${label}.options[${index}]`));
  }
}
function validateRewards(rewards, label) {
  if (rewards === undefined) return;
  if (!Array.isArray(rewards)) throw new Error(`${label}: rewards must be an array`);
  rewards.forEach((reward, index) => validateReward(reward, `${label}[${index}]`));
}

let verifiedBridgeCount = 0;
let totalBridgeCount = 0;
for (const boardId of boardIds) {
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
    validateRewards(bridge.rewards, `${boardId}:${id}.rewards`);
    if (bridge.allowedTokens !== undefined) {
      if (!Array.isArray(bridge.allowedTokens) || bridge.allowedTokens.length === 0 || bridge.allowedTokens.some(token => !['magnifying', 'journal'].includes(token))) {
        throw new Error(`${boardId}:${id}: invalid allowedTokens`);
      }
    }
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
  for (const entry of overlay.nodeRewards ?? []) {
    if (!nodeIds.has(entry.node)) throw new Error(`${boardId}: unknown reward node ${entry.node}`);
    const id = `${entry.node}:${entry.token ?? 'any'}`;
    if (seenRewards.has(id)) throw new Error(`${boardId}: duplicate node reward ${id}`);
    seenRewards.add(id);
    if (entry.token !== undefined && !['magnifying', 'journal'].includes(entry.token)) throw new Error(`${boardId}:${id}: invalid research token`);
    validateRewards(entry.rewards, `${boardId}:${id}.rewards`);
  }
}
console.log(`Research manual data valid: ${verifiedBridgeCount}/${totalBridgeCount} bridges verified across ${boardIds.length} temples.`);
