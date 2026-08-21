import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '../..');
const sourcePath = join(repoRoot, 'src/ResearchTrackData.ttslua');
const outputPath = join(repoRoot, 'web/src/generated/research-tracks.json');
const checklistPath = join(repoRoot, 'web/data/research-bridges.generated.json');
const lua = await readFile(sourcePath, 'utf8');

function sectionBetween(startMarker, endMarker) {
  const start = lua.indexOf(startMarker);
  const end = lua.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`Could not locate ${startMarker} section`);
  return lua.slice(start, end);
}

function extractBalancedBlock(text, startIndex) {
  const open = text.indexOf('{', startIndex);
  if (open < 0) throw new Error('Expected opening brace');
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === '{') depth += 1;
    if (text[i] === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(open, i + 1);
    }
  }
  throw new Error('Unbalanced Lua table');
}

function extractRowsBlock(section) {
  const marker = section.indexOf('rows =');
  if (marker < 0) throw new Error('Missing rows table');
  return extractBalancedBlock(section, marker);
}

function splitTopLevelTables(block) {
  const result = [];
  let depth = 0;
  let start = -1;
  for (let i = 1; i < block.length - 1; i += 1) {
    const ch = block[i];
    if (ch === '{') {
      if (depth === 0) start = i;
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        result.push(block.slice(start, i + 1));
        start = -1;
      }
    }
  }
  return result;
}

function extractPathForwards(rowBlock) {
  const marker = rowBlock.indexOf('paths =');
  if (marker < 0) return [];
  const pathsBlock = extractBalancedBlock(rowBlock, marker);
  return splitTopLevelTables(pathsBlock).map((pathBlock) => {
    const match = pathBlock.match(/forward\s*=\s*\{\s*([\d,\s]+)\}/);
    if (!match) return [];
    return match[1]
      .split(',')
      .map(value => Number(value.trim()))
      .filter(Number.isFinite)
      .map(oneBased => oneBased - 1);
  });
}

function nodeId(boardId, rowIndex, pathIndex) {
  return `${boardId}:r${rowIndex}:p${pathIndex}`;
}

function extractTrack(name, section) {
  const boardId = name.toLowerCase();
  const rawRows = splitTopLevelTables(extractRowsBlock(section));
  const scoredRows = rawRows.filter(row => /magnifying\s*=/.test(row));
  if (scoredRows.length !== 7) throw new Error(`${name} expected 7 scored research rows, got ${scoredRows.length}`);

  const rowsTopDown = scoredRows.map((rowBlock) => {
    const magnifyingMatch = rowBlock.match(/magnifying\s*=\s*(\d+)/);
    const journalMatch = rowBlock.match(/journal\s*=\s*(\d+)/);
    if (!magnifyingMatch || !journalMatch) throw new Error(`${name} row missing score data`);
    const forwards = extractPathForwards(rowBlock);
    return {
      magnifyingPoints: Number(magnifyingMatch[1]),
      journalPoints: Number(journalMatch[1]),
      grantsAssistant: /assistant\s*=\s*true/.test(rowBlock),
      pathCount: forwards.length,
      forwards,
    };
  });

  // TTS lists rows temple -> start. Web data uses start -> temple.
  // Keep rowsTopDown untouched because its original order is needed to map TTS forward edges.
  // researchLevel defaults to the scored row index, but may be overridden by manual data
  // for printed spaces that visually span or skip levels.
  const rows = [...rowsTopDown].reverse().map((row, rowIndex) => ({
    magnifyingPoints: row.magnifyingPoints,
    journalPoints: row.journalPoints,
    grantsAssistant: row.grantsAssistant,
    nodes: Array.from({ length: row.pathCount }, (_, pathIndex) => ({
      id: nodeId(boardId, rowIndex, pathIndex),
      rowIndex,
      pathIndex,
      researchLevel: rowIndex,
    })),
  }));

  // forward indexes in TTS point from a row toward the next row closer to the temple.
  const bridges = [];
  for (let rowIndex = 0; rowIndex < rows.length - 1; rowIndex += 1) {
    const originalSource = rowsTopDown[rowsTopDown.length - 1 - rowIndex];
    originalSource.forwards.forEach((targets, pathIndex) => {
      for (const targetPathIndex of targets) {
        bridges.push({
          id: `${nodeId(boardId, rowIndex, pathIndex)}->${nodeId(boardId, rowIndex + 1, targetPathIndex)}`,
          from: nodeId(boardId, rowIndex, pathIndex),
          to: nodeId(boardId, rowIndex + 1, targetPathIndex),
        });
      }
    });
  }

  // The start area is not a scored TTS row. Treat all bottom-row paths as legal first destinations.
  for (let pathIndex = 0; pathIndex < rows[0].nodes.length; pathIndex += 1) {
    bridges.unshift({
      id: `${boardId}:start->${nodeId(boardId, 0, pathIndex)}`,
      from: `${boardId}:start`,
      to: nodeId(boardId, 0, pathIndex),
    });
  }

  const templePointsMatch = section.match(/templePoints\s*=\s*\{\s*([\d,\s]+)\}/);
  if (!templePointsMatch) throw new Error(`${name} missing templePoints`);
  const templePoints = templePointsMatch[1].split(',').map(value => Number(value.trim())).filter(Number.isFinite);

  return { id: boardId, name, rows, bridges, templePoints };
}

const result = {
  bird: extractTrack('Bird', sectionBetween('-- Bird Temple', '-- Snake Temple')),
  snake: extractTrack('Snake', sectionBetween('-- Snake Temple', '-- Monkey Temple')),
};

const checklist = {
  $schemaVersion: 2,
  notes: [
    'Generated from ResearchTrackData.ttslua. Do not edit topology here by hand.',
    'Copy verified costs/rewards and any irregular node-level overrides into research-manual-data.json.',
    'researchLevel defaults to rowIndex. Override only when one printed space spans/skips logical levels.',
  ],
  boards: Object.fromEntries(Object.entries(result).map(([boardId, track]) => [boardId, {
    nodes: track.rows.flatMap(row => row.nodes).map(node => ({ ...node, verified: false })),
    bridges: track.bridges.map(bridge => ({
      ...bridge,
      cost: { coin: 0, compass: 0, tablet: 0, arrowhead: 0, jewel: 0 },
      reward: null,
      verified: false,
    })),
  }])),
};

await mkdir(dirname(outputPath), { recursive: true });
await mkdir(dirname(checklistPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);
await writeFile(checklistPath, `${JSON.stringify(checklist, null, 2)}\n`);
console.log(`Extracted ${Object.keys(result).length} base research tracks to ${outputPath}`);
console.log(`Generated research bridge checklist at ${checklistPath}`);
