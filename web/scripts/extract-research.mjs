import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '../..');
const sourcePath = join(repoRoot, 'src/ResearchTrackData.ttslua');
const outputPath = join(repoRoot, 'web/src/generated/research-tracks.json');
const lua = await readFile(sourcePath, 'utf8');

function sectionBetween(startMarker, endMarker) {
  const start = lua.indexOf(startMarker);
  const end = lua.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`Could not locate ${startMarker} section`);
  return lua.slice(start, end);
}

function extractTrack(name, section) {
  const rows = [];
  const rowPattern = /\{\s*z\s*=\s*[^,]+,\s*magnifying\s*=\s*(\d+),\s*journal\s*=\s*(\d+),([\s\S]*?)paths\s*=/g;
  for (const match of section.matchAll(rowPattern)) {
    rows.push({
      magnifyingPoints: Number(match[1]),
      journalPoints: Number(match[2]),
      grantsAssistant: /assistant\s*=\s*true/.test(match[3]),
    });
  }
  if (rows.length !== 7) throw new Error(`${name} expected 7 scored research rows, got ${rows.length}`);

  const templePointsMatch = section.match(/templePoints\s*=\s*\{\s*([\d,\s]+)\}/);
  if (!templePointsMatch) throw new Error(`${name} missing templePoints`);
  const templePoints = templePointsMatch[1].split(',').map(value => Number(value.trim())).filter(Number.isFinite);

  return {
    id: name.toLowerCase(),
    name,
    // TTS data lists rows from the temple downward. Web state uses start -> temple order.
    rows: rows.reverse(),
    templePoints,
  };
}

const result = {
  bird: extractTrack('Bird', sectionBetween('-- Bird Temple', '-- Snake Temple')),
  snake: extractTrack('Snake', sectionBetween('-- Snake Temple', '-- Monkey Temple')),
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(`Extracted ${Object.keys(result).length} base research tracks to ${outputPath}`);
